# tests/test_api_integrations.py
"""
Tests for CRM integration endpoints.
"""
import pytest
from unittest.mock import patch, MagicMock


class TestIntegrationCredentials:
    """Test integration credential management."""

    def test_list_credentials_requires_auth(self, client):
        """Listing credentials should require authentication."""
        response = client.get("/api/integrations/credentials")
        assert response.status_code == 401

    def test_list_credentials_returns_empty_initially(self, client, auth_headers):
        """New org should have no credentials."""
        response = client.get("/api/integrations/credentials", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_create_credential(self, client, auth_headers):
        """Should be able to create a new credential."""
        response = client.post(
            "/api/integrations/credentials",
            headers=auth_headers,
            json={
                "provider": "nutshell",
                "access_token": "test_api_key_123",
                "auth_type": "api_key",
                "activate": True
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["provider"] == "nutshell"
        assert data["auth_type"] == "api_key"
        assert data["is_active"] is True
        assert data["token_suffix"] == "_123"  # Last 4 chars


class TestNutshellEndpoints:
    """Test Nutshell-specific endpoints."""

    def test_nutshell_salespeople_requires_auth(self, client):
        """Nutshell salespeople endpoint should require auth."""
        response = client.get("/api/integrations/nutshell/salespeople")
        assert response.status_code == 401

    def test_nutshell_salespeople_requires_credential(self, client, auth_headers):
        """Should return error when no Nutshell credential exists."""
        response = client.get(
            "/api/integrations/nutshell/salespeople",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "No Nutshell API key" in response.json()["detail"]

    def test_nutshell_disconnect_requires_auth(self, client):
        """Nutshell disconnect endpoint should require auth."""
        response = client.delete("/api/integrations/nutshell/disconnect")
        assert response.status_code == 401

    def test_nutshell_disconnect_without_credential(self, client, auth_headers):
        """Disconnect should succeed even when no credential exists."""
        response = client.delete(
            "/api/integrations/nutshell/disconnect",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["disconnected"] is False


class TestActiveCRM:
    """Test active CRM management."""

    def test_get_active_crm_defaults_to_hubspot(self, client, auth_headers):
        """Default active CRM should be hubspot."""
        response = client.get("/api/integrations/crm/active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "hubspot"

    def test_set_active_crm(self, client, auth_headers):
        """Should be able to set active CRM."""
        response = client.post(
            "/api/integrations/crm/active",
            headers=auth_headers,
            json={"provider": "salesforce"}
        )
        assert response.status_code == 200
        assert response.json()["provider"] == "salesforce"

    def test_set_invalid_crm_rejected(self, client, auth_headers):
        """Invalid CRM provider should be rejected."""
        response = client.post(
            "/api/integrations/crm/active",
            headers=auth_headers,
            json={"provider": "invalid_crm"}
        )
        assert response.status_code == 422


class TestOAuthProviders:
    """Test OAuth provider endpoints exist and require auth."""

    @pytest.mark.parametrize("provider", ["salesforce", "hubspot", "pipedrive", "zoho"])
    def test_oauth_auth_requires_login(self, client, provider):
        """OAuth auth endpoints should require authentication."""
        response = client.get(f"/api/integrations/{provider}/auth")
        assert response.status_code == 401

    @pytest.mark.parametrize("provider", ["hubspot", "pipedrive", "zoho"])
    def test_oauth_disconnect_requires_login(self, client, provider):
        """OAuth disconnect endpoints should require authentication."""
        response = client.delete(f"/api/integrations/{provider}/disconnect")
        assert response.status_code == 401

    @pytest.mark.parametrize("provider", ["hubspot", "pipedrive", "zoho"])
    def test_oauth_refresh_requires_login(self, client, provider):
        """OAuth refresh endpoints should require authentication."""
        response = client.post(f"/api/integrations/{provider}/refresh")
        assert response.status_code == 401
