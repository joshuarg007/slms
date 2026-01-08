# tests/test_api_auth.py
"""
Tests for authentication endpoints and security.
"""
import pytest


class TestAuthEndpoints:
    """Test authentication endpoints."""

    def test_login_with_valid_credentials(self, client, test_user):
        """Login should succeed with valid email and password."""
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "testpassword123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_with_invalid_password(self, client, test_user):
        """Login should fail with invalid password."""
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    def test_login_with_nonexistent_user(self, client):
        """Login should fail for nonexistent user."""
        response = client.post(
            "/api/auth/login",
            json={"email": "nonexistent@example.com", "password": "password123"}
        )
        assert response.status_code == 401

    def test_protected_endpoint_without_token(self, client):
        """Protected endpoints should return 401 without token."""
        response = client.get("/api/leads")
        assert response.status_code == 401

    def test_protected_endpoint_with_valid_token(self, client, auth_headers):
        """Protected endpoints should succeed with valid token."""
        response = client.get("/api/leads", headers=auth_headers)
        assert response.status_code == 200

    def test_protected_endpoint_with_invalid_token(self, client):
        """Protected endpoints should return 401 with invalid token."""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = client.get("/api/leads", headers=headers)
        assert response.status_code == 401


class TestTokenSecurity:
    """Test token security features."""

    def test_token_contains_required_claims(self, test_user):
        """Access token should contain required claims."""
        from app.core.security import create_access_token
        import jwt

        token = create_access_token(sub=test_user.email)

        # Decode without verification to check structure
        decoded = jwt.decode(token, options={"verify_signature": False})
        assert "sub" in decoded
        assert "exp" in decoded
        assert decoded["sub"] == test_user.email

    def test_expired_token_is_rejected(self, client, test_user):
        """Expired tokens should be rejected."""
        from app.core.security import create_access_token
        from datetime import timedelta

        # Create a token that expired 1 hour ago
        token = create_access_token(
            sub=test_user.email,
            expires_delta=timedelta(hours=-1)
        )
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/leads", headers=headers)
        assert response.status_code == 401
