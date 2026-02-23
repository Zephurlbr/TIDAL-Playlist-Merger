import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv('PORT', 8000))
TIDAL_COUNTRY_CODE = os.getenv('TIDAL_COUNTRY_CODE', 'US')
CLIENT_URL = os.getenv('CLIENT_URL', 'http://localhost:8000')
TOKEN_FILE = os.getenv('TOKEN_FILE', 'tidal_session.json')

BATCH_SIZE = int(os.getenv('BATCH_SIZE', 50))
TRACK_LIMIT = int(os.getenv('TRACK_LIMIT', 10000))
MAX_DUPLICATES_RETURNED = int(os.getenv('MAX_DUPLICATES_RETURNED', 200))
MAX_PLAYLISTS = int(os.getenv('MAX_PLAYLISTS', 200))
