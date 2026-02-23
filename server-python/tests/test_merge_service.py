import pytest
from unittest.mock import Mock, patch, AsyncMock
import asyncio

from services.merge_service import MergeService


class TestMergeService:
    @pytest.fixture
    def merge_service(self):
        return MergeService()

    @pytest.fixture
    def mock_tidal_service(self):
        mock = Mock()
        mock.get_playlist_by_id = Mock(return_value={
            'id': 'playlist-1',
            'name': 'Test Playlist',
            'trackCount': 3,
            'coverUrl': None,
            'fallbackCovers': []
        })
        mock.get_playlist_tracks = Mock(return_value=[
            {'id': 'track-1', 'name': 'Song 1', 'artist': 'Artist 1'},
            {'id': 'track-2', 'name': 'Song 2', 'artist': 'Artist 2'},
            {'id': 'track-3', 'name': 'Song 3', 'artist': 'Artist 3'},
        ])
        mock.create_playlist = Mock(return_value={
            'id': 'new-playlist-id',
            'name': 'Merged Playlist'
        })
        mock.add_tracks_to_playlist = Mock()
        return mock

    @pytest.mark.asyncio
    async def test_merge_playlists_basic(self, merge_service, mock_tidal_service):
        progress_data = []
        
        async def capture_progress(data):
            progress_data.append(data)

        with patch('services.tidal_service', mock_tidal_service):
            result = await merge_service.merge_playlists(
                playlist_ids=['playlist-1'],
                new_playlist_name='Merged Playlist',
                on_progress=capture_progress,
                keep_it_tidy=False
            )

        assert result['trackCount'] == 3
        assert result['duplicatesRemoved'] == 0
        assert result['totalFetched'] == 3
        mock_tidal_service.create_playlist.assert_called_once()

    @pytest.mark.asyncio
    async def test_cross_playlist_duplicate_detection(self, merge_service):
        mock = Mock()
        mock.get_playlist_by_id = Mock(return_value={
            'id': 'playlist-1',
            'name': 'Test Playlist',
            'trackCount': 2,
            'coverUrl': None,
            'fallbackCovers': []
        })
        mock.get_playlist_tracks = Mock(side_effect=[
            [{'id': 'track-1', 'name': 'Song 1', 'artist': 'Artist 1'}],
            [{'id': 'track-1', 'name': 'Song 1', 'artist': 'Artist 1'}],
        ])
        mock.create_playlist = Mock(return_value={'id': 'new-playlist-id', 'name': 'Merged'})
        mock.add_tracks_to_playlist = Mock()

        with patch('services.tidal_service', mock):
            result = await merge_service.merge_playlists(
                playlist_ids=['playlist-1', 'playlist-2'],
                new_playlist_name='Merged Playlist',
                on_progress=None,
                keep_it_tidy=False
            )

        assert result['trackCount'] == 1
        assert result['crossPlaylistDuplicates'] == 1
        assert result['duplicatesRemoved'] == 1

    @pytest.mark.asyncio
    async def test_intra_playlist_duplicate_with_deep_clean(self, merge_service):
        mock = Mock()
        mock.get_playlist_by_id = Mock(return_value={
            'id': 'playlist-1',
            'name': 'Test Playlist',
            'trackCount': 2,
            'coverUrl': None,
            'fallbackCovers': []
        })
        mock.get_playlist_tracks = Mock(return_value=[
            {'id': 'track-1', 'name': 'Song 1', 'artist': 'Artist 1'},
            {'id': 'track-1', 'name': 'Song 1', 'artist': 'Artist 1'},
        ])
        mock.create_playlist = Mock(return_value={'id': 'new-playlist-id', 'name': 'Merged'})
        mock.add_tracks_to_playlist = Mock()

        with patch('services.tidal_service', mock):
            result = await merge_service.merge_playlists(
                playlist_ids=['playlist-1'],
                new_playlist_name='Merged Playlist',
                on_progress=None,
                keep_it_tidy=True
            )

        assert result['trackCount'] == 1
        assert result['intraPlaylistDuplicates'] == 1
        assert result['duplicatesRemoved'] == 1

    @pytest.mark.asyncio
    async def test_intra_playlist_duplicate_without_deep_clean(self, merge_service):
        mock = Mock()
        mock.get_playlist_by_id = Mock(return_value={
            'id': 'playlist-1',
            'name': 'Test Playlist',
            'trackCount': 2,
            'coverUrl': None,
            'fallbackCovers': []
        })
        mock.get_playlist_tracks = Mock(return_value=[
            {'id': 'track-1', 'name': 'Song 1', 'artist': 'Artist 1'},
            {'id': 'track-1', 'name': 'Song 1', 'artist': 'Artist 1'},
        ])
        mock.create_playlist = Mock(return_value={'id': 'new-playlist-id', 'name': 'Merged'})
        mock.add_tracks_to_playlist = Mock()

        with patch('services.tidal_service', mock):
            result = await merge_service.merge_playlists(
                playlist_ids=['playlist-1'],
                new_playlist_name='Merged Playlist',
                on_progress=None,
                keep_it_tidy=False
            )

        assert result['trackCount'] == 2
        assert result['intraPlaylistDuplicates'] == 1
        assert result['duplicatesRemoved'] == 0

    @pytest.mark.asyncio
    async def test_empty_playlists_raises(self, merge_service):
        mock = Mock()
        mock.get_playlist_by_id = Mock(return_value={
            'id': 'playlist-1',
            'name': 'Empty Playlist',
            'trackCount': 0,
            'coverUrl': None,
            'fallbackCovers': []
        })
        mock.get_playlist_tracks = Mock(return_value=[])

        with patch('services.tidal_service', mock):
            with pytest.raises(Exception, match="No tracks found"):
                await merge_service.merge_playlists(
                    playlist_ids=['playlist-1'],
                    new_playlist_name='Merged Playlist',
                    on_progress=None,
                    keep_it_tidy=False
                )

    @pytest.mark.asyncio
    async def test_track_limit_truncation(self, merge_service):
        mock = Mock()
        mock.get_playlist_by_id = Mock(return_value={
            'id': 'playlist-1',
            'name': 'Large Playlist',
            'trackCount': 12000,
            'coverUrl': None,
            'fallbackCovers': []
        })
        tracks = [{'id': f'track-{i}', 'name': f'Song {i}', 'artist': 'Artist'} for i in range(12000)]
        mock.get_playlist_tracks = Mock(return_value=tracks)
        mock.create_playlist = Mock(return_value={'id': 'new-playlist-id', 'name': 'Merged'})
        mock.add_tracks_to_playlist = Mock()

        with patch('services.tidal_service', mock):
            result = await merge_service.merge_playlists(
                playlist_ids=['playlist-1'],
                new_playlist_name='Merged Playlist',
                on_progress=None,
                keep_it_tidy=False
            )

        assert result['wasTruncated'] is True
        assert result['trackCount'] == 10000
        assert result['truncatedCount'] == 2000
