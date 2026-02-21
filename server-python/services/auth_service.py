import os
import json
import logging
import traceback
import tidalapi
from typing import Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

TOKEN_FILE = os.getenv('TOKEN_FILE', 'tidal_session.json')

class AuthService:
    def __init__(self):
        self.session: Optional[tidalapi.Session] = None
        self._oauth_future = None
        self._pending_login = False
        self._login_url: Optional[str] = None
    
    def _get_session(self) -> tidalapi.Session:
        if self.session is None:
            self.session = tidalapi.Session()
        return self.session
    
    def load_session(self) -> bool:
        session = self._get_session()
        try:
            if not os.path.exists(TOKEN_FILE):
                return False
            
            with open(TOKEN_FILE, 'r') as f:
                data = json.load(f)
            
            required = ['token_type', 'access_token']
            if not all(k in data and data[k] for k in required):
                logger.warning("Session file missing required fields")
                return False
            
            logger.info("Loading session from file...")
            
            result = session.load_oauth_session(
                token_type=data.get('token_type'),
                access_token=data.get('access_token'),
                refresh_token=data.get('refresh_token'),
                expiry_time=data.get('expiry_time')
            )
            
            if result and session.check_login():
                logger.info("Session loaded successfully")
                return True
            
            logger.warning("Session load failed or expired")
            return False
            
        except json.JSONDecodeError:
            logger.error("Session file corrupted, deleting...")
            try:
                os.remove(TOKEN_FILE)
            except Exception:
                pass
            return False
        except Exception as e:
            logger.error(f"Error loading session: {e}")
            return False
    
    def save_session(self):
        session = self._get_session()
        try:
            data = {
                'token_type': session.token_type,
                'access_token': session.access_token,
                'refresh_token': session.refresh_token,
                'expiry_time': session.expiry_time
            }
            with open(TOKEN_FILE, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info("Session saved")
        except Exception as e:
            logger.error(f"Error saving session: {e}")
    
    def is_authenticated(self) -> bool:
        session = self._get_session()
        return session.check_login()
    
    def check_login(self) -> bool:
        if self._oauth_future is None:
            return False
        
        try:
            if self._oauth_future.done():
                self._oauth_future.result()
                
                session = self._get_session()
                
                if session.check_login():
                    logger.info("Successfully authenticated!")
                    self.save_session()
                    self._pending_login = False
                    self._oauth_future = None
                    return True
                else:
                    logger.warning("OAuth completed but login check failed")
                    
        except Exception as e:
            logger.error(f"Login check error: {e}")
            self._pending_login = False
            self._oauth_future = None
        
        return False
    
    def get_auth_status(self) -> dict:
        session = self._get_session()
        if session.check_login():
            try:
                user = session.user
                return {
                    'authenticated': True,
                    'user': {
                        'id': user.id if user else None,
                        'username': user.username if user else None
                    }
                }
            except Exception as e:
                logger.error(f"Error getting auth status: {e}")
        return {'authenticated': False}
    
    def initiate_login(self) -> Tuple[str, str]:
        session = self._get_session()
        logger.info("Initiating OAuth login...")
        login, future = session.login_oauth()
        self._oauth_future = future
        self._pending_login = True
        self._login_url = login.verification_uri_complete
        return login.verification_uri_complete, login.user_code
    
    def is_login_pending(self) -> bool:
        return self._pending_login
    
    def get_login_url(self) -> Optional[str]:
        return self._login_url
    
    def logout(self):
        logger.info("Logging out...")
        self.session = None
        self._oauth_future = None
        self._pending_login = False
        self._login_url = None
        if os.path.exists(TOKEN_FILE):
            try:
                os.remove(TOKEN_FILE)
            except Exception:
                pass
    
    def get_session_object(self) -> Optional[tidalapi.Session]:
        session = self._get_session()
        if session.check_login():
            return session
        return None
