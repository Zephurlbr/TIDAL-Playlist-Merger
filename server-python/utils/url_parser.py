import re
from typing import Optional, Dict, Any

PLAYLIST_PATTERNS = [
    re.compile(r'listen\.tidal\.com/playlist/([a-zA-Z0-9-]+)', re.I),
    re.compile(r'tidal\.com/.*playlist/([a-zA-Z0-9-]+)', re.I),
    re.compile(r'tidal\.com/playlist/([a-zA-Z0-9-]+)', re.I),
    re.compile(r'^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$', re.I)
]

ALBUM_PATTERNS = [
    re.compile(r'listen\.tidal\.com/album/([0-9]+)', re.I),
    re.compile(r'tidal\.com/.*album/([0-9]+)', re.I),
    re.compile(r'tidal\.com/album/([0-9]+)', re.I)
]

MIX_PATTERNS = [
    re.compile(r'listen\.tidal\.com/mix/([a-zA-Z0-9-]+)', re.I),
    re.compile(r'tidal\.com/.*mix/([a-zA-Z0-9-]+)', re.I),
    re.compile(r'tidal\.com/mix/([a-zA-Z0-9-]+)', re.I)
]

GENERIC_ID_PATTERN = re.compile(r'^([a-zA-Z0-9-]{5,})$')

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
            return {'success': True, 'id': match.group(1), 'type': 'mix'}
            
    # Fallback for just IDs
    match = GENERIC_ID_PATTERN.search(trimmed)
    if match and match.group(1):
        id_str = match.group(1)
        if id_str.isdigit():
            return {'success': True, 'id': id_str, 'type': 'album'}
        else:
            # We assume it's a playlist or mix by default if it has letters/dashes
            return {'success': True, 'id': id_str, 'type': 'playlist'}
    
    return {'success': False, 'error': 'Invalid URL or ID format'}
