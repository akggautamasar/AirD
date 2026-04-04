import math
import mimetypes
from fastapi.responses import StreamingResponse, Response
from utils.logger import Logger
from utils.streamer.custom_dl import ByteStreamer
from utils.streamer.file_properties import get_name
from utils.clients import get_client
from urllib.parse import quote
from utils.directoryHandler import DRIVE_DATA

logger = Logger(__name__)

class_cache = {}


async def media_streamer(channel: int, message_id: int, file_name: str, request):
    global class_cache

    range_header = request.headers.get("Range", 0)

    # Support fast import files (stream directly from source channel)
    try:
        file_path = request.query_params.get("path", "")
        if file_path and DRIVE_DATA:
            try:
                file_obj = DRIVE_DATA.get_file(file_path)
                if file_obj and hasattr(file_obj, 'is_fast_import') and file_obj.is_fast_import and file_obj.source_channel:
                    channel = file_obj.source_channel
                    logger.debug(f"Using fast import source channel {channel} for file {file_name}")
            except Exception as e:
                logger.debug(f"Could not get file object for path {file_path}: {e}")
    except Exception as e:
        logger.debug(f"Error in fast import check: {e}")

    faster_client = get_client()

    if faster_client in class_cache:
        tg_connect = class_cache[faster_client]
    else:
        tg_connect = ByteStreamer(faster_client)
        class_cache[faster_client] = tg_connect

    try:
        file_id = await tg_connect.get_file_properties(channel, message_id)
        if not file_id:
            logger.error(f"Could not get file properties for message {message_id} in channel {channel}")
            return Response(
                status_code=404,
                content="File not found or inaccessible",
            )
        file_size = file_id.file_size
    except Exception as e:
        logger.error(f"Failed to get file properties for message {message_id} in channel {channel}: {e}")
        return Response(
            status_code=404,
            content="File not found or inaccessible",
        )

    # Parse range header
    if range_header:
        try:
            from_bytes, until_bytes = range_header.replace("bytes=", "").split("-")
            from_bytes = int(from_bytes)
            until_bytes = int(until_bytes) if until_bytes else file_size - 1
        except (ValueError, AttributeError):
            logger.warning(f"Invalid range header: {range_header}")
            from_bytes = 0
            until_bytes = file_size - 1
    else:
        from_bytes = 0
        until_bytes = file_size - 1

    if (until_bytes > file_size) or (from_bytes < 0) or (until_bytes < from_bytes):
        return Response(
            status_code=416,
            content="416: Range not satisfiable",
            headers={"Content-Range": f"bytes */{file_size}"},
        )

    # Optimize chunk size
    if file_size < 10 * 1024 * 1024:
        chunk_size = 256 * 1024
    elif file_size < 100 * 1024 * 1024:
        chunk_size = 512 * 1024
    else:
        chunk_size = 1024 * 1024

    until_bytes = min(until_bytes, file_size - 1)

    offset = from_bytes - (from_bytes % chunk_size)
    first_part_cut = from_bytes - offset
    last_part_cut = until_bytes % chunk_size + 1

    req_length = until_bytes - from_bytes + 1
    part_count = math.ceil(until_bytes / chunk_size) - math.floor(offset / chunk_size)

    try:
        body = tg_connect.yield_file(
            file_id, offset, first_part_cut, last_part_cut, part_count, chunk_size
        )
    except Exception as e:
        logger.error(f"Failed to yield file data: {e}")
        return Response(
            status_code=500,
            content="Internal server error while streaming file",
        )

    disposition = "attachment"
    mime_type = mimetypes.guess_type(file_name.lower())[0] or "application/octet-stream"

    if (
        "video/" in mime_type
        or "audio/" in mime_type
        or "image/" in mime_type
        or "/html" in mime_type
    ):
        disposition = "inline"

    # Caching headers
    cache_headers = {
        "Cache-Control": "public, max-age=3600",
        "ETag": f'"{message_id}-{file_size}"',
    }

    # Check for If-None-Match (304 Not Modified)
    if_none_match = request.headers.get("If-None-Match")
    if if_none_match and if_none_match.strip('"') == f"{message_id}-{file_size}":
        return Response(status_code=304)

    # FIXED: Proper 200 vs 206 handling
    if range_header:
        status_code = 206
        response_headers = {
            "Content-Type": mime_type,
            "Content-Range": f"bytes {from_bytes}-{until_bytes}/{file_size}",
            "Content-Length": str(req_length),
            "Content-Disposition": f'{disposition}; filename="{quote(file_name)}"',
            "Accept-Ranges": "bytes",
            **cache_headers,
        }
    else:
        status_code = 200
        response_headers = {
            "Content-Type": mime_type,
            "Content-Length": str(req_length),
            "Content-Disposition": f'{disposition}; filename="{quote(file_name)}"',
            "Accept-Ranges": "bytes",
            **cache_headers,
        }

    return StreamingResponse(
        status_code=status_code,
        content=body,
        headers=response_headers,
        media_type=mime_type,
    )
