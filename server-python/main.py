import os
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

from routes import auth_router, api_router

app = FastAPI(title="Tidal Playlist Merger API")

client_url = os.getenv('CLIENT_URL', 'http://localhost:5173')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[client_url, "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")
app.include_router(api_router, prefix="/api")

frontend_dist = Path(__file__).parent.parent / "client" / "dist"

@app.get("/")
async def root():
    if frontend_dist.exists():
        return FileResponse(frontend_dist / "index.html")
    return {"status": "ok", "message": "Tidal Playlist Merger API - Run 'npm run build' in client/ to enable UI"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv('PORT', 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
