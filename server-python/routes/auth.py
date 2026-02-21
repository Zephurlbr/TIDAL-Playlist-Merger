import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException

from services import auth_service

router = APIRouter(tags=["auth"])

@router.get("/login")
async def login():
    try:
        if auth_service.is_login_pending():
            url = auth_service.get_login_url()
            return {"login_url": url, "user_code": "", "pending": True}
        
        login_url, user_code = auth_service.initiate_login()
        return {"login_url": login_url, "user_code": user_code, "pending": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check")
async def check_login():
    try:
        completed = auth_service.check_login()
        return {"completed": completed, "authenticated": auth_service.is_authenticated()}
    except Exception as e:
        return {"completed": False, "authenticated": False}

@router.get("/status")
async def get_status():
    try:
        if not auth_service.is_authenticated():
            auth_service.load_session()
        return auth_service.get_auth_status()
    except Exception as e:
        return {"authenticated": False}

@router.post("/logout")
async def logout():
    try:
        auth_service.logout()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
