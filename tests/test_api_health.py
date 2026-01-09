# tests/test_api_health.py
"""
Tests for health check endpoints.
"""
import pytest


class TestHealthEndpoints:
    """Test health check endpoints."""

    def test_health_check_returns_ok(self, client):
        """Health check should return 200 with healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "checks" in data
        assert data["checks"]["api"]["status"] == "healthy"
        assert data["checks"]["database"]["status"] == "healthy"

    def test_healthz_alias_works(self, client):
        """Kubernetes-style /healthz should work same as /health."""
        response = client.get("/healthz")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "checks" in data
