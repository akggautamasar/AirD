import asyncio
import re
from pyrogram import Client
from pyrogram.types import Message
from utils.logger import Logger
from utils.directoryHandler import DRIVE_DATA
from config import STORAGE_CHANNEL

logger = Logger(__name__)

class FastImportManager:
    def __init__(self):
        self.import_channels = {}  # Store channel info for fast import
        
    async def validate_channel_access(self, client: Client, channel_identifier: str):
        """Validate that the bot has admin access to the channel"""
        try:
            # Try to get channel info
            channel = await client.get_chat(channel_identifier)
            
            # Check if bot is admin
            bot_member = await client.get_chat_member(channel.id, "me")
            if not bot_member.privileges or not (bot_member.privileges.can_delete_messages or bot_member.privileges.can_edit_messages):
                return False, "Bot needs admin privileges in the channel"
                
            return True, channel
        except Exception as e:
            return False, f"Cannot access channel: {str(e)}"
    
    async def get_channel_files(self, client: Client, channel_id: int, start_msg_id: int = None, end_msg_id: int = None):
        """Get all files from a channel within the specified range"""
        files = []
        
        try:
            if start_msg_id and end_msg_id:
                # Get files in range
                for msg_id in range(start_msg_id, end_msg_id + 1):
                    try:
                        message = await client.get_messages(channel_id, msg_id)
                        if message and not message.empty:
                            file_info = self.extract_file_info(message, channel_id)
                            if file_info:
                                files.append(file_info)
                    except:
                        continue
            else:
                # Get all files from channel
                async for message in client.get_chat_history(channel_id):
                    file_info = self.extract_file_info(message, channel_id)
                    if file_info:
                        files.append(file_info)
                        
        except Exception as e:
            logger.error(f"Error getting channel files: {e}")
            
        return files
    
    def extract_file_info(self, message: Message, source_channel_id: int):
        """Extract file information from a message"""
        media = (
            message.document
            or message.video
            or message.audio
            or message.photo
            or message.sticker
        )
        
        if not media:
            return None
            
        return {
            'message_id': message.id,
            'file_name': getattr(media, 'file_name', f'file_{message.id}'),
            'file_size': getattr(media, 'file_size', 0),
            'duration': getattr(media, 'duration', 0) if hasattr(media, 'duration') else 0,
            'source_channel': source_channel_id,
            'file_id': media.file_id,
            'file_unique_id': media.file_unique_id
        }
    
    async def fast_import_files(self, client: Client, channel_identifier: str, destination_folder: str, 
                               start_msg_id: int = None, end_msg_id: int = None):
        """Import files directly without copying to storage channel"""
        
        # Validate channel access
        is_valid, result = await self.validate_channel_access(client, channel_identifier)
        if not is_valid:
            raise Exception(result)
            
        channel = result
        channel_id = channel.id
        
        # Get files from channel
        files = await self.get_channel_files(client, channel_id, start_msg_id, end_msg_id)
        
        if not files:
            raise Exception("No files found in the specified range")
        
        # Add files to drive data with source channel info
        imported_count = 0
        for file_info in files:
            try:
                # Create a special file entry that references the source channel
                DRIVE_DATA.new_fast_import_file(
                    destination_folder,
                    file_info['file_name'],
                    file_info['message_id'],
                    file_info['file_size'],
                    file_info['duration'],
                    file_info['source_channel']
                )
                imported_count += 1
                logger.info(f"Fast imported: {file_info['file_name']} from channel {channel_id}")
                
            except Exception as e:
                logger.error(f"Error importing file {file_info['file_name']}: {e}")
                continue
        
        return imported_count, len(files)

# Global instance
FAST_IMPORT_MANAGER = FastImportManager()