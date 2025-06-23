import asyncio
import json
from pyrogram import Client, filters
from pyrogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton
import config
from utils.logger import Logger
from pathlib import Path

logger = Logger(f"{__name__}")

START_CMD = """🚀 **Welcome To TG Drive's Bot Mode**

You can use this bot to upload files to your TG Drive website directly instead of doing it from website.

🗄 **Commands:**
/set_folder - Set folder for file uploads
/current_folder - Check current folder
/create_folder - Create a new folder in current directory

📤 **How To Upload Files:** Send a file to this bot and it will be uploaded to your TG Drive website. You can also set a folder for file uploads using /set_folder command.

📁 **How To Create Folders:** Use /create_folder command to create new folders in your current directory.

Read more about [TG Drive's Bot Mode](https://github.com/TechShreyash/TGDrive#tg-drives-bot-mode)
"""

SET_FOLDER_PATH_CACHE = {}
DRIVE_DATA = None
BOT_MODE = None 

session_cache_path = Path(f"./cache")
session_cache_path.parent.mkdir(parents=True, exist_ok=True)

DEFAULT_FOLDER_CONFIG_FILE = Path("./default_folder_config.json")

main_bot = Client(
    name="main_bot",
    api_id=config.API_ID,
    api_hash=config.API_HASH,
    bot_token=config.MAIN_BOT_TOKEN,
    sleep_threshold=config.SLEEP_THRESHOLD,
    workdir=session_cache_path,
)

# --- Manual 'ask' implementation setup ---
# Stores {chat_id: (asyncio.Queue, asyncio.Event, pyrogram.filters)}
_pending_requests = {}

async def manual_ask(client: Client, chat_id: int, text: str, timeout: int = 60, filters=None) -> Message:
    """
    A manual implementation of the 'ask' functionality for older Pyrogram versions.
    Sends a message and waits for a response from the specified chat_id.
    """
    queue = asyncio.Queue(1)
    event = asyncio.Event()
    
    _pending_requests[chat_id] = (queue, event, filters)

    await client.send_message(chat_id, text)

    try:
        await asyncio.wait_for(event.wait(), timeout=timeout)
        response_message = await queue.get()
        return response_message
    except asyncio.TimeoutError:
        raise asyncio.TimeoutError # Re-raise if timed out
    finally:
        # Clean up the pending request regardless of outcome
        if chat_id in _pending_requests:
            del _pending_requests[chat_id]
# --- End Manual 'ask' implementation setup ---


# --- COMMAND HANDLERS (Prioritized) ---

@main_bot.on_message(
    filters.command(["start", "help"])
    & filters.private
    & filters.user(config.TELEGRAM_ADMIN_IDS),
)
async def start_handler(client: Client, message: Message):
    """
    Handles the /start and /help commands, sending the welcome message.
    """
    await message.reply_text(START_CMD)


@main_bot.on_message(
    filters.command("create_folder")
    & filters.private
    & filters.user(config.TELEGRAM_ADMIN_IDS),
)
async def create_folder_handler(client: Client, message: Message):
    """
    Handles the /create_folder command to create new folders.
    Supports /create_folder <folder_name> for direct creation,
    or falls back to interactive mode if no argument provided.
    """
    global BOT_MODE, DRIVE_DATA

    # Check if there's already a pending ask for this chat to prevent re-triggering
    if message.chat.id in _pending_requests:
        await message.reply_text("I'm already waiting for your input. Please provide the folder name or /cancel.")
        return 

    # Check if current folder is set
    if not BOT_MODE.current_folder:
        await message.reply_text(
            "❌ **Error:** No current folder set. Please use /set_folder to set a folder first before creating new folders."
        )
        return

    # Extract the argument from the command, if any
    command_args = message.command
    folder_name_from_command = None
    if len(command_args) > 1:
        folder_name_from_command = " ".join(command_args[1:]).strip()

    target_folder_name = None
    if folder_name_from_command:
        # If a folder name was provided in the command, try to create it directly
        logger.info(f"Attempting direct folder creation: '{folder_name_from_command}'")
        
        # Validate folder name
        if not is_valid_folder_name(folder_name_from_command):
            await message.reply_text(
                "❌ **Invalid folder name!**\n\n"
                "Folder names can only contain:\n"
                "• Letters (a-z, A-Z)\n"
                "• Numbers (0-9)\n"
                "• Spaces, hyphens (-), underscores (_)\n"
                "• Brackets [ ] ( )\n"
                "• Some special characters: @ # ! $ % * + = { } : ; < > , . ? / | \\ ~ `"
            )
            return

        # Check if folder already exists
        current_folder_data = DRIVE_DATA.get_directory(BOT_MODE.current_folder)
        for item in current_folder_data.contents.values():
            if item.type == "folder" and item.name.lower() == folder_name_from_command.lower():
                await message.reply_text(
                    f"❌ **Folder already exists!**\n\n"
                    f"A folder named '{folder_name_from_command}' already exists in the current directory.\n\n"
                    f"**Current folder:** {BOT_MODE.current_folder_name}"
                )
                return

        # Create the folder
        try:
            new_folder_path = DRIVE_DATA.new_folder(BOT_MODE.current_folder, folder_name_from_command)
            await message.reply_text(
                f"✅ **Folder created successfully!**\n\n"
                f"**Folder name:** {folder_name_from_command}\n"
                f"**Location:** {BOT_MODE.current_folder_name}\n"
                f"**Full path:** {new_folder_path}"
            )
            logger.info(f"Folder '{folder_name_from_command}' created successfully at {new_folder_path}")
            return
        except Exception as e:
            await message.reply_text(
                f"❌ **Error creating folder!**\n\n"
                f"Failed to create folder '{folder_name_from_command}': {str(e)}"
            )
            logger.error(f"Failed to create folder '{folder_name_from_command}': {e}")
            return

    # If no argument was provided, proceed with the interactive 'ask' process
    while True:
        try:
            folder_name_input_msg = await manual_ask(
                client=client,
                chat_id=message.chat.id,
                text=(
                    f"📁 **Create New Folder**\n\n"
                    f"**Current location:** {BOT_MODE.current_folder_name}\n\n"
                    f"Please send the name for the new folder:\n\n"
                    f"**Rules:**\n"
                    f"• Use only letters, numbers, spaces, and basic symbols\n"
                    f"• Avoid special characters like: < > : \" | ? * \\\n"
                    f"• Maximum 255 characters\n\n"
                    f"Send /cancel to cancel"
                ),
                timeout=60,
                filters=filters.text,
            )
        except asyncio.TimeoutError:
            await message.reply_text("⏰ **Timeout**\n\nFolder creation cancelled. Use /create_folder to try again.")
            return

        if folder_name_input_msg.text.lower() == "/cancel":
            await message.reply_text("❌ **Cancelled**\n\nFolder creation cancelled.")
            return

        target_folder_name = folder_name_input_msg.text.strip()
        
        # Validate folder name
        if not target_folder_name:
            await message.reply_text("❌ **Empty name!** Please provide a valid folder name or /cancel.")
            continue
            
        if not is_valid_folder_name(target_folder_name):
            await message.reply_text(
                "❌ **Invalid folder name!**\n\n"
                "Folder names can only contain:\n"
                "• Letters (a-z, A-Z)\n"
                "• Numbers (0-9)\n"
                "• Spaces, hyphens (-), underscores (_)\n"
                "• Brackets [ ] ( )\n"
                "• Some special characters: @ # ! $ % * + = { } : ; < > , . ? / | \\ ~ `\n\n"
                "Please try again or /cancel."
            )
            continue

        # Check if folder already exists
        current_folder_data = DRIVE_DATA.get_directory(BOT_MODE.current_folder)
        folder_exists = False
        for item in current_folder_data.contents.values():
            if item.type == "folder" and item.name.lower() == target_folder_name.lower():
                folder_exists = True
                break

        if folder_exists:
            await message.reply_text(
                f"❌ **Folder already exists!**\n\n"
                f"A folder named '{target_folder_name}' already exists in the current directory.\n"
                f"Please choose a different name or /cancel."
            )
            continue

        # Create the folder
        try:
            new_folder_path = DRIVE_DATA.new_folder(BOT_MODE.current_folder, target_folder_name)
            await message.reply_text(
                f"✅ **Folder created successfully!**\n\n"
                f"**Folder name:** {target_folder_name}\n"
                f"**Location:** {BOT_MODE.current_folder_name}\n"
                f"**Full path:** {new_folder_path}"
            )
            logger.info(f"Folder '{target_folder_name}' created successfully at {new_folder_path}")
            break
        except Exception as e:
            await message.reply_text(
                f"❌ **Error creating folder!**\n\n"
                f"Failed to create folder '{target_folder_name}': {str(e)}\n\n"
                f"Please try again or /cancel."
            )
            logger.error(f"Failed to create folder '{target_folder_name}': {e}")
            continue


def is_valid_folder_name(name):
    """
    Validate folder name according to common file system restrictions.
    """
    if not name or len(name) > 255:
        return False
    
    # Check for invalid characters (similar to the web interface validation)
    import re
    pattern = r'^[a-zA-Z0-9 \-_\\[\]()@#!$%*+={}:;<>,.?/|\\~`]*$'
    return bool(re.match(pattern, name))


@main_bot.on_message(
    filters.command("set_folder")
    & filters.private
    & filters.user(config.TELEGRAM_ADMIN_IDS),
)
async def set_folder_handler(client: Client, message: Message):
    """
    Handles the /set_folder command.
    Supports /set_folder <folder_name> for direct setting,
    or falls back to interactive mode if no argument or ambiguity.
    """
    global SET_FOLDER_PATH_CACHE, DRIVE_DATA

    # Check if there's already a pending ask for this chat to prevent re-triggering
    if message.chat.id in _pending_requests:
        await message.reply_text("I'm already waiting for your input. Please provide the folder name or /cancel.")
        return 

    # Extract the argument from the command, if any
    # message.text will be something like "/set_folder grammar"
    # message.command will be ["set_folder", "grammar"]
    command_args = message.command
    folder_name_from_command = None
    if len(command_args) > 1:
        folder_name_from_command = " ".join(command_args[1:]).strip()

    target_folder_name = None
    if folder_name_from_command:
        # If a folder name was provided in the command, try to find it directly
        logger.info(f"Attempting direct set_folder for: '{folder_name_from_command}'")
        search_result = DRIVE_DATA.search_file_folder(folder_name_from_command)
        
        found_folders = {}
        for item in search_result.values():
            if item.type == "folder":
                found_folders[item.id] = item

        if len(found_folders) == 1:
            # Exactly one folder found, set it directly
            folder_id = list(found_folders.keys())[0]
            folder = found_folders[folder_id]
            path_segments = [seg for seg in folder.path.strip("/").split("/") if seg]
            folder_path = "/" + ("/".join(path_segments + [folder.id]))
            
            BOT_MODE.set_folder(folder_path, folder.name)

            # Persist the selected folder to the configuration file
            try:
                with open(DEFAULT_FOLDER_CONFIG_FILE, "w") as f:
                    json.dump({"current_folder": folder_path, "current_folder_name": folder.name}, f)
                logger.info(f"Saved default folder to config: {folder.name} -> {folder_path}")
            except Exception as e:
                logger.error(f"Failed to save default folder config: {e}")

            await message.reply_text(
                f"📁 **Folder Set Successfully!**\n\n"
                f"**Current folder:** {folder.name}\n\n"
                f"Now you can send/forward files to me and they will be uploaded to this folder.\n"
                f"You can also use /create_folder to create new folders in this location."
            )
            return # Exit handler after direct setting

        elif len(found_folders) > 1:
            # Multiple folders found, proceed to interactive selection
            await message.reply_text(f"Multiple folders found with name '{folder_name_from_command}'. Please select one:")
            target_folder_name = folder_name_from_command # Use this for generating buttons below
        else:
            # No folder found with the given name, prompt for interactive input
            await message.reply_text(f"No folder found with name '{folder_name_from_command}'. Please send the exact folder name:")
            target_folder_name = None # Will trigger the manual_ask below


    # If no argument was provided, or if direct setting was ambiguous/failed,
    # proceed with the interactive 'ask' process.
    if target_folder_name is None: # This means we need to ask the user for input
        while True:
            try:
                folder_name_input_msg = await manual_ask(
                    client=client,
                    chat_id=message.chat.id,
                    text="Send the folder name where you want to upload files\n\n/cancel to cancel",
                    timeout=60,
                    filters=filters.text,
                )
            except asyncio.TimeoutError:
                await message.reply_text("Timeout\n\nUse /set_folder to set folder again")
                return

            if folder_name_input_msg.text.lower() == "/cancel":
                await message.reply_text("Cancelled")
                return

            target_folder_name = folder_name_input_msg.text.strip()
            if not target_folder_name: # Handle empty input after ask
                await message.reply_text("Folder name cannot be empty. Please send a valid name or /cancel.")
                continue # Ask again
            
            search_result = DRIVE_DATA.search_file_folder(target_folder_name)
            
            folders = {}
            for item in search_result.values():
                if item.type == "folder":
                    folders[item.id] = item

            if len(folders) == 0:
                await message.reply_text(f"No Folder found with name '{target_folder_name}'")
            else:
                break # Found folders, proceed to show buttons
    else: # If target_folder_name was set due to ambiguity, we re-search with it
          # This branch handles the case where direct command resulted in multiple matches.
        search_result = DRIVE_DATA.search_file_folder(target_folder_name)
        folders = {}
        for item in search_result.values():
            if item.type == "folder":
                folders[item.id] = item

    # Proceed to show inline buttons for selection if interactive mode is needed
    if folders: # Only show buttons if there are folders to select
        buttons = []
        folder_cache = {}
        folder_cache_id = len(SET_FOLDER_PATH_CACHE) + 1

        for folder in folders.values():
            path_segments = [seg for seg in folder.path.strip("/").split("/") if seg]
            folder_path = "/" + ("/".join(path_segments + [folder.id]))
            
            folder_cache[folder.id] = (folder_path, folder.name)
            buttons.append(
                [
                    InlineKeyboardButton(
                        folder.name,
                        callback_data=f"set_folder_{folder_cache_id}_{folder.id}",
                    )
                ]
            )
        SET_FOLDER_PATH_CACHE[folder_cache_id] = folder_cache

        await message.reply_text(
            "Select the folder where you want to upload files",
            reply_markup=InlineKeyboardMarkup(buttons),
        )
    else:
        # This case should ideally be caught by len(folders) == 0 check earlier,
        # but as a safeguard if interactive input also yields no results.
        await message.reply_text(f"No folders found for '{target_folder_name}' after search. Please try /set_folder again.")


@main_bot.on_callback_query(
    filters.user(config.TELEGRAM_ADMIN_IDS) & filters.regex(r"set_folder_")
)
async def set_folder_callback(client: Client, callback_query: Message):
    """
    Handles the callback query when a user selects a folder from the inline buttons.
    Sets the selected folder as the current default and saves it to a config file.
    """
    global SET_FOLDER_PATH_CACHE, BOT_MODE

    folder_cache_id_str, folder_id = callback_query.data.split("_")[2:]
    folder_cache_id = int(folder_cache_id_str)

    folder_path_cache = SET_FOLDER_PATH_CACHE.get(folder_cache_id)
    if folder_path_cache is None:
        await callback_query.answer("Request Expired, Send /set_folder again")
        await callback_query.message.delete()
        return

    folder_path, name = folder_path_cache.get(folder_id)
    if folder_path is None:
        await callback_query.answer("Selected folder not found in cache. Please try again.")
        await callback_query.message.delete()
        return

    del SET_FOLDER_PATH_CACHE[folder_cache_id]

    BOT_MODE.set_folder(folder_path, name)

    try:
        with open(DEFAULT_FOLDER_CONFIG_FILE, "w") as f:
            json.dump({"current_folder": folder_path, "current_folder_name": name}, f)
        logger.info(f"Saved default folder to config: {name} -> {folder_path}")
    except Exception as e:
        logger.error(f"Failed to save default folder config: {e}")

    await callback_query.answer(f"Folder Set Successfully To : {name}")
    await callback_query.message.edit(
        f"📁 **Folder Set Successfully!**\n\n"
        f"**Current folder:** {name}\n\n"
        f"Now you can send/forward files to me and they will be uploaded to this folder.\n"
        f"You can also use /create_folder to create new folders in this location."
    )


@main_bot.on_message(
    filters.command("current_folder")
    & filters.private
    & filters.user(config.TELEGRAM_ADMIN_IDS),
)
async def current_folder_handler(client: Client, message: Message):
    """
    Handles the /current_folder command, displaying the currently set default folder.
    """
    global BOT_MODE

    if BOT_MODE.current_folder:
        await message.reply_text(
            f"📁 **Current Folder Information**\n\n"
            f"**Folder:** {BOT_MODE.current_folder_name}\n"
            f"**Path:** {BOT_MODE.current_folder}\n\n"
            f"💡 **Available commands:**\n"
            f"• Send files to upload them here\n"
            f"• /create_folder - Create new folders\n"
            f"• /set_folder - Change current folder"
        )
    else:
        await message.reply_text(
            f"❌ **No current folder set**\n\n"
            f"Use /set_folder to set a folder first.\n\n"
            f"💡 **Available commands:**\n"
            f"• /set_folder - Set current folder\n"
            f"• /help - Show all commands"
        )


@main_bot.on_message(
    filters.private
    & filters.user(config.TELEGRAM_ADMIN_IDS)
    & (
        filters.document
        | filters.video
        | filters.audio
        | filters.photo
        | filters.sticker
    )
)
async def file_handler(client: Client, message: Message):
    """
    Handles incoming file messages (documents, videos, audio, photos, stickers).
    Uploads the file to the currently set default folder.
    """
    global BOT_MODE, DRIVE_DATA

    # Ensure there's no pending ask request for this chat before processing files
    # This prevents file uploads from interfering with an active /set_folder conversation
    if message.chat.id in _pending_requests:
        logger.debug(f"Ignoring file from {message.chat.id} due to pending ask request.")
        return # Do not process file if waiting for text input

    if not BOT_MODE.current_folder:
        await message.reply_text(
            "❌ **Error:** No default folder set.\n\n"
            "Please use /set_folder to set one before uploading files.\n\n"
            "💡 **Quick start:**\n"
            "1. Use /set_folder to choose a folder\n"
            "2. Send files to upload them\n"
            "3. Use /create_folder to create new folders"
        )
        return

    copied_message = await message.copy(config.STORAGE_CHANNEL)
    file = (
        copied_message.document
        or copied_message.video
        or copied_message.audio
        or copied_message.photo
        or copied_message.sticker
    )

    DRIVE_DATA.new_file(
        BOT_MODE.current_folder,
        file.file_name,
        copied_message.id,
        file.file_size,
    )

    await message.reply_text(
        f"""✅ **File Uploaded Successfully!**
                             
**File Name:** {file.file_name}
**Folder:** {BOT_MODE.current_folder_name}
**Size:** {file.file_size / (1024*1024):.2f} MB

💡 **What's next?**
• Send more files to upload them
• Use /create_folder to create new folders
• Use /set_folder to change location
"""
    )

# --- GENERIC MESSAGE HANDLER (Lowest Priority) ---
# This handler MUST be defined AFTER all specific command and file handlers.
@main_bot.on_message(filters.private & filters.user(config.TELEGRAM_ADMIN_IDS) & filters.text)
async def _handle_all_messages(client: Client, message: Message):
    """
    This handler listens for all private text messages from authorized users.
    If a pending 'ask' request exists for this chat, it fulfills it and
    then explicitly returns to prevent further handler processing for this message.
    This handler is placed last to give precedence to specific command handlers.
    """
    chat_id = message.chat.id
    if chat_id in _pending_requests:
        queue, event, msg_filters = _pending_requests[chat_id]

        if msg_filters is None or msg_filters(None, message): 
            await queue.put(message)
            event.set() # Signal that a response has been received
            return # CRITICAL: Stop processing this message, it's been handled for 'ask'
        else:
            logger.debug(f"Message from {chat_id} did not match pending ask filter. Allowing other handlers.")


async def start_bot_mode(d, b):
    """
    Initializes the bot mode, starts the main bot client, and sets the initial
    default folder based on saved configuration or falls back to 'grammar'.
    """
    global DRIVE_DATA, BOT_MODE
    DRIVE_DATA = d
    BOT_MODE = b

    logger.info("Starting Main Bot")
    await main_bot.start()

    default_folder_path = None
    default_folder_name_to_use = None

    if DEFAULT_FOLDER_CONFIG_FILE.exists():
        try:
            with open(DEFAULT_FOLDER_CONFIG_FILE, "r") as f:
                config_data = json.load(f)
                default_folder_path = config_data.get("current_folder")
                default_folder_name_to_use = config_data.get("current_folder_name")
            if default_folder_path and default_folder_name_to_use:
                BOT_MODE.set_folder(default_folder_path, default_folder_name_to_use)
                logger.info(f"Loaded default folder from config: {default_folder_name_to_use} -> {default_folder_path}")
            else:
                logger.warning("Default folder config file found but data is incomplete. Falling back to 'grammar'.")
                default_folder_path = None
                default_folder_name_to_use = None
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Error reading default folder config file: {e}. Falling back to 'grammar'.")
            default_folder_path = None
            default_folder_name_to_use = None

    if default_folder_path and default_folder_name_to_use:
        BOT_MODE.set_folder(default_folder_path, default_folder_name_to_use)
        message_to_send = f"Main Bot Started -> TG Drive's Bot Mode Enabled with previously set folder: {default_folder_name_to_use}"
    else:
        hardcoded_default_folder_name = "grammar"
        search_result = DRIVE_DATA.search_file_folder(hardcoded_default_folder_name)
        found_grammar = False
        for item in search_result.values():
            if item.type == "folder":
                path_segments = [seg for seg in item.path.strip("/").split("/") if seg]
                folder_path = "/" + ("/".join(path_segments + [item.id]))
                
                BOT_MODE.set_folder(folder_path, item.name)
                logger.info(f"Default folder set to: {item.name} -> {folder_path}")
                try:
                    with open(DEFAULT_FOLDER_CONFIG_FILE, "w") as f:
                        json.dump({"current_folder": folder_path, "current_folder_name": item.name}, f)
                    logger.info(f"Saved initial 'grammar' default folder to config.")
                except Exception as e:
                    logger.error(f"Failed to save initial default folder config: {e}")
                found_grammar = True
                break
        if not found_grammar:
            logger.warning(f"No folder found with name '{hardcoded_default_folder_name}'. No default folder set initially.")
            BOT_MODE.set_folder(None, "No default folder set. Please use /set_folder.") 
            message_to_send = "Main Bot Started -> TG Drive's Bot Mode Enabled. No 'grammar' folder found, please use /set_folder to choose one."

        else:
            message_to_send = "Main Bot Started -> TG Drive's Bot Mode Enabled with default folder Grammar"

    await main_bot.send_message(
        config.STORAGE_CHANNEL,
        message_to_send,
    )
    logger.info(message_to_send)