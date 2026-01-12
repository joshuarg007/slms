#!/usr/bin/env python3
"""
PayPal Product and Plans Setup Script for Site2CRM

Creates the PayPal Product and Subscription Plans needed for billing.
Run this once per environment (sandbox, then production).

Usage:
    export PAYPAL_CLIENT_ID=xxx
    export PAYPAL_CLIENT_SECRET=xxx
    export PAYPAL_MODE=sandbox  # or 'live'
    python scripts/setup_paypal_plans.py

Output:
    Prints the Plan IDs to add to your .env file.
"""

import os
import sys
import json
import base64
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# PayPal API endpoints
SANDBOX_BASE = "https://api-m.sandbox.paypal.com"
LIVE_BASE = "https://api-m.paypal.com"

# Plan definitions matching Stripe plans
PLANS = [
    {
        "name": "Starter Monthly",
        "env_key": "PAYPAL_PLAN_STARTER_MONTHLY",
        "price": "29.00",
        "interval": "MONTH",
        "interval_count": 1,
    },
    {
        "name": "Starter Annual",
        "env_key": "PAYPAL_PLAN_STARTER_ANNUAL",
        "price": "290.00",
        "interval": "YEAR",
        "interval_count": 1,
    },
    {
        "name": "Pro Monthly",
        "env_key": "PAYPAL_PLAN_PRO_MONTHLY",
        "price": "79.00",
        "interval": "MONTH",
        "interval_count": 1,
    },
    {
        "name": "Pro Annual",
        "env_key": "PAYPAL_PLAN_PRO_ANNUAL",
        "price": "790.00",
        "interval": "YEAR",
        "interval_count": 1,
    },
]


def get_access_token(client_id: str, client_secret: str, base_url: str) -> str:
    """Get OAuth access token from PayPal."""
    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    req = Request(
        f"{base_url}/v1/oauth2/token",
        data=b"grant_type=client_credentials",
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    try:
        with urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            return data["access_token"]
    except HTTPError as e:
        print(f"Error getting access token: {e.code} {e.read().decode()}")
        sys.exit(1)


def create_product(access_token: str, base_url: str) -> str:
    """Create a PayPal Product for Site2CRM subscriptions."""
    product_data = {
        "name": "Site2CRM Subscription",
        "description": "Lead capture forms that sync directly to your CRM",
        "type": "SERVICE",
        "category": "SOFTWARE",
    }

    req = Request(
        f"{base_url}/v1/catalogs/products",
        data=json.dumps(product_data).encode(),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"Created Product: {data['id']}")
            return data["id"]
    except HTTPError as e:
        error_body = e.read().decode()
        # If product already exists with same name, try to find it
        if "DUPLICATE_RESOURCE_IDENTIFIER" in error_body:
            print("Product already exists, fetching existing...")
            return find_existing_product(access_token, base_url)
        print(f"Error creating product: {e.code} {error_body}")
        sys.exit(1)


def find_existing_product(access_token: str, base_url: str) -> str:
    """Find an existing Site2CRM product."""
    req = Request(
        f"{base_url}/v1/catalogs/products?page_size=20",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            for product in data.get("products", []):
                if "Site2CRM" in product.get("name", ""):
                    print(f"Found existing Product: {product['id']}")
                    return product["id"]
    except HTTPError as e:
        print(f"Error finding product: {e.code} {e.read().decode()}")
        sys.exit(1)

    print("No existing Site2CRM product found")
    sys.exit(1)


def create_plan(
    access_token: str,
    base_url: str,
    product_id: str,
    name: str,
    price: str,
    interval: str,
    interval_count: int,
) -> str:
    """Create a subscription plan."""
    plan_data = {
        "product_id": product_id,
        "name": f"Site2CRM {name}",
        "description": f"Site2CRM {name} subscription",
        "status": "ACTIVE",
        "billing_cycles": [
            {
                "frequency": {
                    "interval_unit": interval,
                    "interval_count": interval_count,
                },
                "tenure_type": "REGULAR",
                "sequence": 1,
                "total_cycles": 0,  # Unlimited cycles
                "pricing_scheme": {
                    "fixed_price": {
                        "value": price,
                        "currency_code": "USD",
                    }
                },
            }
        ],
        "payment_preferences": {
            "auto_bill_outstanding": True,
            "setup_fee_failure_action": "CONTINUE",
            "payment_failure_threshold": 3,
        },
    }

    req = Request(
        f"{base_url}/v1/billing/plans",
        data=json.dumps(plan_data).encode(),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            return data["id"]
    except HTTPError as e:
        print(f"Error creating plan {name}: {e.code} {e.read().decode()}")
        sys.exit(1)


def main():
    # Get credentials from environment
    client_id = os.environ.get("PAYPAL_CLIENT_ID")
    client_secret = os.environ.get("PAYPAL_CLIENT_SECRET")
    mode = os.environ.get("PAYPAL_MODE", "sandbox").lower()

    if not client_id or not client_secret:
        print("Error: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set")
        print("\nUsage:")
        print("  export PAYPAL_CLIENT_ID=xxx")
        print("  export PAYPAL_CLIENT_SECRET=xxx")
        print("  export PAYPAL_MODE=sandbox  # or 'live'")
        print("  python scripts/setup_paypal_plans.py")
        sys.exit(1)

    base_url = LIVE_BASE if mode == "live" else SANDBOX_BASE
    print(f"\nPayPal Mode: {mode.upper()}")
    print(f"API Base: {base_url}\n")

    # Get access token
    print("Authenticating with PayPal...")
    access_token = get_access_token(client_id, client_secret, base_url)
    print("Authentication successful!\n")

    # Create product
    print("Creating Site2CRM Product...")
    product_id = create_product(access_token, base_url)
    print()

    # Create plans
    print("Creating Subscription Plans...")
    created_plans = {}

    for plan in PLANS:
        plan_id = create_plan(
            access_token,
            base_url,
            product_id,
            plan["name"],
            plan["price"],
            plan["interval"],
            plan["interval_count"],
        )
        created_plans[plan["env_key"]] = plan_id
        print(f"  Created {plan['name']}: {plan_id}")

    # Print environment variables to add
    print("\n" + "=" * 60)
    print("SUCCESS! Add these to your .env file:")
    print("=" * 60 + "\n")

    print(f"# PayPal ({mode.upper()})")
    print(f"PAYPAL_CLIENT_ID={client_id}")
    print(f"PAYPAL_CLIENT_SECRET={client_secret}")
    print(f"PAYPAL_MODE={mode}")
    print(f"PAYPAL_PRODUCT_ID={product_id}")
    print()
    print("# PayPal Plan IDs")
    for env_key, plan_id in created_plans.items():
        print(f"{env_key}={plan_id}")

    print("\n" + "=" * 60)
    print("Next steps:")
    print("1. Copy the above to your .env file")
    print("2. Create a webhook in PayPal Developer Dashboard")
    print("   - URL: https://api.site2crm.io/api/paypal/webhook")
    print("   - Events: BILLING.SUBSCRIPTION.* and PAYMENT.SALE.COMPLETED")
    print("3. Add PAYPAL_WEBHOOK_ID to your .env file")
    print("=" * 60)


if __name__ == "__main__":
    main()
