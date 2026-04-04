from utils.downloader import (
    download_file,
    get_file_info_from_url,
)
import asyncio
import os
from pathlib import Path
from contextlib import asynccontextmanager
import aiofiles
from fastapi import FastAPI, HTTPException, Request, File, UploadFile, Form, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from config import ADMIN_PASSWORD, MAX_FILE_SIZE, STORAGE_CHANNEL
from utils.clients import initialize_clients
from utils.directoryHandler import getRandomID
from utils.extra import auto_ping_website, convert_class_to_dict, reset_cache_dir
from utils.streamer import media_streamer
from utils.uploader import start_file_uploader
from utils.logger import Logger
import urllib.parse


# Startup Event
@asynccontextmanager
async def lifespan(app: FastAPI):
    reset_cache_dir()
    # Start initialization in background to avoid blocking startup
    asyncio.create_task(initialize_clients())
    asyncio.create_task(auto_ping_website())
    yield


app = FastAPI(docs_url=None, redoc_url=None, lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = Logger(__name__)


@app.get("/")
async def home_page():
    try:
        return FileResponse("website/home.html")
    except Exception as e:
        logger.error(f"Error serving home page: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/stream")
async def stream_page():
    try:
        return FileResponse("website/VideoPlayer.html")
    except Exception as e:
        logger.error(f"Error serving stream page: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/fast-player")
async def fast_player_page():
    try:
        return FileResponse("website/FastPlayer.html")
    except Exception as e:
        logger.error(f"Error serving fast player: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/pdf-viewer")
async def pdf_viewer_page():
    try:
        return FileResponse("website/PDFViewer.html")
    except Exception as e:
        logger.error(f"Error serving PDF viewer: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/debug")
async def debug_page():
    try:
        return FileResponse("website/debug.html")
    except Exception as e:
        logger.error(f"Error serving debug page: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/favicon.ico")
async def favicon():
    return Response(status_code=204)


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    from utils.directoryHandler import DRIVE_DATA
    from utils.clients import multi_clients

    status = {
        "status": "ok",
        "initializing": True,
        "clients_count": len(multi_clients),
        "drive_data_loaded": DRIVE_DATA is not None,
    }

    if len(multi_clients) > 0 and DRIVE_DATA:
        status["initializing"] = False
        try:
            root = DRIVE_DATA.get_directory("/")
            status["root_exists"] = root is not None
        except:
            status["root_exists"] = False

    return JSONResponse(status)


@app.get("/static/{file_path:path}")
async def static_files(file_path: str):
    try:
        if "apiHandler.js" in file_path:
            with open(Path("website/static/js/apiHandler.js")) as f:
                content = f.read()
                content = content.replace("MAX_FILE_SIZE__SDGJDG", str(MAX_FILE_SIZE))
            return Response(content=content, media_type="application/javascript")
        return FileResponse(f"website/static/{file_path}")
    except Exception as e:
        logger.error(f"Static file error {file_path}: {e}")
        raise HTTPException(status_code=404, detail="File not found")


@app.get("/file")
async def dl_file(request: Request):
    try:
        from utils.directoryHandler import DRIVE_DATA

        path = request.query_params.get("path")
        logger.info(f"File request for path: {path}")

        if not path:
            logger.error("No path parameter provided")
            raise HTTPException(status_code=400, detail="Path parameter is required")

        if not DRIVE_DATA:
            logger.error("DRIVE_DATA not initialized")
            raise HTTPException(status_code=503, detail="Drive data not initialized. Please wait and try again.")

        file = DRIVE_DATA.get_file(path)
        if not file:
            logger.error(f"File not found at path: {path}")
            raise HTTPException(status_code=404, detail=f"File not found at path: {path}")

        logger.info(f"Streaming file: {file.name} (ID: {file.file_id})")

        # Fast import support
        channel = file.source_channel if (hasattr(file, 'is_fast_import') and file.is_fast_import and file.source_channel) else STORAGE_CHANNEL

        return await media_streamer(channel, file.file_id, file.name, request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File serving error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ====================== API Routes ======================

@app.post("/api/checkPassword")
async def check_password(request: Request):
    data = await request.json()
    if data.get("pass") == ADMIN_PASSWORD:
        return JSONResponse({"status": "ok"})
    return JSONResponse({"status": "Invalid password"})


@app.post("/api/createNewFolder")
async def api_new_folder(request: Request):
    from utils.directoryHandler import DRIVE_DATA
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    logger.info(f"createNewFolder {data}")
    folder_data = DRIVE_DATA.get_directory(data["path"]).contents
    for fid in folder_data:
        f = folder_data[fid]
        if f.type == "folder" and f.name == data["name"]:
            return JSONResponse({"status": "Folder with the name already exist in current directory"})

    DRIVE_DATA.new_folder(data["path"], data["name"])
    return JSONResponse({"status": "ok"})


@app.post("/api/getDirectory")
async def api_get_directory(request: Request):
    from utils.directoryHandler import DRIVE_DATA
    data = await request.json()

    is_admin = data.get("password") == ADMIN_PASSWORD
    auth = data.get("auth")
    sort_by = data.get("sort_by", "date")
    sort_order = data.get("sort_order", "desc")

    logger.info(f"getDirectory {data}")

    try:
        if data["path"] == "/trash":
            contents = {"contents": DRIVE_DATA.get_trashed_files_folders()}
            folder_data = convert_class_to_dict(contents, isObject=False, showtrash=True, sort_by=sort_by, sort_order=sort_order)
        elif "/search_" in data["path"]:
            query = urllib.parse.unquote(data["path"].split("_", 1)[1])
            contents = {"contents": DRIVE_DATA.search_file_folder(query)}
            folder_data = convert_class_to_dict(contents, isObject=False, showtrash=False, sort_by=sort_by, sort_order=sort_order)
        elif "/share_" in data["path"]:
            path = data["path"].split("_", 1)[1]
            folder_obj, auth_home_path = DRIVE_DATA.get_directory(path, is_admin, auth)
            auth_home_path = auth_home_path.replace("//", "/") if auth_home_path else None
            folder_data = convert_class_to_dict(folder_obj, isObject=True, showtrash=False, sort_by=sort_by, sort_order=sort_order)
            return JSONResponse({"status": "ok", "data": folder_data, "auth_home_path": auth_home_path})
        else:
            folder_obj = DRIVE_DATA.get_directory(data["path"])
            folder_data = convert_class_to_dict(folder_obj, isObject=True, showtrash=False, sort_by=sort_by, sort_order=sort_order)

        return JSONResponse({"status": "ok", "data": folder_data, "auth_home_path": None})
    except Exception as e:
        logger.error(f"getDirectory error: {e}")
        return JSONResponse({"status": "error", "message": str(e)})


SAVE_PROGRESS = {}


@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    path: str = Form(...),
    password: str = Form(...),
    id: str = Form(...),
    total_size: str = Form(...),
):
    global SAVE_PROGRESS
    if password != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    total_size = int(total_size)
    SAVE_PROGRESS[id] = ("running", 0, total_size)

    ext = file.filename.lower().split(".")[-1] if "." in file.filename else "bin"
    cache_dir = Path("./cache")
    cache_dir.mkdir(parents=True, exist_ok=True)
    file_location = cache_dir / f"{id}.{ext}"

    file_size = 0
    try:
        async with aiofiles.open(file_location, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                file_size += len(chunk)
                SAVE_PROGRESS[id] = ("running", file_size, total_size)
                if file_size > MAX_FILE_SIZE:
                    await buffer.close()
                    file_location.unlink(missing_ok=True)
                    raise HTTPException(status_code=400, detail=f"File size exceeds {MAX_FILE_SIZE} bytes limit")
                await buffer.write(chunk)

        SAVE_PROGRESS[id] = ("completed", file_size, file_size)
        asyncio.create_task(start_file_uploader(file_location, id, path, file.filename, file_size))
        return JSONResponse({"id": id, "status": "ok"})
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return JSONResponse({"status": "error", "message": str(e)})


@app.post("/api/getSaveProgress")
async def api_get_save_progress(request: Request):
    global SAVE_PROGRESS
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    id = data.get("id")
    if id in SAVE_PROGRESS:
        status, current, total = SAVE_PROGRESS[id]
        return JSONResponse({"status": status, "current": current, "total": total})
    return JSONResponse({"status": "not_found"})


@app.post("/api/getUploadProgress")
async def api_get_upload_progress(request: Request):
    from utils.uploader import UPLOAD_PROGRESS
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    id = data.get("id")
    if id in UPLOAD_PROGRESS:
        status, current, total = UPLOAD_PROGRESS[id]
        return JSONResponse({"status": status, "current": current, "total": total})
    return JSONResponse({"status": "not_found"})


@app.post("/api/cancelUpload")
async def api_cancel_upload(request: Request):
    from utils.uploader import UPLOAD_PROGRESS
    global SAVE_PROGRESS
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    id = data.get("id")
    if id in SAVE_PROGRESS:
        del SAVE_PROGRESS[id]
    if id in UPLOAD_PROGRESS:
        UPLOAD_PROGRESS[id] = ("cancelled", 0, 0)

    return JSONResponse({"status": "ok"})


@app.post("/api/rename")
@app.post("/api/renameFileFolder")
async def api_rename(request: Request):
    from utils.directoryHandler import DRIVE_DATA
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    logger.info(f"rename {data}")
    # Support both 'new_name' and 'name' fields
    new_name = data.get("new_name") or data.get("name")
    DRIVE_DATA.rename_file_folder(data["path"], new_name)
    return JSONResponse({"status": "ok"})


@app.post("/api/trash")
@app.post("/api/trashFileFolder")
async def api_trash(request: Request):
    from utils.directoryHandler import DRIVE_DATA
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    logger.info(f"trash {data}")
    DRIVE_DATA.trash_file_folder(data["path"], data["trash"])
    return JSONResponse({"status": "ok"})


@app.post("/api/delete")
@app.post("/api/deleteFileFolder")
async def api_delete(request: Request):
    from utils.directoryHandler import DRIVE_DATA
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    logger.info(f"delete {data}")
    DRIVE_DATA.delete_file_folder(data["path"])
    return JSONResponse({"status": "ok"})


@app.post("/api/move")
async def api_move(request: Request):
    from utils.directoryHandler import DRIVE_DATA
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    logger.info(f"move {data}")
    try:
        DRIVE_DATA.move_file_folder(data["source_path"], data["destination_path"])
        return JSONResponse({"status": "ok"})
    except Exception as e:
        logger.error(f"Move error: {e}")
        return JSONResponse({"status": "error", "message": str(e)})


@app.post("/api/copy")
async def api_copy(request: Request):
    from utils.directoryHandler import DRIVE_DATA
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    logger.info(f"copy {data}")
    try:
        DRIVE_DATA.copy_file_folder(data["source_path"], data["destination_path"])
        return JSONResponse({"status": "ok"})
    except Exception as e:
        logger.error(f"Copy error: {e}")
        return JSONResponse({"status": "error", "message": str(e)})


@app.post("/api/getFolderTree")
async def api_get_folder_tree(request: Request):
    from utils.directoryHandler import DRIVE_DATA
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    try:
        tree = DRIVE_DATA.get_folder_tree()
        return JSONResponse({"status": "ok", "tree": tree})
    except Exception as e:
        logger.error(f"Get folder tree error: {e}")
        return JSONResponse({"status": "error", "message": str(e)})


DOWNLOAD_PROGRESS = {}


@app.post("/api/getFileInfoFromUrl")
async def api_get_file_info_from_url(request: Request):
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    url = data.get("url")
    if not url:
        return JSONResponse({"status": "error", "message": "URL is required"})

    try:
        file_info = await get_file_info_from_url(url)
        return JSONResponse({"status": "ok", "file_info": file_info})
    except Exception as e:
        logger.error(f"Get file info error: {e}")
        return JSONResponse({"status": "error", "message": str(e)})


@app.post("/api/startFileDownloadFromUrl")
async def api_start_file_download_from_url(request: Request):
    global DOWNLOAD_PROGRESS
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    url = data.get("url")
    path = data.get("path")
    filename = data.get("filename")
    id = getRandomID()

    if not url or not path or not filename:
        return JSONResponse({"status": "error", "message": "URL, path, and filename are required"})

    DOWNLOAD_PROGRESS[id] = ("running", 0, 0)
    asyncio.create_task(download_file(url, path, filename, id, DOWNLOAD_PROGRESS))

    return JSONResponse({"status": "ok", "id": id})


@app.post("/api/getFileDownloadProgress")
async def api_get_file_download_progress(request: Request):
    global DOWNLOAD_PROGRESS
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    id = data.get("id")
    if id in DOWNLOAD_PROGRESS:
        status, current, total = DOWNLOAD_PROGRESS[id]
        return JSONResponse({"status": status, "current": current, "total": total})
    return JSONResponse({"status": "not_found"})


@app.post("/api/getFolderShareAuth")
async def api_get_folder_share_auth(request: Request):
    from utils.directoryHandler import DRIVE_DATA
    data = await request.json()
    if data.get("password") != ADMIN_PASSWORD:
        return JSONResponse({"status": "Invalid password"})

    path = data.get("path")
    if not path:
        return JSONResponse({"status": "error", "message": "Path is required"})

    try:
        auth = DRIVE_DATA.get_folder_auth(path)
        if auth:
            return JSONResponse({"status": "ok", "auth": auth})
        else:
            return JSONResponse({"status": "error", "message": "Failed to generate auth"})
    except Exception as e:
        logger.error(f"Get folder auth error: {e}")
        return JSONResponse({"status": "error", "message": str(e)})


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
