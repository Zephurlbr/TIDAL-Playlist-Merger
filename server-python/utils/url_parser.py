import re
from typing import Optional, Dict, Any

PLAYLIST_PATTERNS = [
    re.compile(r'listen\.tidal\.com/playlist/([a-zA-Z0-9-]+)', re.I),
    re.compile(r'tidal\.com/.*playlist/([a-zA-Z0-9-]+)', re.I),
    re.compile(r'tidal\.com/playlist/([a-zA-Z0-9-]+)', re.I),
    re.compile(r'^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$', re.I),
    re.compile(r'^([a-zA-Z0-9-]{20,})$')
]

ALBUM_PATTERNS = [
    re.compile(r'listen\.tidal\.com/album/([0-9]+)', re.I),
    re.compile(r'tidal\.com/.*album/([0-9]+)', re.I),
    re.compile(r'tidal\.com/album/([0-9]+)', re.I)
]

MIX_PATTERNS = [
    re.compile(r'listen\.tidal\.com/mix/([a-zA-Z0-9_-]+)', re.I),
    re.compile(r'tidal\.com/.*mix/([a-zA-Z0-9_-]+)', re.I),
    re.compile(r'tidal\.com/mix/([a-zA-Z0-9_-]+)', re.I)
]

def extract_playlist_id(input_str: str) -> Dict[str, Any]:
    trimmed = input_str.strip()
    
    for pattern in PLAYLIST_PATTERNS:
        match = pattern.search(trimmed)
        if match and match.group(1):
            return {'success': True, 'id': match.group(1), 'type': 'playlist'}
            
    for pattern in ALBUM_PATTERNS:
        match = pattern.search(trimmed)
        if match and match.group(1):
            return {'success': True, 'id': match.group(1), 'type': 'album'}
            
    for pattern in MIX_PATTERNS:
        match = pattern.search(trimmed)
        if match and match.group(1):
            mix_id = match.group(1)
            if mix_id.startswith('mix_'):
                mix_id = mix_id[4:]
            return {'success': True, 'id': mix_id, 'type': 'mix'}
    
    return {'success': False, 'error': 'Invalid playlist URL format'}
