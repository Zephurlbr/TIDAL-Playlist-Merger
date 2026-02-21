import json
import asyncio
import sys
import os
from typing import List
from anyio import to_thread

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services import merge_service
from services import tidal_service
from dependencies import require_auth
from utils.url_parser import extract_playlist_id

router = APIRouter(tags=["api"])

class ResolveRequest(BaseModel):
    url: str

class MergeRequest(BaseModel):
    playlistIds: List[str]
    name: str
    keepItTidy: bool = False

@router.post("/playlist/resolve")
async def resolve_playlist(request: ResolveRequest, _: bool = Depends(require_auth)):
    parsed = extract_playlist_id(request.url)
    if not parsed['success']:
        raise HTTPException(status_code=400, detail=parsed['error'])
    
    try:
        playlist = await to_thread.run_sync(
            tidal_service.get_playlist_by_id, parsed['id']
        )
        return playlist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/merge")
async def merge_playlists(request: MergeRequest, _: bool = Depends(require_auth)):
    if not request.playlistIds:
        raise HTTPException(status_code=400, detail="No playlists provided")
    
    if not request.name:
        raise HTTPException(status_code=400, detail="Playlist name is required")
    
    if len(request.playlistIds) < 2:
        raise HTTPException(status_code=400, detail="At least 2 playlists required")
    
    queue: asyncio.Queue = asyncio.Queue()
    merge_complete = asyncio.Event()
    
    async def progress_callback(data: dict):
        await queue.put(data)
    
    async def run_merge():
        try:
            result = await merge_service.merge_playlists(
                request.playlistIds,
                request.name,
                progress_callback,
                request.keepItTidy
            )
            await queue.put({'complete': True, 'result': result})
        except Exception as e:
            await queue.put({'error': str(e)})
        finally:
            merge_complete.set()
    
    asyncio.create_task(run_merge())
    
    async def event_generator():
        while True:
            try:
                msg = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield f"data: {json.dumps(msg)}\n\n"
                
                if msg.get('complete') or msg.get('error'):
                    break
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'ping': True})}\n\n"
        
        await merge_complete.wait()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
