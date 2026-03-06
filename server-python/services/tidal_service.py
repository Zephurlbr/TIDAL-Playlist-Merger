import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

class TidalService:
    def _get_track_cover_url(self, track) -> Optional[str]:
        """Extract 320x320 cover URL from a track object."""
        try:
            if hasattr(track, 'album') and track.album:
                album = track.album
                if hasattr(album, 'img_uuid') and album.img_uuid:
                    return album.image(320)
                elif hasattr(album, 'cover') and album.cover:
                    uuid = album.cover.replace('-', '/')
                    return f"https://resources.tidal.com/images/{uuid}/320x320.jpg"
            return None
        except Exception as e:
            logger.info(f"Could not get track cover: {e}")
            return None

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
                # Albums use 'cover' attribute directly
                if hasattr(album, 'cover') and album.cover:
                    uuid = album.cover.replace('-', '/')
                    cover_url = f"https://resources.tidal.com/images/{uuid}/320x320.jpg"
                elif hasattr(album, 'image'):
                    cover_url = album.image(320)
            except Exception as e:
                logger.info(f"Could not get album cover: {e}")
            
            return {
                'id': f"album_{album.id}",
                'name': album.name,
                'trackCount': album.num_tracks if hasattr(album, 'num_tracks') else 0,
                'coverUrl': cover_url,
                'fallbackCovers': [],
                'type': 'album',
                'description': f"Album by {album.artist.name if hasattr(album, 'artist') and album.artist else 'Unknown Artist'}"
            }
        except Exception as e:
            logger.error(f"Error fetching album {album_id}: {e}")
            raise Exception(f'Failed to fetch album: {str(e)}')
    
    def get_mix_by_id(self, mix_id: str) -> dict:
        session = self._get_session()
        
        try:
            mix = session.mix(mix_id)
            
            # Fetch items to get track count
            track_count = 0
            try:
                items = mix.items()
                track_count = len(items) if items else 0
            except Exception as e:
                logger.info(f"Could not get mix track count: {e}")
            
            cover_url = None
            try:
                if hasattr(mix, 'image') and mix.image:
                    cover_url = mix.image(320)
            except Exception as e:
                logger.info(f"Could not get mix cover: {e}")
            
            return {
                'id': f"mix_{mix.id}",
                'name': mix.title if hasattr(mix, 'title') else f"Mix {mix_id}",
                'trackCount': track_count,
                'coverUrl': cover_url,
                'fallbackCovers': [],
                'type': 'mix',
                'description': mix.sub_title if hasattr(mix, 'sub_title') else "TIDAL Mix"
            }
        except Exception as e:
            logger.error(f"Error fetching mix {mix_id}: {e}")
            raise Exception(f'Failed to fetch mix: {str(e)}')
    
    def _get_mix_tracks(self, mix_id: str) -> List[dict]:
        session = self._get_session()
        
        try:
            mix = session.mix(mix_id)
            items = mix.items()
            
            result = []
            for track in items:
                result.append({
                    'id': str(track.id),
                    'name': track.name,
                    'artist': track.artist.name if track.artist else 'Unknown Artist',
                    'coverUrl': self._get_track_cover_url(track)
                })
            
            logger.info(f"Fetched {len(result)} tracks from mix {mix_id}")
            return result
        except Exception as e:
            logger.error(f"Error fetching mix tracks: {e}")
            raise Exception(f'Failed to fetch mix tracks: {str(e)}')
            
    def _get_album_tracks(self, album_id: str) -> List[dict]:
        session = self._get_session()
        
        try:
            album = session.album(album_id)
            tracks = album.tracks()
            
            result = []
            for track in tracks:
                result.append({
                    'id': str(track.id),
                    'name': track.name,
                    'artist': track.artist.name if hasattr(track.artist, 'name') else 'Unknown Artist',
                    'coverUrl': self._get_track_cover_url(track)
                })
            
            logger.info(f"Fetched {len(result)} tracks from album {album_id}")
            return result
        except Exception as e:
            logger.error(f"Error fetching album tracks: {e}")
            raise Exception(f'Failed to fetch tracks: {str(e)}')
    
    def get_playlist_by_id(self, playlist_id: str) -> dict:
        session = self._get_session()
        
        # Special handling for favorites
        if playlist_id == 'my-favorites':
            return self._get_favorites_info()
        
        # Special handling for albums
        if playlist_id.startswith('album_'):
            return self.get_album_by_id(playlist_id[6:])
            
        # Special handling for mixes
        if playlist_id.startswith('mix_'):
            return self.get_mix_by_id(playlist_id[4:])
        
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
                'type': 'playlist',
                'description': playlist.description if hasattr(playlist, 'description') else None
            }
        except Exception as e:
            logger.error(f"Error fetching playlist {playlist_id}: {e}")
            raise Exception(f'Failed to fetch playlist: {str(e)}')
    
    def get_playlist_tracks(self, playlist_id: str) -> List[dict]:
        session = self._get_session()
        
        # Special handling for favorites
        if playlist_id == 'my-favorites':
            return self._get_favorites_tracks()
        
        # Special handling for albums
        if playlist_id.startswith('album_'):
            album_id = playlist_id[6:]
            return self._get_album_tracks(album_id)
            
        # Special handling for mixes
        if playlist_id.startswith('mix_'):
            mix_id = playlist_id[4:]
            return self._get_mix_tracks(mix_id)
        
        try:
            playlist = session.playlist(playlist_id)
            
            # Use limit=None to fetch ALL tracks (no pagination limit)
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
                    'artist': track.artist.name if track.artist else 'Unknown Artist',
                    'coverUrl': self._get_track_cover_url(track)
                })
            
            logger.info(f"Fetched {len(result)} tracks from playlist {playlist_id}")
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
        BATCH_SIZE = 100
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

    def get_user_playlists(self) -> List[dict]:
        session = self._get_session()
        
        try:
            playlists = session.user.playlists()
            
            result = []
            
            # Get favorites data (cover and count)
            favorites = session.user.favorites
            
            # Try to get user avatar
            cover_url = None
            try:
                user = session.user
                # Try different possible attributes for user avatar
                if hasattr(user, 'avatar') and user.avatar:
                    avatar = user.avatar
                    if hasattr(avatar, 'img_uuid') and avatar.img_uuid:
                        cover_url = avatar.picture(320, 320)
                elif hasattr(user, 'picture') and user.picture:
                    cover_url = user.picture(320, 320)
                elif hasattr(user, 'image') and user.image:
                    cover_url = user.image(320, 320)
            except Exception as e:
                logger.info(f"Could not get user avatar: {e}")
            
            # Get fallback covers from favorite tracks
            fallback_covers = []
            try:
                fav_tracks = favorites.tracks(limit=50)
                seen_covers = set()
                for track in fav_tracks:
                    if len(fallback_covers) >= 4:
                        break
                    if hasattr(track, 'album') and track.album:
                        album = track.album
                        if hasattr(album, 'cover') and album.cover:
                            uuid = album.cover.replace('-', '/')
                            album_cover = f"https://resources.tidal.com/images/{uuid}/160x160.jpg"
                            if album_cover and album_cover not in seen_covers:
                                seen_covers.add(album_cover)
                                fallback_covers.append(album_cover)
            except Exception as e:
                logger.info(f"Could not get fallback covers for favorites: {e}")
            
            # Get favorites track count
            fav_count = 0
            try:
                if favorites:
                    # Try to get total from metadata first (most efficient)
                    try:
                        fav_count = favorites.total_num_tracks
                    except AttributeError:
                        # Fallback: iterate through pages to get total
                        fav_tracks = favorites.tracks(limit=1, offset=0)
                        if hasattr(fav_tracks, 'total_number_of_items'):
                            fav_count = fav_tracks.total_number_of_items
                        elif hasattr(fav_tracks, 'total'):
                            fav_count = fav_tracks.total
            except Exception as e:
                logger.info(f"Could not get favorites count: {e}")
            
            # Add "My Favorites" as the first pseudo-playlist
            result.append({
                'id': 'my-favorites',
                'name': 'My Favorite Tracks',
                'trackCount': fav_count,
                'trackCountLoading': True,  # Always load count asynchronously for favorites
                'coverUrl': cover_url,
                'fallbackCovers': fallback_covers,
                'type': 'favorites',
                'description': 'Your favorite tracks on TIDAL'
            })
            
            for p in playlists:
                cover_url = None
                fallback_covers = []
                
                try:
                    if hasattr(p, 'img_uuid') and p.img_uuid:
                        cover_url = p.picture(320, 320)
                except:
                    pass
                
                # Add fallback covers from tracks if no playlist cover
                if not cover_url:
                    try:
                        tracks = p.tracks(limit=50)
                        seen_covers = set()
                        for track in tracks:
                            if len(fallback_covers) >= 4:
                                break
                            if hasattr(track, 'album') and track.album:
                                album = track.album
                                album_cover = None
                                if hasattr(album, 'cover') and album.cover:
                                    uuid = album.cover.replace('-', '/')
                                    album_cover = f"https://resources.tidal.com/images/{uuid}/160x160.jpg"
                                if album_cover and album_cover not in seen_covers:
                                    seen_covers.add(album_cover)
                                    fallback_covers.append(album_cover)
                    except Exception as e:
                        logger.info(f"Could not get fallback covers for playlist {p.id}: {e}")
                
                result.append({
                    'id': p.id,
                    'name': p.name,
                    'trackCount': p.num_tracks if hasattr(p, 'num_tracks') else 0,
                    'coverUrl': cover_url,
                    'fallbackCovers': fallback_covers,
                    'type': 'playlist',
                    'description': p.description if hasattr(p, 'description') else None
                })
            
            return result
        except Exception as e:
            logger.error(f"Error fetching user playlists: {e}")
            raise Exception(f'Failed to fetch user playlists: {str(e)}')

    def get_favorites_count(self) -> dict:
        """Get favorite tracks count using library method."""
        session = self._get_session()
        favorites = session.user.favorites
        
        try:
            # Try lightweight tracks_count() method first
            try:
                count = favorites.tracks_count()
                return {'count': count}
            except AttributeError:
                # Fallback: use library method with high limit
                tracks = favorites.tracks(limit=9999, offset=0)
                return {'count': len(tracks)}
        except Exception as e:
            logger.error(f"Error getting favorites count: {e}")
            return {'count': 0, 'error': str(e)}
    
    def _get_favorites_info(self) -> dict:
        """Get favorites playlist info (name, cover, track count)."""
        session = self._get_session()
        favorites = session.user.favorites
        
        # Get user avatar
        cover_url = None
        try:
            user = session.user
            if hasattr(user, 'avatar') and user.avatar:
                cover_url = user.avatar.picture(320, 320)
            elif hasattr(user, 'picture') and user.picture:
                cover_url = user.picture(320, 320)
            elif hasattr(user, 'image') and user.image:
                cover_url = user.image(320, 320)
        except Exception as e:
            logger.info(f"Could not get user avatar: {e}")
        
        # Get fallback covers from tracks
        fallback_covers = []
        try:
            fav_tracks = favorites.tracks(limit=50)
            seen_covers = set()
            for track in fav_tracks:
                if len(fallback_covers) >= 4:
                    break
                if hasattr(track, 'album') and track.album:
                    album = track.album
                    if hasattr(album, 'cover') and album.cover:
                        uuid = album.cover.replace('-', '/')
                        album_cover = f"https://resources.tidal.com/images/{uuid}/160x160.jpg"
                        if album_cover and album_cover not in seen_covers:
                            seen_covers.add(album_cover)
                            fallback_covers.append(album_cover)
        except Exception as e:
            logger.info(f"Could not get fallback covers for favorites: {e}")
        
        # Get track count using library method
        track_count = 0
        try:
            track_count = favorites.tracks_count()
        except AttributeError:
            try:
                # Fallback: fetch tracks with high limit
                tracks = favorites.tracks(limit=9999, offset=0)
                track_count = len(tracks)
            except Exception as e2:
                logger.info(f"Could not get favorites track count: {e2}")
        
        return {
            'id': 'my-favorites',
            'name': 'My Favorite Tracks',
            'trackCount': track_count,
            'coverUrl': cover_url,
            'fallbackCovers': fallback_covers,
            'type': 'favorites',
            'description': 'Your favorite tracks on TIDAL'
        }
    
    def _get_favorites_tracks(self) -> List[dict]:
        """Get all favorite tracks using library method."""
        session = self._get_session()
        favorites = session.user.favorites
        
        # Use high limit to fetch all tracks
        tracks = favorites.tracks(limit=9999, offset=0)
        
        result = []
        for track in tracks:
            artist_name = 'Unknown Artist'
            if track.artist:
                if hasattr(track.artist, 'name'):
                    artist_name = track.artist.name
                elif isinstance(track.artist, list) and len(track.artist) > 0:
                    artist_name = track.artist[0].name if hasattr(track.artist[0], 'name') else str(track.artist[0])
            
            result.append({
                'id': str(track.id),
                'name': track.name,
                'artist': artist_name,
                'coverUrl': self._get_track_cover_url(track)
            })
        
        logger.info(f"Fetched {len(result)} favorite tracks")
        return result
