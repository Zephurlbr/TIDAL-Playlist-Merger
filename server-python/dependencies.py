from fastapi import Depends, HTTPException
from services import auth_service

async def require_auth():
    if auth_service.is_authenticated():
        return True
    if auth_service.load_session():
        return True
    raise HTTPException(status_code=401, detail="Not authenticated")
