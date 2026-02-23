import logging
import asyncio
from typing import List, Callable, Optional, Dict, Set, Any
from anyio import to_thread

logger = logging.getLogger(__name__)

MAX_DUPLICATES_RETURNED = 200
TRACK_LIMIT = 10000

class MergeService:
    async def merge_playlists(
        self,
        content_ids: List[str],
        content_types: List[str],
        new_playlist_name: str,
        on_progress: Optional[Callable[[dict], Any]] = None,
        keep_it_tidy: bool = False
    ) -> dict:
        from . import tidal_service
        
        logger.info(f"Merging content: {list(zip(content_ids, content_types))} into {new_playlist_name} (keep_it_tidy={keep_it_tidy})")
        
        async def send_progress(message: str, progress: float = 0):
            if on_progress:
                data = {'message': message, 'progress': progress}
                if asyncio.iscoroutinefunction(on_progress):
                    await on_progress(data)
                else:
                    on_progress(data)
        
        all_tracks: List[str] = []
        seen_track_ids: Set[str] = set()
        total_fetched = 0
        cross_playlist_duplicates = 0
        intra_playlist_duplicates = 0
        content_track_counts = []
        
        first_occurrence: Dict[str, dict] = {}
        intra_duplicate_counts: Dict[str, int] = {}
        content_names: Dict[str, str] = {}
        total_content = len(content_ids)
        
        for i, (content_id, content_type) in enumerate(zip(content_ids, content_types)):
            type_label = content_type.capitalize()
            
            await send_progress(
                f"Fetching {type_label} {i + 1} of {total_content}...",
                (i / total_content) * 40 if total_content > 0 else 0
            )
            
            try:
                content_info = await to_thread.run_sync(
                    tidal_service.tidal_service.get_content_by_type, content_id, content_type
                )
                content_names[content_id] = content_info.get('name', f'{type_label} {i + 1}')
            except Exception:
                content_names[content_id] = f'{type_label} {i + 1}'
            
            tracks = await to_thread.run_sync(
                tidal_service.tidal_service.get_content_tracks, content_id, content_type
            )
            content_track_counts.append(len(tracks))
            
            tracks_in_this_content: Set[str] = set()
            
            for item in tracks:
                track_id = item.get('id')
                track_name = item.get('name', 'Unknown')
                track_artist = item.get('artist', 'Unknown Artist')
                
                if track_id:
                    total_fetched += 1
                    
                    is_intra_duplicate = track_id in tracks_in_this_content
                    is_cross_duplicate = track_id in seen_track_ids and not is_intra_duplicate
                    
                    tracks_in_this_content.add(track_id)
                    
                    if is_intra_duplicate:
                        intra_playlist_duplicates += 1
                        intra_duplicate_counts[track_id] = intra_duplicate_counts.get(track_id, 0) + 1
                        if not keep_it_tidy:
                            all_tracks.append(track_id)
                    
                    elif is_cross_duplicate:
                        cross_playlist_duplicates += 1
                        if track_id in first_occurrence:
                            current_content = content_names[content_id]
                            if current_content not in first_occurrence[track_id]['playlists']:
                                first_occurrence[track_id]['playlists'].append(current_content)
                    
                    else:
                        seen_track_ids.add(track_id)
                        all_tracks.append(track_id)
                        first_occurrence[track_id] = {
                            'name': track_name,
                            'artist': track_artist,
                            'playlists': [content_names[content_id]]
                        }
        
        duplicate_details: List[dict] = []
        
        for track_id, info in first_occurrence.items():
            if len(info['playlists']) > 1:
                duplicate_details.append({
                    'name': info['name'],
                    'artist': info['artist'],
                    'appearedIn': info['playlists'],
                    'type': 'cross'
                })
        
        if keep_it_tidy:
            for track_id, count in intra_duplicate_counts.items():
                if track_id in first_occurrence:
                    info = first_occurrence[track_id]
                    duplicate_details.append({
                        'name': info['name'],
                        'artist': info['artist'],
                        'appearedIn': f"{info['playlists'][0]} ({count + 1}x)",
                        'type': 'intra'
                    })
        
        duplicate_details.sort(key=lambda x: x['name'].lower())
        duplicates_returned = duplicate_details[:MAX_DUPLICATES_RETURNED]
        
        if keep_it_tidy:
            total_duplicates = cross_playlist_duplicates + intra_playlist_duplicates
        else:
            total_duplicates = cross_playlist_duplicates
        
        logger.info(f"Total fetched: {total_fetched}, Unique: {len(all_tracks)}, "
                   f"Cross-playlist dupes: {cross_playlist_duplicates}, Intra-playlist dupes: {intra_playlist_duplicates}")
        
        if not all_tracks:
            raise Exception("No tracks found in the selected content")
        
        was_truncated = len(all_tracks) > TRACK_LIMIT
        truncated_count = max(0, len(all_tracks) - TRACK_LIMIT)
        if was_truncated:
            all_tracks = all_tracks[:TRACK_LIMIT]
            logger.info(f"Truncated tracks from {len(all_tracks) + truncated_count} to {TRACK_LIMIT}")
        
        if total_duplicates > 0:
            if intra_playlist_duplicates > 0 and keep_it_tidy:
                await send_progress(
                    f"Found {len(all_tracks)} unique tracks ({total_duplicates} duplicates removed, "
                    f"including {intra_playlist_duplicates} within content)",
                    50
                )
            else:
                await send_progress(f"Found {len(all_tracks)} unique tracks ({total_duplicates} duplicates removed)", 50)
        else:
            await send_progress(f"Found {len(all_tracks)} unique tracks", 50)
        
        await send_progress("Creating new playlist...", 60)
        new_playlist = await to_thread.run_sync(
            tidal_service.tidal_service.create_playlist, new_playlist_name
        )
        new_playlist_id = new_playlist['id']
        
        await send_progress(f"Adding {len(all_tracks)} tracks to playlist...", 70)
        
        batch_progress_holder = {'current': 0, 'total': 1}
        main_loop = asyncio.get_running_loop()
        
        async def report_batch_progress():
            total = batch_progress_holder.get('total', 1)
            current = batch_progress_holder.get('current', 0)
            if total > 0:
                progress_val = 70 + ((current / total) * 25)
                await send_progress(f"Adding tracks (batch {current}/{total})...", progress_val)
        
        def sync_batch_progress(batch: int, total: int):
            batch_progress_holder['current'] = batch
            batch_progress_holder['total'] = total
            main_loop.call_soon_threadsafe(
                lambda: asyncio.create_task(report_batch_progress())
            )
        
        try:
            await to_thread.run_sync(
                tidal_service.tidal_service.add_tracks_to_playlist, new_playlist_id, all_tracks, sync_batch_progress
            )
        except Exception as e:
            logger.error(f"Failed to add tracks, cleaning up playlist {new_playlist_id}: {e}")
            await send_progress("Merge failed, cleaning up...", 0)
            await to_thread.run_sync(
                tidal_service.tidal_service.delete_playlist, new_playlist_id
            )
            raise Exception(f"Failed to add tracks to playlist: {str(e)}")
        
        await send_progress("Complete!", 100)
        
        logger.info(f"Merge complete: {len(all_tracks)} tracks in playlist {new_playlist_id}")
        
        return {
            'id': new_playlist_id,
            'trackCount': len(all_tracks),
            'totalFetched': total_fetched,
            'duplicatesRemoved': total_duplicates,
            'crossPlaylistDuplicates': cross_playlist_duplicates,
            'intraPlaylistDuplicates': intra_playlist_duplicates,
            'playlistCounts': content_track_counts,
            'duplicates': duplicates_returned,
            'totalDuplicateTracks': len(duplicate_details),
            'wasTruncated': was_truncated,
            'truncatedCount': truncated_count
        }


merge_service = MergeService()
