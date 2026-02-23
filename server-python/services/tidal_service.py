import logging
from typing import List

from config import BATCH_SIZE

logger = logging.getLogger(__name__)

class TidalService:
    def _get_session(self):
        from . import auth_service
        session = auth_service.get_session_object()
        if session is None:
            raise Exception('Not authenticated. Please log in again.')
        return session
    
    def get_album_by_id(self, album_id: str) -> dict:
        session = self._get_session()
        
        try:
            album = session.album(album_id)
            
            cover_url = None
            try:
                if hasattr(album, 'img_uuid') and album.img_uuid:
                    cover_url = album.image(320)
                elif hasattr(album, 'cover') and album.cover:
                    uuid = album.cover.replace('-', '/')
                    cover_url = f"https://resources.tidal.com/images/{uuid}/320x320.jpg"
            except Exception as e:
                logger.info(f"Could not get album cover: {e}")
            
            return {
                'id': f"album_{album.id}",
                'name': f"{album.name} (Album)",
                'trackCount': album.num_tracks if hasattr(album, 'num_tracks') else 0,
                'coverUrl': cover_url,
                'fallbackCovers': [],
                'description': f"Album by {album.artist.name if hasattr(album, 'artist') and album.artist else 'Unknown Artist'}"
            }
        except Exception as e:
            logger.error(f"Error fetching album {album_id}: {e}")
            raise Exception(f'Failed to fetch album: {str(e)}')
            
    def get_mix_by_id(self, mix_id: str) -> dict:
        session = self._get_session()
        
        try:
            mix = session.mix(mix_id)
            
            cover_url = None
            try:
                if hasattr(mix, 'image') and mix.image:
                    cover_url = mix.image
            except Exception as e:
                logger.info(f"Could not get mix cover: {e}")
            
            return {
                'id': f"mix_{mix.id}",
                'name': mix.title if hasattr(mix, 'title') else f"Mix {mix_id}",
                'trackCount': None,
                'coverUrl': cover_url,
                'fallbackCovers': [],
                'description': mix.sub_title if hasattr(mix, 'sub_title') else "TIDAL Mix"
            }
        except Exception as e:
            logger.error(f"Error fetching mix {mix_id}: {e}")
            raise Exception(f'Failed to fetch mix: {str(e)}')

    def get_playlist_by_id(self, playlist_id: str) -> dict:
        session = self._get_session()
        
        try:
            playlist = session.playlist(playlist_id)
            
            cover_url = None
            fallback_covers = []
            
            try:
                if hasattr(playlist, 'img_uuid') and playlist.img_uuid:
                    cover_url = playlist.picture(320, 320)
            except Exception as e:
                logger.info(f"Could not get playlist cover: {e}")
            
            if not cover_url:
                try:
                    tracks = playlist.tracks(limit=50)
                    seen_covers = set()
                    for track in tracks:
                        if len(fallback_covers) >= 4:
                            break
                        if hasattr(track, 'album') and track.album:
                            album = track.album
                            album_cover = None
                            if hasattr(album, 'img_uuid') and album.img_uuid:
                                album_cover = album.image(160)
                            elif hasattr(album, 'cover') and album.cover:
                                uuid = album.cover.replace('-', '/')
                                album_cover = f"https://resources.tidal.com/images/{uuid}/160x160.jpg"
                            if album_cover and album_cover not in seen_covers:
                                seen_covers.add(album_cover)
                                fallback_covers.append(album_cover)
                except Exception as e:
                    logger.info(f"Could not get fallback covers: {e}")
            
            return {
                'id': playlist.id,
                'name': playlist.name,
                'trackCount': playlist.num_tracks if hasattr(playlist, 'num_tracks') else 0,
                'coverUrl': cover_url,
                'fallbackCovers': fallback_covers,
                'description': playlist.description if hasattr(playlist, 'description') else None
            }
        except Exception as e:
            logger.error(f"Error fetching playlist {playlist_id}: {e}")
            raise Exception(f'Failed to fetch playlist: {str(e)}')
    
    def get_playlist_tracks(self, resource_id: str) -> List[dict]:
        session = self._get_session()
        
        try:
            if resource_id == 'my-favorites':
                try:
                    all_tracks = []
                    tracks = session.user.favorites.tracks()
                    
                    result = []
                    for track in tracks:
                        result.append({
                            'id': str(track.id),
                            'name': track.name,
                            'artist': track.artist.name if hasattr(track, 'artist') and track.artist else 'Unknown Artist'
                        })
                    
                    logger.info(f"Fetched {len(result)} favorite tracks")
                    return result
                except Exception as e:
                    logger.error(f"Error fetching favorite tracks: {e}")
                    raise Exception(f'Failed to fetch favorite tracks: {str(e)}')
            
            if resource_id.startswith('album_'):
                resource = session.album(resource_id.replace('album_', ''))
            elif resource_id.startswith('mix_'):
                resource = session.mix(resource_id.replace('mix_', ''))
            else:
                resource = session.playlist(resource_id)
            
            all_tracks = []
            
            if hasattr(resource, 'items'):
                # Handle Mix
                items = resource.items()
                # Mix.items returns a list of items directly usually
                for item in items:
                    if hasattr(item, 'item'):
                        track = item.item
                    else:
                        track = item
                    all_tracks.append(track)
            elif hasattr(resource, 'tracks'):
                # Handle Playlist or Album
                offset = 0
                limit = 100
                
                while True:
                    try:
                        tracks = resource.tracks(limit=limit, offset=offset)
                    except TypeError:
                        # Some endpoints don't support limit/offset
                        tracks = resource.tracks()
                        if tracks:
                            all_tracks.extend(tracks)
                        break
                        
                    if not tracks:
                        break
                    all_tracks.extend(tracks)
                    if len(tracks) < limit:
                        break
                    offset += limit
            
            result = []
            for track in all_tracks:
                if hasattr(track, 'id'):
                    result.append({
                        'id': str(track.id),
                        'name': track.name if hasattr(track, 'name') else 'Unknown',
                        'artist': track.artist.name if hasattr(track, 'artist') and track.artist else 'Unknown Artist'
                    })
            
            logger.info(f"Fetched {len(result)} tracks from {resource_id}")
            return result
        except Exception as e:
            logger.error(f"Error fetching tracks: {e}")
            raise Exception(f'Failed to fetch tracks: {str(e)}')
    
    def create_playlist(self, title: str, description: str = '') -> dict:
        session = self._get_session()
        
        try:
            user = session.user
            playlist = user.create_playlist(title, description)
            
            logger.info(f"Created playlist: {playlist.id} - {title}")
            return {
                'id': playlist.id,
                'name': playlist.name
            }
        except Exception as e:
            logger.error(f"Error creating playlist: {e}")
            raise Exception(f'Failed to create playlist: {str(e)}')
    
    def add_tracks_to_playlist(self, playlist_id: str, track_ids: List[str], on_progress=None) -> None:
        if not track_ids:
            logger.warning("No tracks to add")
            return
        
        session = self._get_session()
        total_batches = (len(track_ids) + BATCH_SIZE - 1) // BATCH_SIZE
        
        try:
            playlist = session.playlist(playlist_id)
            
            for i in range(0, len(track_ids), BATCH_SIZE):
                batch = track_ids[i:i + BATCH_SIZE]
                current_batch = (i // BATCH_SIZE) + 1
                
                if on_progress:
                    on_progress(current_batch, total_batches)
                
                int_ids = []
                for tid in batch:
                    try:
                        int_ids.append(int(tid))
                    except ValueError:
                        logger.warning(f"Could not convert track ID to int: {tid}")
                
                if int_ids:
                    playlist.add(int_ids)
                    logger.info(f"Added batch {current_batch}/{total_batches}: {len(int_ids)} tracks")
        except Exception as e:
            logger.error(f"Error adding tracks: {e}")
            raise Exception(f'Failed to add tracks: {str(e)}')
    
    def get_user_playlists(self) -> List[dict]:
        session = self._get_session()
        
        try:
            playlists = session.user.playlists()
            
            result = []
            
            # Add "My Favorites" as the first pseudo-playlist
            result.append({
                'id': 'my-favorites',
                'name': 'My Favorite Tracks',
                'trackCount': None, # We might not know the exact count without fetching
                'coverUrl': None,
                'fallbackCovers': [],
                'description': 'Your favorite tracks on TIDAL'
            })
            
            for p in playlists:
                cover_url = None
                try:
                    if hasattr(p, 'img_uuid') and p.img_uuid:
                        cover_url = p.picture(320, 320)
                except:
                    pass
                
                result.append({
                    'id': p.id,
                    'name': p.name,
                    'trackCount': p.num_tracks if hasattr(p, 'num_tracks') else 0,
                    'coverUrl': cover_url,
                    'fallbackCovers': [],
                    'description': p.description if hasattr(p, 'description') else None
                })
            
            return result
        except Exception as e:
            logger.error(f"Error fetching user playlists: {e}")
            raise Exception(f'Failed to fetch user playlists: {str(e)}')

    def delete_playlist(self, playlist_id: str) -> bool:
        session = self._get_session()
        
        try:
            playlist = session.playlist(playlist_id)
            playlist.delete()
            logger.info(f"Deleted playlist: {playlist_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting playlist {playlist_id}: {e}")
            return False
