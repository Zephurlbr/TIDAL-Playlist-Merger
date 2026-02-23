import json
import asyncio
import sys
import os
from typing import List, Optional
from anyio import to_thread

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.merge_service import merge_service
from services.tidal_service import tidal_service
from dependencies import require_auth
from utils.content_parser import parse_content, extract_playlist_id

router = APIRouter(tags=["api"])


class ResolveRequest(BaseModel):
    url: str


class ContentResolveRequest(BaseModel):
    input: str


class SearchRequest(BaseModel):
    query: str
    limit: int = 10
    offset: int = 0


class MergeRequest(BaseModel):
    playlistIds: Optional[List[str]] = None
    contentIds: Optional[List[str]] = None
    contentTypes: Optional[List[str]] = None
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


@router.post("/content/resolve")
async def resolve_content(request: ContentResolveRequest, _: bool = Depends(require_auth)):
    parsed = parse_content(request.input)
    
    try:
        if parsed['type'] == 'url':
            content_type = parsed['content_type']
            content_id = parsed['id']
            
            if content_type == 'playlist':
                content = await to_thread.run_sync(
                    tidal_service.get_playlist_by_id, content_id
                )
            elif content_type == 'album':
                content = await to_thread.run_sync(
                    tidal_service.get_album_by_id, content_id
                )
            elif content_type == 'mix':
                content = await to_thread.run_sync(
                    tidal_service.get_mix_by_id, content_id
                )
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported content type: {content_type}")
            
            return content
        
        elif parsed['type'] == 'id':
            content = await to_thread.run_sync(
                tidal_service.resolve_content, parsed['id']
            )
            return content
        
        else:
            results = await to_thread.run_sync(
                tidal_service.search_content, parsed['query'], 10, 0
            )
            return {'type': 'search', **results}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/playlists")
async def get_user_playlists(_: bool = Depends(require_auth)):
    try:
        playlists = await to_thread.run_sync(tidal_service.get_user_playlists)
        favorites = await to_thread.run_sync(tidal_service.get_user_favorites)
        return {'playlists': playlists, 'favorites': favorites}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_content(request: SearchRequest, _: bool = Depends(require_auth)):
    try:
        result = await to_thread.run_sync(
            tidal_service.search_content,
            request.query,
            request.limit,
            request.offset
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/content/{content_id}/tracks")
async def get_content_tracks(
    content_id: str,
    content_type: str = Query(..., description="Content type: playlist, album, mix, or favorites"),
    _: bool = Depends(require_auth)
):
    if content_type not in ['playlist', 'album', 'mix', 'favorites']:
        raise HTTPException(status_code=400, detail=f"Invalid content type: {content_type}")
    
    try:
        tracks = await to_thread.run_sync(
            tidal_service.get_content_tracks, content_id, content_type
        )
        return {'tracks': tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/merge")
async def merge_playlists(request: MergeRequest, _: bool = Depends(require_auth)):
    content_ids = request.contentIds or request.playlistIds or []
    content_types = request.contentTypes or ['playlist'] * len(content_ids)
    
    if not content_ids:
        raise HTTPException(status_code=400, detail="No content provided")
    
    if not request.name:
        raise HTTPException(status_code=400, detail="Playlist name is required")
    
    if len(content_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 items required")
    
    if len(content_ids) != len(content_types):
        raise HTTPException(status_code=400, detail="contentIds and contentTypes must have the same length")
    
    queue: asyncio.Queue = asyncio.Queue()
    merge_complete = asyncio.Event()
    
    async def progress_callback(data: dict):
        await queue.put(data)
    
    async def run_merge():
        try:
            result = await merge_service.merge_playlists(
                content_ids,
                content_types,
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
