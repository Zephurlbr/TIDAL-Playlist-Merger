import pytest
from utils.url_parser import extract_playlist_id


class TestUrlParser:
    def test_listen_tidal_url(self):
        result = extract_playlist_id('https://listen.tidal.com/playlist/abc123-def456')
        assert result['success'] is True
        assert result['id'] == 'abc123-def456'

    def test_tidal_browse_url(self):
        result = extract_playlist_id('https://tidal.com/browse/playlist/abc123-def456')
        assert result['success'] is True
        assert result['id'] == 'abc123-def456'

    def test_tidal_direct_url(self):
        result = extract_playlist_id('https://tidal.com/playlist/abc123-def456')
        assert result['success'] is True
        assert result['id'] == 'abc123-def456'

    def test_raw_uuid(self):
        result = extract_playlist_id('abc123de-f456-7890-abcd-ef1234567890')
        assert result['success'] is True
        assert result['id'] == 'abc123de-f456-7890-abcd-ef1234567890'

    def test_raw_playlist_id(self):
        result = extract_playlist_id('abc123-def456-ghi789-jkl012')
        assert result['success'] is True
        assert result['id'] == 'abc123-def456-ghi789-jkl012'

    def test_invalid_url(self):
        result = extract_playlist_id('https://example.com/playlist/123')
        assert result['success'] is False
        assert 'error' in result

    def test_empty_input(self):
        result = extract_playlist_id('')
        assert result['success'] is False

    def test_whitespace_input(self):
        result = extract_playlist_id('   ')
        assert result['success'] is False

    def test_url_with_whitespace(self):
        result = extract_playlist_id('  https://listen.tidal.com/playlist/abc123  ')
        assert result['success'] is True
        assert result['id'] == 'abc123'
