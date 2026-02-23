import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock


class TestConfigEndpoint:
    def test_config_endpoint_returns_defaults(self):
        from main import app
        client = TestClient(app)
        
        response = client.get('/api/config')
        
        assert response.status_code == 200
        data = response.json()
        assert 'trackLimit' in data
        assert 'maxPlaylists' in data
        assert data['trackLimit'] == 10000
        assert data['maxPlaylists'] == 200


class TestHealthEndpoint:
    def test_health_check(self):
        from main import app
        client = TestClient(app)
        
        response = client.get('/health')
        
        assert response.status_code == 200
        assert response.json()['status'] == 'healthy'
