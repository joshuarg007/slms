#!/usr/bin/env python3
"""Add email verification fields to users table.

Run this migration with:
    python migrations/add_email_verification_fields.py
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

    print(f"Migrating PostgreSQL database...")
    conn = psycopg2.connect(db_url.replace("postgresql+psycopg2://", "postgresql://"))
    conn.autocommit = True
    cursor = conn.cursor()

    # Add email_verified column (default True for existing users)
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE")
        print("SUCCESS: Added 'email_verified' column to users table")
    except psycopg2.errors.DuplicateColumn:
        print("SKIPPED: Column 'email_verified' already exists")
    except Exception as e:
        print(f"ERROR: {e}")

    # Add email_verification_token column
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(100)")
        print("SUCCESS: Added 'email_verification_token' column to users table")
    except psycopg2.errors.DuplicateColumn:
        print("SKIPPED: Column 'email_verification_token' already exists")
    except Exception as e:
        print(f"ERROR: {e}")

    # Add email_verification_sent_at column
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN email_verification_sent_at TIMESTAMP")
        print("SUCCESS: Added 'email_verification_sent_at' column to users table")
    except psycopg2.errors.DuplicateColumn:
        print("SKIPPED: Column 'email_verification_sent_at' already exists")
    except Exception as e:
        print(f"ERROR: {e}")

    # Create index on email_verification_token for faster lookups
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token)")
        print("SUCCESS: Created index on 'email_verification_token'")
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

    # Add email_verified column (default True for existing users)
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 1")
        conn.commit()
        print("SUCCESS: Added 'email_verified' column to users table")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("SKIPPED: Column 'email_verified' already exists")
        else:
            print(f"ERROR: {e}")
            raise

    # Add email_verification_token column
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(100)")
        conn.commit()
        print("SUCCESS: Added 'email_verification_token' column to users table")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("SKIPPED: Column 'email_verification_token' already exists")
        else:
            print(f"ERROR: {e}")
            raise

    # Add email_verification_sent_at column
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN email_verification_sent_at DATETIME")
        conn.commit()
        print("SUCCESS: Added 'email_verification_sent_at' column to users table")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("SKIPPED: Column 'email_verification_sent_at' already exists")
        else:
            print(f"ERROR: {e}")
            raise

    # Create index on email_verification_token for faster lookups
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token)")
        conn.commit()
        print("SUCCESS: Created index on 'email_verification_token'")
    except sqlite3.OperationalError as e:
        print(f"WARNING: Could not create index: {e}")

    conn.close()
    print("Migration completed!")


if __name__ == "__main__":
    migrate()
