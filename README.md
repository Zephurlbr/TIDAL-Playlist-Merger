# TIDAL Playlist Merger (ALT Version)

This is the **alternative version** that uses the **unofficial TIDAL API** via the `tidalapi` library. This approach bypasses the official TIDAL Developer Portal entirely.

## Why This Version?

| Feature | Official API | This Version (Unofficial) |
|---------|--------------|---------------------------|
| Dev Portal Required | Yes | **No** |
| Client ID/Secret | Required | **Not needed** |
| Scope Limitations | Yes (no `r_usr`) | **Full access** |
| Playlist Operations | Limited | **Full CRUD** |
| App Registration | Required | **Not needed** |

---

## Quick Start

### Prerequisites

- **Python 3.9+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **A TIDAL account** - [Sign up](https://tidal.com)

### One-Command Launch

**Windows:**
```bash
start.bat
```

**macOS/Linux:**
```bash
chmod +x start.sh
./start.sh
```

The script will:
1. Check for Python and Node.js
2. Install dependencies automatically
3. Build and start the app
4. Open http://localhost:8000 in your browser

---

## Manual Setup

If you prefer manual setup or the script doesn't work:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd tidal-playlist-merger-alt

# 2. Install backend dependencies
cd server-python
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# 3. Build frontend
cd ../client
npm install
npm run build

# 4. Start server (serves both API and frontend)
cd ../server-python
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# 5. Open http://localhost:8000
```

---

## Using the App

### Authentication

1. **Click "Connect with TIDAL"** button on the welcome screen

2. **A login URL will appear** in this format:
   ```
   link.tidal.com/ABC123
   Code: ABC123
   ```

3. **Click the link** or manually visit `https://link.tidal.com/ABC123` in a new tab

4. **Log in to your TIDAL account** and click "Allow" to authorize

5. **Return to the app** - it will automatically detect successful authentication
   
   The page will refresh and show the main interface.

### Merging Playlists

1. **Paste a playlist URL** into the input field and press Enter
   
   Example URLs:
   ```
   https://listen.tidal.com/playlist/a1b2c3d4-e5f6-7890-abcd-ef1234567890
   https://tidal.com/browse/playlist/a1b2c3d4-e5f6-7890-abcd-ef1234567890
   ```

2. **Repeat for additional playlists** (up to 10)

3. **Toggle playlists** by clicking on them to include/exclude

4. **Enter a name** for your merged playlist (e.g., "My Ultimate Mix")

5. **Click "Merge Playlists"**

6. **Watch the progress** in real-time:
   ```
   Fetching playlist 1 of 3... (17%)
   Fetching playlist 2 of 3... (33%)
   Found 150 unique tracks (50%)
   Creating new playlist... (60%)
   Adding tracks (batch 1/3)... (70%)
   Complete! (100%)
   ```

7. **Check your TIDAL app** - the new playlist will appear in your library

### Logging Out

Click the **"Logout"** button in the top right to disconnect your TIDAL account. This deletes your session file.

---

## Supported Playlist URL Formats

| Format | Example |
|--------|---------|
| listen.tidal.com | `https://listen.tidal.com/playlist/uuid-here` |
| tidal.com/browse | `https://tidal.com/browse/playlist/uuid-here` |
| open.tidal.com | `https://open.tidal.com/playlist/uuid-here` |
| Raw UUID | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

---

## API Endpoints

Base URL: `http://localhost:8000`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/auth/login` | GET | Get device login URL and code |
| `/auth/check` | GET | Poll for login completion |
| `/auth/status` | GET | Check current auth status |
| `/auth/logout` | POST | Log out and delete session |
| `/api/playlist/resolve` | POST | Resolve playlist from URL |
| `/api/merge` | POST | Merge playlists (returns SSE stream) |
| `/docs` | GET | Swagger UI documentation |
| `/openapi.json` | GET | OpenAPI specification |

### Example API Calls

**Check auth status:**
```bash
curl http://localhost:8000/auth/status
# Response: {"authenticated": true, "user": {"id": 12345, "username": "user"}}
```

**Initiate login:**
```bash
curl http://localhost:8000/auth/login
# Response: {"login_url": "link.tidal.com/ABC123", "user_code": "ABC123", "pending": false}
```

**Resolve a playlist:**
```bash
curl -X POST http://localhost:8000/api/playlist/resolve \
  -H "Content-Type: application/json" \
  -d '{"url": "https://listen.tidal.com/playlist/your-uuid-here"}'
# Response: {"id": "uuid", "name": "Playlist Name", "trackCount": 50, "coverUrl": "..."}
```

**Merge playlists:**
```bash
curl -X POST http://localhost:8000/api/merge \
  -H "Content-Type: application/json" \
  -d '{"playlistIds": ["uuid1", "uuid2"], "name": "Merged Playlist"}'
# Response: SSE stream with progress updates
```

---

## Configuration

### Backend Environment Variables

Create `.env` in `server-python/`:

```env
PORT=8000
TIDAL_COUNTRY_CODE=GR
CLIENT_URL=http://localhost:8000
TOKEN_FILE=tidal_session.json
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8000 | Server port (serves both API and frontend) |
| `TIDAL_COUNTRY_CODE` | GR | Country code for TIDAL API |
| `CLIENT_URL` | http://localhost:8000 | Frontend URL for CORS |
| `TOKEN_FILE` | tidal_session.json | Session storage file |

### Frontend Environment Variables

Create `.env` in `client/` (only needed for development with `npm run dev`):

```env
VITE_API_BASE=http://localhost:8000
```

---

## Session Persistence

- Sessions are saved to `server-python/tidal_session.json`
- Sessions persist across server restarts
- To force logout: delete `tidal_session.json` or use the logout button

---

## Project Structure

```
tidal-playlist-merger-alt/
├── README.md
├── start.bat                    # Windows startup script
├── start.sh                     # Unix startup script
├── client/                      # React frontend
│   ├── src/
│   │   ├── App.tsx             # Main component
│   │   ├── components/
│   │   │   ├── AddPlaylistInput.tsx
│   │   │   └── PlaylistPreview.tsx
│   │   └── utils/
│   │       └── urlValidator.ts
│   ├── .env                    # VITE_API_BASE=http://localhost:8000
│   ├── package.json
│   └── vite.config.ts
│
└── server-python/              # Python backend
    ├── main.py                 # FastAPI entry point (serves frontend too)
    ├── requirements.txt        # Python dependencies
    ├── .env                    # Server config
    ├── .gitignore              # Git ignore rules
    ├── services/
    │   ├── __init__.py
    │   ├── auth_service.py     # TIDAL authentication
    │   ├── tidal_service.py    # TIDAL operations
    │   └── merge_service.py    # Playlist merge logic
    ├── routes/
    │   ├── __init__.py
    │   ├── auth.py             # /auth/* endpoints
    │   └── api.py              # /api/* endpoints
    └── utils/
        ├── __init__.py
        └── url_parser.py       # URL parsing
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.9+, FastAPI, uvicorn |
| Frontend | React 19, TypeScript, Vite |
| TIDAL API | [tidalapi](https://github.com/EbbLabs/python-tidal) (unofficial) |
| Auth | Device linking flow (no OAuth) |

---

## Troubleshooting

### "Module not found" error
```bash
# Make sure you're in the virtual environment
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

### "Port 8000 already in use"
```bash
# Find and kill the process
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :8000
kill -9 <PID>
```

### "CORS error" in browser
- Make sure the server is running on port 8000
- Access the app at `http://localhost:8000` (not 5173)

### Login not completing
- Make sure you visited the exact URL shown (e.g., `https://link.tidal.com/ABC123`)
- Try refreshing the page after authorizing
- Check backend logs for errors

### Playlist not found
- Ensure the playlist is **public**
- Check the URL format is correct
- Verify the UUID is valid

### Page refresh during login
- If you refresh while waiting for authorization, the login state is reset
- Simply click "Connect with TIDAL" again

---

## Notes

- Playlists must be **public** to be accessible
- Maximum **10 playlists** can be merged at once
- **Duplicate tracks** are automatically removed
- Uses unofficial API - may break if TIDAL changes internal endpoints
