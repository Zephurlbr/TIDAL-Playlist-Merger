import re
from typing import Optional

PATTERNS = [
    re.compile(r'listen\.tidal\.com/playlist/([a-zA-Z0-9-]+)', re.I),
    re.compile(r'tidal\.com/.*playlist/([a-zA-Z0-9-]+)', re.I),
    re.compile(r'tidal\.com/playlist/([a-zA-Z0-9-]+)', re.I),
    re.compile(r'^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$', re.I),
    re.compile(r'^([a-zA-Z0-9-]{20,})$')
]

def extract_playlist_id(input_str: str) -> dict:
    trimmed = input_str.strip()
    
    for pattern in PATTERNS:
        match = pattern.search(trimmed)
        if match and match.group(1):
            return {'success': True, 'id': match.group(1)}
    
    return {'success': False, 'error': 'Invalid playlist URL format'}
