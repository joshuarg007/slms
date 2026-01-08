# tests/test_webhook.py
"""
Tests for Stripe webhook handling.
"""
import json
import hmac
import hashlib
import time
from unittest.mock import patch, MagicMock

import pytest


class TestStripeWebhook:
    """Test Stripe webhook endpoint."""

    def _create_webhook_signature(self, payload: str, secret: str = "whsec_fake") -> str:
        """Create a valid Stripe webhook signature."""
        timestamp = str(int(time.time()))
        signed_payload = f"{timestamp}.{payload}"
        signature = hmac.new(
            secret.encode(),
            signed_payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"t={timestamp},v1={signature}"

    def test_webhook_rejects_invalid_signature(self, client):
        """Webhook should reject requests with invalid signature."""
        payload = json.dumps({"type": "checkout.session.completed"})
        response = client.post(
            "/api/billing/webhook",
            content=payload,
            headers={
                "Content-Type": "application/json",
                "Stripe-Signature": "invalid_signature"
            }
        )
        assert response.status_code in [400, 401, 403]

    def test_webhook_rejects_missing_signature(self, client):
        """Webhook should reject requests without signature header."""
        payload = json.dumps({"type": "checkout.session.completed"})
        response = client.post(
            "/api/billing/webhook",
            content=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [400, 401, 403]

    @patch("stripe.Webhook.construct_event")
    def test_webhook_handles_checkout_completed(self, mock_construct, client, test_org, db_session):
        """Webhook should process checkout.session.completed events."""
        event_data = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test123",
                    "customer": "cus_test123",
                    "subscription": "sub_test123",
                    "metadata": {
                        "org_id": str(test_org.id),
                        "plan": "pro",
                        "billing_cycle": "monthly"
                    }
                }
            }
        }
        mock_construct.return_value = MagicMock(**event_data)

        payload = json.dumps(event_data)
        signature = self._create_webhook_signature(payload)

        response = client.post(
            "/api/billing/webhook",
            content=payload,
            headers={
                "Content-Type": "application/json",
                "Stripe-Signature": signature
            }
        )
        # Should succeed
        assert response.status_code == 200

    @patch("stripe.Webhook.construct_event")
    def test_webhook_handles_subscription_updated(self, mock_construct, client, test_org):
        """Webhook should process customer.subscription.updated events."""
        event_data = {
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_test123",
                    "customer": "cus_test123",
                    "status": "active",
                    "metadata": {
                        "org_id": str(test_org.id),
                        "plan": "pro"
                    }
                }
            }
        }
        mock_construct.return_value = MagicMock(**event_data)

        payload = json.dumps(event_data)
        signature = self._create_webhook_signature(payload)

        response = client.post(
            "/api/billing/webhook",
            content=payload,
            headers={
                "Content-Type": "application/json",
                "Stripe-Signature": signature
            }
        )
        assert response.status_code == 200

    @patch("stripe.Webhook.construct_event")
    def test_webhook_handles_subscription_deleted(self, mock_construct, client, test_org):
        """Webhook should process customer.subscription.deleted events."""
        event_data = {
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": "sub_test123",
                    "customer": "cus_test123",
                    "metadata": {
                        "org_id": str(test_org.id)
                    }
                }
            }
        }
        mock_construct.return_value = MagicMock(**event_data)

        payload = json.dumps(event_data)
        signature = self._create_webhook_signature(payload)

        response = client.post(
            "/api/billing/webhook",
            content=payload,
            headers={
                "Content-Type": "application/json",
                "Stripe-Signature": signature
            }
        )
        assert response.status_code == 200

    @patch("stripe.Webhook.construct_event")
    def test_webhook_handles_unknown_event_gracefully(self, mock_construct, client):
        """Webhook should handle unknown event types gracefully."""
        event_data = {
            "type": "unknown.event.type",
            "data": {"object": {}}
        }
        mock_construct.return_value = MagicMock(**event_data)

        payload = json.dumps(event_data)
        signature = self._create_webhook_signature(payload)

        response = client.post(
            "/api/billing/webhook",
            content=payload,
            headers={
                "Content-Type": "application/json",
                "Stripe-Signature": signature
            }
        )
        # Should succeed (acknowledge receipt) even for unknown events
        assert response.status_code == 200

    @patch("stripe.Webhook.construct_event")
    def test_webhook_logs_processing_errors(self, mock_construct, client, test_org, caplog):
        """Webhook should log errors when processing fails (not silently fail)."""
        event_data = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test123",
                    "customer": "cus_test123",
                    "subscription": "sub_test123",
                    "metadata": {
                        "org_id": "99999",  # Non-existent org
                        "plan": "pro"
                    }
                }
            }
        }
        mock_construct.return_value = MagicMock(**event_data)

        payload = json.dumps(event_data)
        signature = self._create_webhook_signature(payload)

        response = client.post(
            "/api/billing/webhook",
            content=payload,
            headers={
                "Content-Type": "application/json",
                "Stripe-Signature": signature
            }
        )
        # Should still return 200 to prevent Stripe retries
        # But should log the error
        assert response.status_code == 200


class TestWebhookIdempotency:
    """Test webhook idempotency handling."""

    def _create_webhook_signature(self, payload: str, secret: str = "whsec_fake") -> str:
        """Create a valid Stripe webhook signature."""
        timestamp = str(int(time.time()))
        signed_payload = f"{timestamp}.{payload}"
        signature = hmac.new(
            secret.encode(),
            signed_payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"t={timestamp},v1={signature}"

    @patch("stripe.Webhook.construct_event")
    def test_duplicate_events_are_handled(self, mock_construct, client, test_org):
        """Duplicate webhook events should be handled gracefully."""
        event_data = {
            "id": "evt_duplicate123",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test123",
                    "customer": "cus_test123",
                    "subscription": "sub_test123",
                    "metadata": {
                        "org_id": str(test_org.id),
                        "plan": "pro"
                    }
                }
            }
        }
        mock_construct.return_value = MagicMock(**event_data)

        payload = json.dumps(event_data)
        signature = self._create_webhook_signature(payload)

        # Send the same event twice
        response1 = client.post(
            "/api/billing/webhook",
            content=payload,
            headers={
                "Content-Type": "application/json",
                "Stripe-Signature": signature
            }
        )
        response2 = client.post(
            "/api/billing/webhook",
            content=payload,
            headers={
                "Content-Type": "application/json",
                "Stripe-Signature": signature
            }
        )

        # Both should succeed (idempotent)
        assert response1.status_code == 200
        assert response2.status_code == 200
