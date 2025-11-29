#!/usr/bin/env python3
"""Create notification_settings table.

Run this migration with:
    python migrations/add_notification_settings.py
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

    # Create notification_settings table
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notification_settings (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
                new_lead BOOLEAN NOT NULL DEFAULT TRUE,
                crm_error BOOLEAN NOT NULL DEFAULT TRUE,
                daily_digest BOOLEAN NOT NULL DEFAULT FALSE,
                weekly_digest BOOLEAN NOT NULL DEFAULT TRUE,
                salesperson_digest BOOLEAN NOT NULL DEFAULT FALSE,
                channel VARCHAR(20) NOT NULL DEFAULT 'email',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("SUCCESS: Created 'notification_settings' table")
    except Exception as e:
        if "already exists" in str(e).lower():
            print("SKIPPED: Table 'notification_settings' already exists")
        else:
            print(f"ERROR: {e}")

    # Create index on organization_id
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notification_settings_org_id ON notification_settings(organization_id)")
        print("SUCCESS: Created index on organization_id")
    except Exception as e:
        print(f"WARNING: Could not create index: {e}")

    conn.close()
    print("Migration completed!")


def migrate_sqlite(db_path):
    """Run migration on SQLite database."""
    import sqlite3

    db_path = db_path.replace("sqlite:///", "")
    print(f"Migrating SQLite database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create notification_settings table
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notification_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                organization_id INTEGER NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
                new_lead BOOLEAN NOT NULL DEFAULT 1,
                crm_error BOOLEAN NOT NULL DEFAULT 1,
                daily_digest BOOLEAN NOT NULL DEFAULT 0,
                weekly_digest BOOLEAN NOT NULL DEFAULT 1,
                salesperson_digest BOOLEAN NOT NULL DEFAULT 0,
                channel VARCHAR(20) NOT NULL DEFAULT 'email',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print("SUCCESS: Created 'notification_settings' table")
    except sqlite3.OperationalError as e:
        if "already exists" in str(e).lower():
            print("SKIPPED: Table 'notification_settings' already exists")
        else:
            print(f"ERROR: {e}")
            raise

    # Create index on organization_id
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notification_settings_org_id ON notification_settings(organization_id)")
        conn.commit()
        print("SUCCESS: Created index on organization_id")
    except sqlite3.OperationalError as e:
        print(f"WARNING: Could not create index: {e}")

    conn.close()
    print("Migration completed!")


if __name__ == "__main__":
    migrate()
