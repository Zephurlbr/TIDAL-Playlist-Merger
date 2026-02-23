import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

class TidalService:
    def _get_session(self):
        from . import auth_service
        session = auth_service.get_session_object()
        if session is None:
            raise Exception('Not authenticated. Please log in again.')
        return session
    
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
                'description': playlist.description if hasattr(playlist, 'description') else None,
                'contentType': 'playlist',
                'isFavorites': False
            }
        except Exception as e:
            logger.error(f"Error fetching playlist {playlist_id}: {e}")
            raise Exception(f'Failed to fetch playlist: {str(e)}')
    
    def get_playlist_tracks(self, playlist_id: str) -> List[dict]:
        session = self._get_session()
        
        try:
            playlist = session.playlist(playlist_id)
            
            all_tracks = []
            offset = 0
            limit = 100
            
            while True:
                tracks = playlist.tracks(limit=limit, offset=offset)
                if not tracks:
                    break
                all_tracks.extend(tracks)
                if len(tracks) < limit:
                    break
                offset += limit
            
            result = []
            for track in all_tracks:
                result.append({
                    'id': str(track.id),
                    'name': track.name,
                    'artist': track.artist.name if track.artist else 'Unknown Artist'
                })
            
            logger.info(f"Fetched {len(result)} tracks from playlist {playlist_id}")
            return result
        except Exception as e:
            logger.error(f"Error fetching tracks: {e}")
            raise Exception(f'Failed to fetch tracks: {str(e)}')
    
    def get_user_playlists(self) -> List[dict]:
        session = self._get_session()
        
        try:
            user = session.user
            playlists = user.playlists()
            
            result = []
            for playlist in playlists:
                cover_url = None
                fallback_covers = []
                
                try:
                    if hasattr(playlist, 'img_uuid') and playlist.img_uuid:
                        cover_url = playlist.picture(320, 320)
                except Exception as e:
                    logger.debug(f"Could not get playlist cover: {e}")
                
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
                        logger.debug(f"Could not get fallback covers: {e}")
                
                result.append({
                    'id': playlist.id,
                    'name': playlist.name,
                    'trackCount': playlist.num_tracks if hasattr(playlist, 'num_tracks') else 0,
                    'coverUrl': cover_url,
                    'fallbackCovers': fallback_covers,
                    'description': playlist.description if hasattr(playlist, 'description') else None,
                    'contentType': 'playlist',
                    'isFavorites': False
                })
            
            logger.info(f"Fetched {len(result)} user playlists")
            return result
        except Exception as e:
            logger.error(f"Error fetching user playlists: {e}")
            raise Exception(f'Failed to fetch user playlists: {str(e)}')
    
    def get_user_favorites(self) -> dict:
        session = self._get_session()
        
        try:
            user = session.user
            favorites = user.favorites
            
            track_count = 0
            try:
                track_count = favorites.tracks_count()
            except Exception:
                try:
                    track_count = len(favorites.tracks(limit=1000))
                except Exception:
                    pass
            
            fallback_covers = []
            try:
                tracks = favorites.tracks(limit=50)
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
                logger.debug(f"Could not get favorites fallback covers: {e}")
            
            return {
                'id': 'favorites',
                'name': 'Liked Songs',
                'trackCount': track_count,
                'coverUrl': None,
                'fallbackCovers': fallback_covers,
                'description': 'Your favorite tracks',
                'contentType': 'favorites',
                'isFavorites': True
            }
        except Exception as e:
            logger.error(f"Error fetching user favorites: {e}")
            raise Exception(f'Failed to fetch user favorites: {str(e)}')
    
    def get_user_favorites_tracks(self) -> List[dict]:
        session = self._get_session()
        
        try:
            user = session.user
            favorites = user.favorites
            
            all_tracks = []
            offset = 0
            limit = 100
            
            while True:
                tracks = favorites.tracks(limit=limit, offset=offset)
                if not tracks:
                    break
                all_tracks.extend(tracks)
                if len(tracks) < limit:
                    break
                offset += limit
            
            result = []
            for track in all_tracks:
                result.append({
                    'id': str(track.id),
                    'name': track.name,
                    'artist': track.artist.name if track.artist else 'Unknown Artist'
                })
            
            logger.info(f"Fetched {len(result)} favorite tracks")
            return result
        except Exception as e:
            logger.error(f"Error fetching favorite tracks: {e}")
            raise Exception(f'Failed to fetch favorite tracks: {str(e)}')
    
    def get_album_by_id(self, album_id: str) -> dict:
        session = self._get_session()
        
        try:
            album = session.album(album_id)
            
            cover_url = None
            try:
                cover_url = album.image(320)
            except Exception as e:
                logger.debug(f"Could not get album cover: {e}")
            
            artist_name = None
            if hasattr(album, 'artists') and album.artists:
                artist_name = album.artists[0].name
            elif hasattr(album, 'artist') and album.artist:
                artist_name = album.artist.name
            
            track_count = 0
            try:
                track_count = album.num_tracks if hasattr(album, 'num_tracks') else len(album.tracks())
            except Exception:
                pass
            
            return {
                'id': str(album.id),
                'name': album.name,
                'artist': artist_name,
                'trackCount': track_count,
                'coverUrl': cover_url,
                'fallbackCovers': [],
                'year': album.year if hasattr(album, 'year') else None,
                'contentType': 'album',
                'isFavorites': False
            }
        except Exception as e:
            logger.error(f"Error fetching album {album_id}: {e}")
            raise Exception(f'Failed to fetch album: {str(e)}')
    
    def get_album_tracks(self, album_id: str) -> List[dict]:
        session = self._get_session()
        
        try:
            album = session.album(album_id)
            tracks = album.tracks()
            
            result = []
            for track in tracks:
                result.append({
                    'id': str(track.id),
                    'name': track.name,
                    'artist': track.artist.name if track.artist else 'Unknown Artist'
                })
            
            logger.info(f"Fetched {len(result)} tracks from album {album_id}")
            return result
        except Exception as e:
            logger.error(f"Error fetching album tracks: {e}")
            raise Exception(f'Failed to fetch album tracks: {str(e)}')
    
    def get_mix_by_id(self, mix_id: str) -> dict:
        session = self._get_session()
        
        try:
            mix = session.mix(mix_id)
            
            cover_url = None
            fallback_covers = []
            
            try:
                if hasattr(mix, 'image'):
                    cover_url = mix.image(320)
            except Exception as e:
                logger.debug(f"Could not get mix cover: {e}")
            
            track_count = 0
            try:
                items = mix.items()
                track_count = len(items)
                
                seen_covers = set()
                for item in items:
                    if len(fallback_covers) >= 4:
                        break
                    if hasattr(item, 'album') and item.album:
                        album = item.album
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
                logger.debug(f"Could not get mix items: {e}")
            
            return {
                'id': mix.id if hasattr(mix, 'id') else mix_id,
                'name': mix.title if hasattr(mix, 'title') else (mix.name if hasattr(mix, 'name') else 'Unknown Mix'),
                'trackCount': track_count,
                'coverUrl': cover_url,
                'fallbackCovers': fallback_covers,
                'contentType': 'mix',
                'isFavorites': False
            }
        except Exception as e:
            logger.error(f"Error fetching mix {mix_id}: {e}")
            raise Exception(f'Failed to fetch mix: {str(e)}')
    
    def get_mix_tracks(self, mix_id: str) -> List[dict]:
        session = self._get_session()
        
        try:
            mix = session.mix(mix_id)
            items = mix.items()
            
            result = []
            for item in items:
                result.append({
                    'id': str(item.id),
                    'name': item.name,
                    'artist': item.artist.name if item.artist else 'Unknown Artist'
                })
            
            logger.info(f"Fetched {len(result)} tracks from mix {mix_id}")
            return result
        except Exception as e:
            logger.error(f"Error fetching mix tracks: {e}")
            raise Exception(f'Failed to fetch mix tracks: {str(e)}')
    
    def search_content(self, query: str, limit: int = 10, offset: int = 0) -> dict:
        session = self._get_session()
        
        try:
            import tidalapi
            
            search_result = session.search(
                query,
                models=[tidalapi.media.Artist, tidalapi.media.Album, tidalapi.playlist.Playlist],
                limit=limit,
                offset=offset
            )
            
            results = []
            
            if hasattr(search_result, 'playlists') and search_result.playlists:
                for playlist in search_result.playlists:
                    cover_url = None
                    try:
                        if hasattr(playlist, 'img_uuid') and playlist.img_uuid:
                            cover_url = playlist.picture(160, 160)
                    except Exception:
                        pass
                    
                    results.append({
                        'id': playlist.id,
                        'name': playlist.name,
                        'trackCount': playlist.num_tracks if hasattr(playlist, 'num_tracks') else 0,
                        'coverUrl': cover_url,
                        'fallbackCovers': [],
                        'contentType': 'playlist',
                        'isFavorites': False
                    })
            
            if hasattr(search_result, 'albums') and search_result.albums:
                for album in search_result.albums:
                    cover_url = None
                    try:
                        cover_url = album.image(160)
                    except Exception:
                        pass
                    
                    artist_name = None
                    if hasattr(album, 'artists') and album.artists:
                        artist_name = album.artists[0].name
                    elif hasattr(album, 'artist') and album.artist:
                        artist_name = album.artist.name
                    
                    results.append({
                        'id': str(album.id),
                        'name': album.name,
                        'artist': artist_name,
                        'trackCount': album.num_tracks if hasattr(album, 'num_tracks') else 0,
                        'coverUrl': cover_url,
                        'fallbackCovers': [],
                        'contentType': 'album',
                        'isFavorites': False
                    })
            
            total = len(results)
            has_more = total >= limit
            
            return {
                'results': results,
                'total': total,
                'hasMore': has_more
            }
        except Exception as e:
            logger.error(f"Error searching content: {e}")
            raise Exception(f'Failed to search content: {str(e)}')
    
    def resolve_content(self, content_id: str) -> dict:
        """
        Try to resolve an unknown ID by attempting each content type.
        Tries: album (numeric IDs) -> playlist (UUID) -> mix
        """
        errors = []
        
        if content_id.isdigit():
            try:
                return self.get_album_by_id(content_id)
            except Exception as e:
                errors.append(f'album: {str(e)}')
        
        try:
            return self.get_playlist_by_id(content_id)
        except Exception as e:
            errors.append(f'playlist: {str(e)}')
        
        try:
            return self.get_mix_by_id(content_id)
        except Exception as e:
            errors.append(f'mix: {str(e)}')
        
        raise Exception(f'Could not find content with ID {content_id}. Tried: {"; ".join(errors)}')
    
    def get_content_tracks(self, content_id: str, content_type: str) -> List[dict]:
        """
        Generic track fetcher that routes to the appropriate method.
        """
        if content_type == 'playlist':
            return self.get_playlist_tracks(content_id)
        elif content_type == 'album':
            return self.get_album_tracks(content_id)
        elif content_type == 'mix':
            return self.get_mix_tracks(content_id)
        elif content_type == 'favorites':
            return self.get_user_favorites_tracks()
        else:
            raise ValueError(f'Unknown content type: {content_type}')
    
    def get_content_by_type(self, content_id: str, content_type: str) -> dict:
        """
        Get content metadata by type.
        """
        if content_type == 'playlist':
            return self.get_playlist_by_id(content_id)
        elif content_type == 'album':
            return self.get_album_by_id(content_id)
        elif content_type == 'mix':
            return self.get_mix_by_id(content_id)
        elif content_type == 'favorites':
            return self.get_user_favorites()
        else:
            raise ValueError(f'Unknown content type: {content_type}')
    
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
        BATCH_SIZE = 50
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


tidal_service = TidalService()
