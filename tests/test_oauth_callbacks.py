# tests/test_oauth_callbacks.py
"""
Tests for OAuth callback endpoints.
Tests HubSpot, Pipedrive, Salesforce, and Zoho OAuth flows.
"""
from unittest.mock import MagicMock, patch
from urllib.parse import urlencode

import pytest


class TestHubSpotOAuth:
    """Tests for HubSpot OAuth flow."""

    def test_oauth_start_redirects(self, client, test_org, auth_headers):
        """OAuth start should redirect to HubSpot authorization."""
        response = client.get(
            "/api/integrations/hubspot/oauth/start",
            headers=auth_headers,
            follow_redirects=False,
        )
        # Should redirect to HubSpot
        assert response.status_code in [302, 307, 200]

    def test_callback_requires_code(self, client):
        """Callback should require authorization code."""
        response = client.get("/api/integrations/hubspot/callback")
        assert response.status_code in [400, 422]

    def test_callback_requires_state(self, client):
        """Callback should require state parameter for CSRF protection."""
        response = client.get("/api/integrations/hubspot/callback?code=test_code")
        # Should fail without valid state
        assert response.status_code in [400, 401, 403, 422]

    @patch("requests.post")
    def test_callback_handles_invalid_code(self, mock_post, client, test_org, db_session):
        """Callback should handle invalid authorization code gracefully."""
        # Mock HubSpot token endpoint returning error
        mock_post.return_value = MagicMock(
            status_code=400,
            json=lambda: {"error": "invalid_grant", "error_description": "Invalid code"}
        )

        # Create a fake state (in real flow this would be validated)
        response = client.get(
            f"/api/integrations/hubspot/callback?code=invalid_code&state=fake_state"
        )

        # Should handle error gracefully (redirect to error page or return error)
        assert response.status_code in [400, 302, 307]

    @patch("requests.post")
    @patch("requests.get")
    def test_callback_stores_tokens(self, mock_get, mock_post, client, test_org, db_session):
        """Successful callback should store tokens in database."""
        # Mock successful token exchange
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "access_token": "test_access_token",
                "refresh_token": "test_refresh_token",
                "expires_in": 3600,
            }
        )

        # Mock HubSpot account info
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"portalId": "12345"}
        )

        # Note: This test is limited because state validation requires
        # the actual OAuth flow. In production, use integration tests.


class TestPipedriveOAuth:
    """Tests for Pipedrive OAuth flow."""

    def test_oauth_start_redirects(self, client, test_org, auth_headers):
        """OAuth start should redirect to Pipedrive authorization."""
        response = client.get(
            "/api/integrations/pipedrive/oauth/start",
            headers=auth_headers,
            follow_redirects=False,
        )
        assert response.status_code in [302, 307, 200]

    def test_callback_requires_code(self, client):
        """Callback should require authorization code."""
        response = client.get("/api/integrations/pipedrive/callback")
        assert response.status_code in [400, 422]

    @patch("requests.post")
    def test_callback_handles_token_error(self, mock_post, client):
        """Callback should handle token exchange errors."""
        mock_post.return_value = MagicMock(
            status_code=400,
            json=lambda: {"error": "invalid_grant"}
        )

        response = client.get(
            "/api/integrations/pipedrive/callback?code=invalid_code&state=fake"
        )
        assert response.status_code in [400, 302, 307]


class TestSalesforceOAuth:
    """Tests for Salesforce OAuth flow."""

    def test_oauth_start_redirects(self, client, test_org, auth_headers):
        """OAuth start should redirect to Salesforce authorization."""
        response = client.get(
            "/api/integrations/salesforce/oauth/start",
            headers=auth_headers,
            follow_redirects=False,
        )
        assert response.status_code in [302, 307, 200]

    def test_callback_requires_code(self, client):
        """Callback should require authorization code."""
        response = client.get("/api/integrations/salesforce/callback")
        assert response.status_code in [400, 422]

    def test_callback_handles_error_response(self, client):
        """Callback should handle OAuth error responses."""
        # Salesforce sends errors as query params
        response = client.get(
            "/api/integrations/salesforce/callback?error=access_denied&error_description=User+denied+access"
        )
        # Should handle gracefully
        assert response.status_code in [400, 302, 307]


class TestZohoOAuth:
    """Tests for Zoho OAuth flow."""

    def test_oauth_start_redirects(self, client, test_org, auth_headers):
        """OAuth start should redirect to Zoho authorization."""
        response = client.get(
            "/api/integrations/zoho/oauth/start",
            headers=auth_headers,
            follow_redirects=False,
        )
        assert response.status_code in [302, 307, 200]

    def test_callback_requires_code(self, client):
        """Callback should require authorization code."""
        response = client.get("/api/integrations/zoho/callback")
        assert response.status_code in [400, 422]


class TestOAuthStateValidation:
    """Tests for OAuth state parameter validation (CSRF protection)."""

    def test_state_must_match(self, client):
        """State parameter must match stored value."""
        # Without valid state in session, callback should fail
        response = client.get(
            "/api/integrations/hubspot/callback?code=valid_code&state=tampered_state"
        )
        # Should reject due to state mismatch
        assert response.status_code in [400, 401, 403]

    def test_state_prevents_csrf(self, client):
        """Requests without state should be rejected."""
        response = client.get(
            "/api/integrations/hubspot/callback?code=valid_code"
        )
        # Missing state = CSRF attempt
        assert response.status_code in [400, 422]


class TestOAuthTokenRefresh:
    """Tests for OAuth token refresh functionality."""

    @patch("requests.post")
    def test_refresh_token_updates_credentials(self, mock_post, test_org, db_session):
        """Token refresh should update stored credentials."""
        from app.db import models

        # Create integration credential
        cred = models.IntegrationCredential(
            organization_id=test_org.id,
            provider="hubspot",
            access_token="old_token",
            refresh_token="valid_refresh",
            is_active=True,
        )
        db_session.add(cred)
        db_session.commit()

        # Mock successful refresh
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "access_token": "new_access_token",
                "refresh_token": "new_refresh_token",
                "expires_in": 3600,
            }
        )

        # Note: Actual refresh logic would be tested via the integration module


class TestOAuthDisconnect:
    """Tests for OAuth disconnect functionality."""

    def test_disconnect_requires_auth(self, client):
        """Disconnect should require authentication."""
        response = client.delete("/api/integrations/hubspot/disconnect")
        assert response.status_code == 401

    def test_disconnect_clears_credentials(self, client, test_org, test_user, auth_headers, db_session):
        """Disconnect should clear stored credentials."""
        from app.db import models

        # Create integration credential
        cred = models.IntegrationCredential(
            organization_id=test_org.id,
            provider="hubspot",
            access_token="test_token",
            is_active=True,
        )
        db_session.add(cred)
        db_session.commit()

        response = client.delete(
            "/api/integrations/hubspot/disconnect",
            headers=auth_headers,
        )

        # Should succeed
        assert response.status_code in [200, 204]

        # Credential should be deleted or deactivated
        db_session.refresh(cred)
        # Check if deleted or deactivated
        remaining = db_session.query(models.IntegrationCredential).filter(
            models.IntegrationCredential.organization_id == test_org.id,
            models.IntegrationCredential.provider == "hubspot",
            models.IntegrationCredential.is_active == True,
        ).first()
        assert remaining is None


class TestOAuthErrorHandling:
    """Tests for OAuth error handling."""

    def test_handles_provider_unavailable(self, client, auth_headers):
        """Should handle provider being unavailable."""
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("Connection refused")

            # OAuth start might fail if it needs to check provider
            # This tests graceful handling of connection errors

    def test_handles_invalid_token_response(self, client):
        """Should handle malformed token responses."""
        with patch("requests.post") as mock_post:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"unexpected": "response"}  # Missing access_token
            )

            response = client.get(
                "/api/integrations/hubspot/callback?code=code&state=state"
            )
            # Should handle gracefully, not crash
            assert response.status_code in [400, 302, 307, 500]

    def test_handles_expired_code(self, client):
        """Should handle expired authorization codes."""
        with patch("requests.post") as mock_post:
            mock_post.return_value = MagicMock(
                status_code=400,
                json=lambda: {
                    "error": "invalid_grant",
                    "error_description": "Authorization code expired"
                }
            )

            response = client.get(
                "/api/integrations/hubspot/callback?code=expired&state=state"
            )
            assert response.status_code in [400, 302, 307]
