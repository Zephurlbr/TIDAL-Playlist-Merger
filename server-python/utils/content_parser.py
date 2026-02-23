import re
from typing import Literal, TypedDict, Optional

ContentType = Literal['playlist', 'album', 'mix', 'artist', 'track']
InputType = Literal['url', 'id', 'search']


class ParseResult(TypedDict):
    type: InputType
    id: Optional[str]
    content_type: Optional[ContentType]
    query: Optional[str]


CONTENT_URL_PATTERNS = {
    'playlist': [
        re.compile(r'listen\.tidal\.com/playlist/([a-zA-Z0-9-]+)', re.I),
        re.compile(r'tidal\.com/(?:browse/)?playlist/([a-zA-Z0-9-]+)', re.I),
    ],
    'album': [
        re.compile(r'listen\.tidal\.com/album/(\d+)', re.I),
        re.compile(r'tidal\.com/(?:browse/)?album/(\d+)', re.I),
    ],
    'mix': [
        re.compile(r'listen\.tidal\.com/mix/([a-zA-Z0-9-]+)', re.I),
        re.compile(r'tidal\.com/(?:browse/)?mix/([a-zA-Z0-9-]+)', re.I),
    ],
    'artist': [
        re.compile(r'listen\.tidal\.com/artist/(\d+)', re.I),
        re.compile(r'tidal\.com/(?:browse/)?artist/(\d+)', re.I),
    ],
    'track': [
        re.compile(r'listen\.tidal\.com/track/(\d+)', re.I),
        re.compile(r'tidal\.com/(?:browse/)?track/(\d+)', re.I),
    ],
}

RAW_ID_PATTERNS = {
    'playlist': re.compile(r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$', re.I),
    'album': re.compile(r'^\d{6,}$'),
    'mix': re.compile(r'^[a-zA-Z0-9]{20,}$'),
}


def parse_content(input_str: str) -> ParseResult:
    """
    Parse input and determine if it's a URL, raw ID, or search query.
    
    Returns:
        {'type': 'url', 'id': '...', 'content_type': 'playlist'}
        {'type': 'id', 'id': '...'}  # Needs type resolution
        {'type': 'search', 'query': '...'}
    """
    trimmed = input_str.strip()
    
    if not trimmed:
        return {'type': 'search', 'query': '', 'id': None, 'content_type': None}
    
    for content_type, patterns in CONTENT_URL_PATTERNS.items():
        for pattern in patterns:
            match = pattern.search(trimmed)
            if match and match.group(1):
                return {
                    'type': 'url',
                    'id': match.group(1),
                    'content_type': content_type,
                    'query': None
                }
    
    for content_type, pattern in RAW_ID_PATTERNS.items():
        if pattern.match(trimmed):
            return {
                'type': 'id',
                'id': trimmed,
                'content_type': None,
                'query': None
            }
    
    return {
        'type': 'search',
        'query': trimmed,
        'id': None,
        'content_type': None
    }


def extract_playlist_id(input_str: str) -> dict:
    """
    Legacy function for backward compatibility.
    Extracts playlist ID from URL or raw ID.
    """
    result = parse_content(input_str)
    
    if result['type'] == 'url' and result['content_type'] == 'playlist':
        return {'success': True, 'id': result['id']}
    
    if result['type'] == 'id':
        if RAW_ID_PATTERNS['playlist'].match(input_str.strip()):
            return {'success': True, 'id': result['id']}
    
    if result['type'] == 'search':
        return {'success': False, 'error': 'Invalid playlist URL format'}
    
    return {'success': False, 'error': f'Expected playlist URL, got {result.get("content_type", "unknown")} URL'}
