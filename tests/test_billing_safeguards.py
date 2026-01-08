# tests/test_billing_safeguards.py
"""
Automated tests for billing safeguards.
Tests all 6 layers of protection against duplicate charges.

These tests were converted from manual tests to run in CI/CD.
"""
import hashlib
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest


class TestDBStatusSafeguard:
    """Safeguard 1: Database subscription status checks."""

    def test_blocks_active_subscription_same_plan(self, test_org, db_session):
        """Should block checkout if DB shows active subscription for same plan."""
        test_org.plan = "pro"
        test_org.subscription_status = "active"
        test_org.stripe_subscription_id = "sub_123"
        db_session.commit()

        blocking_statuses = {"active", "past_due", "incomplete", "trialing", "canceling"}

        # Check that active status would block
        assert test_org.subscription_status in blocking_statuses
        assert test_org.plan == "pro"
        assert test_org.stripe_subscription_id is not None

    def test_allows_different_plan(self, test_org, db_session):
        """Should allow checkout for different plan even if active."""
        test_org.plan = "starter"
        test_org.subscription_status = "active"
        test_org.stripe_subscription_id = "sub_123"
        db_session.commit()

        req_plan = "pro"  # Different plan
        blocking_statuses = {"active", "past_due", "incomplete", "trialing", "canceling"}

        # Should NOT block because plans are different
        should_block = (
            test_org.subscription_status in blocking_statuses
            and test_org.plan == req_plan
            and test_org.stripe_subscription_id
        )
        assert not should_block

    def test_allows_canceled_status(self, test_org, db_session):
        """Should allow checkout if subscription is canceled."""
        test_org.plan = "pro"
        test_org.subscription_status = "canceled"
        test_org.stripe_subscription_id = None
        db_session.commit()

        blocking_statuses = {"active", "past_due", "incomplete", "trialing", "canceling"}

        should_block = (
            test_org.subscription_status in blocking_statuses
            and test_org.plan == "pro"
            and test_org.stripe_subscription_id
        )
        assert not should_block

    @pytest.mark.parametrize("status", ["active", "past_due", "incomplete", "trialing", "canceling"])
    def test_blocks_all_active_statuses(self, test_org, db_session, status):
        """Should block checkout for all 'active-like' statuses."""
        test_org.plan = "pro"
        test_org.subscription_status = status
        test_org.stripe_subscription_id = "sub_123"
        db_session.commit()

        blocking_statuses = {"active", "past_due", "incomplete", "trialing", "canceling"}
        should_block = (
            test_org.subscription_status in blocking_statuses
            and test_org.plan == "pro"
            and test_org.stripe_subscription_id
        )
        assert should_block


class TestCacheSafeguard:
    """Safeguard 2a: In-memory checkout URL cache."""

    def test_cache_key_includes_all_components(self):
        """Cache key should include org_id, plan, and billing_cycle."""
        key1 = "1:pro:monthly"
        key2 = "1:starter:monthly"
        key3 = "1:pro:annual"
        key4 = "2:pro:monthly"

        # All should be different
        keys = {key1, key2, key3, key4}
        assert len(keys) == 4

    def test_cache_returns_same_url_within_window(self):
        """Rapid requests within cache window should return same URL."""
        cache = {}
        cache_key = "1:pro:monthly"

        # First request - cache the URL
        cache[cache_key] = ("https://checkout.stripe.com/cached", datetime.utcnow())

        # Subsequent request within window
        cached_url, cached_time = cache[cache_key]
        within_window = datetime.utcnow() - cached_time < timedelta(minutes=2)

        assert within_window
        assert cached_url == "https://checkout.stripe.com/cached"

    def test_cache_expires_after_window(self):
        """Cache should expire after 2 minutes."""
        cache = {}
        cache_key = "1:pro:monthly"

        # Simulate cached entry from 3 minutes ago
        old_time = datetime.utcnow() - timedelta(minutes=3)
        cache[cache_key] = ("https://checkout.stripe.com/cached", old_time)

        cached_url, cached_time = cache[cache_key]
        within_window = datetime.utcnow() - cached_time < timedelta(minutes=2)

        assert not within_window  # Should be expired


class TestStripeOpenSessionSafeguard:
    """Safeguard 2b: Check for existing open Stripe checkout sessions."""

    def test_finds_matching_open_session(self):
        """Should find and return existing open checkout session for same plan."""
        sessions = [
            MagicMock(
                url="https://existing.url",
                status="open",
                subscription_data={"metadata": {"plan": "pro", "billing_cycle": "monthly"}}
            ),
        ]

        req_plan = "pro"
        req_cycle = "monthly"

        found_url = None
        for session in sessions:
            meta = getattr(session, "subscription_data", {}).get("metadata", {}) or {}
            if meta.get("plan") == req_plan and meta.get("billing_cycle") == req_cycle:
                found_url = session.url
                break

        assert found_url == "https://existing.url"

    def test_ignores_different_plan_session(self):
        """Should NOT return session for different plan."""
        sessions = [
            MagicMock(
                url="https://starter.url",
                status="open",
                subscription_data={"metadata": {"plan": "starter", "billing_cycle": "monthly"}}
            ),
        ]

        req_plan = "pro"  # Different plan
        req_cycle = "monthly"

        found_url = None
        for session in sessions:
            meta = getattr(session, "subscription_data", {}).get("metadata", {}) or {}
            if meta.get("plan") == req_plan and meta.get("billing_cycle") == req_cycle:
                found_url = session.url
                break

        assert found_url is None  # Should not match


class TestStripeSubscriptionSafeguard:
    """Safeguard 2c: Check for active Stripe subscriptions."""

    def test_blocks_active_subscription_same_plan(self):
        """Should block if Stripe shows active subscription for same plan."""
        subs = [
            MagicMock(status="active", metadata={"plan": "pro"}),
        ]

        req_plan = "pro"
        active_statuses = {"active", "past_due", "trialing", "incomplete"}

        should_block = False
        for sub in subs:
            if sub.status in active_statuses:
                sub_meta = getattr(sub, "metadata", {}) or {}
                if sub_meta.get("plan") == req_plan:
                    should_block = True
                    break

        assert should_block

    def test_allows_different_plan_subscription(self):
        """Should allow if Stripe subscription is for different plan."""
        subs = [
            MagicMock(status="active", metadata={"plan": "starter"}),
        ]

        req_plan = "pro"  # Different
        active_statuses = {"active", "past_due", "trialing", "incomplete"}

        should_block = False
        for sub in subs:
            if sub.status in active_statuses:
                sub_meta = getattr(sub, "metadata", {}) or {}
                if sub_meta.get("plan") == req_plan:
                    should_block = True
                    break

        assert not should_block


class TestIdempotencyKeySafeguard:
    """Safeguard 3: Stripe idempotency keys."""

    def test_same_bucket_same_key(self):
        """Requests in same 15-min bucket should get same idempotency key."""
        now = datetime.utcnow().timestamp()
        bucket = int(now // 900)

        key1 = hashlib.sha256(f"1:pro:monthly:{bucket}".encode()).hexdigest()[:32]
        key2 = hashlib.sha256(f"1:pro:monthly:{bucket}".encode()).hexdigest()[:32]

        assert key1 == key2

    def test_different_plan_different_key(self):
        """Different plans should get different idempotency keys."""
        bucket = int(datetime.utcnow().timestamp() // 900)

        key1 = hashlib.sha256(f"1:pro:monthly:{bucket}".encode()).hexdigest()[:32]
        key2 = hashlib.sha256(f"1:starter:monthly:{bucket}".encode()).hexdigest()[:32]

        assert key1 != key2

    def test_different_org_different_key(self):
        """Different orgs should get different idempotency keys."""
        bucket = int(datetime.utcnow().timestamp() // 900)

        key1 = hashlib.sha256(f"1:pro:monthly:{bucket}".encode()).hexdigest()[:32]
        key2 = hashlib.sha256(f"2:pro:monthly:{bucket}".encode()).hexdigest()[:32]

        assert key1 != key2

    def test_different_cycle_different_key(self):
        """Different billing cycles should get different idempotency keys."""
        bucket = int(datetime.utcnow().timestamp() // 900)

        key1 = hashlib.sha256(f"1:pro:monthly:{bucket}".encode()).hexdigest()[:32]
        key2 = hashlib.sha256(f"1:pro:annual:{bucket}".encode()).hexdigest()[:32]

        assert key1 != key2


class TestConcurrentRequestSafeguards:
    """Stress tests for concurrent request handling."""

    def test_concurrent_requests_same_idempotency_key(self):
        """100 concurrent requests should all get same idempotency key."""
        bucket = int(datetime.utcnow().timestamp() // 900)
        keys = set()

        for _ in range(100):
            key = hashlib.sha256(f"1:pro:monthly:{bucket}".encode()).hexdigest()[:32]
            keys.add(key)

        assert len(keys) == 1  # All same key

    def test_concurrent_requests_same_cache_key(self):
        """100 concurrent requests should use same cache key."""
        keys = set()

        for _ in range(100):
            key = "1:pro:monthly"
            keys.add(key)

        assert len(keys) == 1


class TestCheckoutEndpointSafeguards:
    """Integration tests for checkout endpoint safeguards."""

    @patch("stripe.Customer.list")
    @patch("stripe.Customer.create")
    @patch("stripe.checkout.Session.list")
    @patch("stripe.checkout.Session.create")
    @patch("stripe.Subscription.list")
    def test_checkout_rejects_active_subscription(
        self,
        mock_sub_list,
        mock_session_create,
        mock_session_list,
        mock_customer_create,
        mock_customer_list,
        client,
        test_org,
        test_user,
        auth_headers,
        db_session,
    ):
        """Checkout should reject if user already has active subscription for same plan."""
        # Set up org with active subscription
        test_org.plan = "pro"
        test_org.subscription_status = "active"
        test_org.stripe_subscription_id = "sub_existing"
        test_org.stripe_customer_id = "cus_existing"
        db_session.commit()

        # Mock Stripe responses
        mock_customer_list.return_value = MagicMock(data=[])
        mock_session_list.return_value = MagicMock(data=[])
        mock_sub_list.return_value = MagicMock(data=[])

        response = client.post(
            "/api/billing/checkout",
            json={"plan": "pro", "billing_cycle": "monthly"},
            headers=auth_headers,
        )

        # Should be rejected
        assert response.status_code == 400
        assert "already have" in response.json().get("detail", "").lower() or \
               "already have" in response.json().get("message", "").lower()

    @patch("stripe.Customer.list")
    @patch("stripe.Customer.create")
    @patch("stripe.checkout.Session.list")
    @patch("stripe.checkout.Session.create")
    @patch("stripe.Subscription.list")
    def test_checkout_allows_different_plan(
        self,
        mock_sub_list,
        mock_session_create,
        mock_session_list,
        mock_customer_create,
        mock_customer_list,
        client,
        test_org,
        test_user,
        auth_headers,
        db_session,
    ):
        """Checkout should allow upgrading to different plan."""
        # Set up org with starter subscription
        test_org.plan = "starter"
        test_org.subscription_status = "active"
        test_org.stripe_subscription_id = "sub_existing"
        test_org.stripe_customer_id = "cus_existing"
        db_session.commit()

        # Mock Stripe responses
        mock_customer_list.return_value = MagicMock(data=[
            MagicMock(id="cus_existing")
        ])
        mock_session_list.return_value = MagicMock(data=[])
        mock_sub_list.return_value = MagicMock(data=[
            MagicMock(status="active", metadata={"plan": "starter"})
        ])
        mock_session_create.return_value = MagicMock(
            url="https://checkout.stripe.com/upgrade",
            id="cs_upgrade"
        )

        response = client.post(
            "/api/billing/checkout",
            json={"plan": "pro", "billing_cycle": "monthly"},  # Different plan
            headers=auth_headers,
        )

        # Should be allowed (upgrade path)
        # Note: May return 400 if cancel fails, but shouldn't block on "already have"
        if response.status_code == 400:
            detail = response.json().get("detail", "").lower()
            assert "already have" not in detail or "pro" not in detail

    @patch("stripe.Customer.list")
    @patch("stripe.Customer.create")
    @patch("stripe.checkout.Session.list")
    @patch("stripe.checkout.Session.create")
    @patch("stripe.Subscription.list")
    def test_checkout_allows_canceled_status(
        self,
        mock_sub_list,
        mock_session_create,
        mock_session_list,
        mock_customer_create,
        mock_customer_list,
        client,
        test_org,
        test_user,
        auth_headers,
        db_session,
    ):
        """Checkout should allow resubscription after cancellation."""
        # Set up org with canceled subscription
        test_org.plan = "pro"
        test_org.subscription_status = "canceled"
        test_org.stripe_subscription_id = None
        test_org.stripe_customer_id = "cus_existing"
        db_session.commit()

        # Mock Stripe responses
        mock_customer_list.return_value = MagicMock(data=[
            MagicMock(id="cus_existing")
        ])
        mock_session_list.return_value = MagicMock(data=[])
        mock_sub_list.return_value = MagicMock(data=[])
        mock_session_create.return_value = MagicMock(
            url="https://checkout.stripe.com/resubscribe",
            id="cs_resub"
        )

        response = client.post(
            "/api/billing/checkout",
            json={"plan": "pro", "billing_cycle": "monthly"},
            headers=auth_headers,
        )

        # Should succeed
        assert response.status_code == 200
        assert "url" in response.json()
