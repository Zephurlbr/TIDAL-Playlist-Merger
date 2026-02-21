import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import Depends, HTTPException
from services import auth_service

async def require_auth():
    if auth_service.is_authenticated():
        return True
    if auth_service.load_session():
        return True
    raise HTTPException(status_code=401, detail="Not authenticated")
