#!/usr/bin/env python3
"""Add email verification fields to users table.

Run this migration with:
    python migrations/add_email_verification_fields.py
"""

import sqlite3
import os

# Get database path - adjust if needed
DB_PATH = os.environ.get("DATABASE_URL", "test.db").replace("sqlite:///", "")


def migrate():
    print(f"Migrating database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
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
