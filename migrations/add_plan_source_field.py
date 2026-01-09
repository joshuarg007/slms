#!/usr/bin/env python3
"""Add plan_source and usage alert tracking fields to organizations table.

Adds:
- plan_source: Track where the plan came from (stripe, appsumo, manual)
- usage_alert_80_sent: Track if 80% usage email was sent this month
- usage_alert_100_sent: Track if 100% usage email was sent this month

Run this migration with:
    python migrations/add_plan_source_field.py
"""

import os


def migrate():
    db_url = os.environ.get("DATABASE_URL", "")

    if db_url.startswith("postgresql"):
        migrate_postgres(db_url)
    else:
        migrate_sqlite(db_url or "test.db")


def migrate_postgres(db_url):
    """Run migration on PostgreSQL database."""
    import psycopg2

    print("Migrating PostgreSQL database...")
    conn = psycopg2.connect(db_url.replace("postgresql+psycopg2://", "postgresql://"))
    conn.autocommit = True
    cursor = conn.cursor()

    # Add plan_source column
    try:
        cursor.execute("""
            ALTER TABLE organizations
            ADD COLUMN IF NOT EXISTS plan_source VARCHAR(20) NOT NULL DEFAULT 'stripe'
        """)
        print("SUCCESS: Added 'plan_source' column")
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
            print("SKIPPED: Column 'plan_source' already exists")
        else:
            print(f"ERROR: {e}")

    # Add usage_alert_80_sent column
    try:
        cursor.execute("""
            ALTER TABLE organizations
            ADD COLUMN IF NOT EXISTS usage_alert_80_sent BOOLEAN NOT NULL DEFAULT FALSE
        """)
        print("SUCCESS: Added 'usage_alert_80_sent' column")
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
            print("SKIPPED: Column 'usage_alert_80_sent' already exists")
        else:
            print(f"ERROR: {e}")

    # Add usage_alert_100_sent column
    try:
        cursor.execute("""
            ALTER TABLE organizations
            ADD COLUMN IF NOT EXISTS usage_alert_100_sent BOOLEAN NOT NULL DEFAULT FALSE
        """)
        print("SUCCESS: Added 'usage_alert_100_sent' column")
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
            print("SKIPPED: Column 'usage_alert_100_sent' already exists")
        else:
            print(f"ERROR: {e}")

    conn.close()
    print("Migration completed!")


def migrate_sqlite(db_path):
    """Run migration on SQLite database."""
    import sqlite3

    db_path = db_path.replace("sqlite:///", "")
    print(f"Migrating SQLite database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check existing columns
    cursor.execute("PRAGMA table_info(organizations)")
    columns = [row[1] for row in cursor.fetchall()]

    # Add plan_source
    if "plan_source" not in columns:
        try:
            cursor.execute("""
                ALTER TABLE organizations
                ADD COLUMN plan_source VARCHAR(20) NOT NULL DEFAULT 'stripe'
            """)
            conn.commit()
            print("SUCCESS: Added 'plan_source' column")
        except sqlite3.OperationalError as e:
            print(f"ERROR: {e}")
    else:
        print("SKIPPED: Column 'plan_source' already exists")

    # Add usage_alert_80_sent
    if "usage_alert_80_sent" not in columns:
        try:
            cursor.execute("""
                ALTER TABLE organizations
                ADD COLUMN usage_alert_80_sent BOOLEAN NOT NULL DEFAULT 0
            """)
            conn.commit()
            print("SUCCESS: Added 'usage_alert_80_sent' column")
        except sqlite3.OperationalError as e:
            print(f"ERROR: {e}")
    else:
        print("SKIPPED: Column 'usage_alert_80_sent' already exists")

    # Add usage_alert_100_sent
    if "usage_alert_100_sent" not in columns:
        try:
            cursor.execute("""
                ALTER TABLE organizations
                ADD COLUMN usage_alert_100_sent BOOLEAN NOT NULL DEFAULT 0
            """)
            conn.commit()
            print("SUCCESS: Added 'usage_alert_100_sent' column")
        except sqlite3.OperationalError as e:
            print(f"ERROR: {e}")
    else:
        print("SKIPPED: Column 'usage_alert_100_sent' already exists")

    conn.close()
    print("Migration completed!")


if __name__ == "__main__":
    migrate()
