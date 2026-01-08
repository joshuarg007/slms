# tests/test_api_health.py
"""
Tests for health check endpoints.
"""
import pytest


class TestHealthEndpoints:
    """Test health check endpoints."""

    def test_health_check_returns_ok(self, client):
        """Basic health check should return 200 with ok status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data

    def test_readiness_check_returns_ok(self, client):
        """Readiness check should return 200 when DB is connected."""
        response = client.get("/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"
        assert "timestamp" in data
