#!/usr/bin/env python3
"""Add role, is_default, and created_at columns to users table.

Run this migration with:
    python migrations/add_user_role_fields.py
"""

import sqlite3
import os

# Get database path - adjust if needed
DB_PATH = os.environ.get("DATABASE_URL", "test.db").replace("sqlite:///", "")


def migrate():
    print(f"Migrating database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Add role column
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER'")
        conn.commit()
        print("SUCCESS: Added 'role' column to users table")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("SKIPPED: Column 'role' already exists")
        else:
            print(f"ERROR: {e}")
            raise

    # Add is_default column
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT 0")
        conn.commit()
        print("SUCCESS: Added 'is_default' column to users table")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("SKIPPED: Column 'is_default' already exists")
        else:
            print(f"ERROR: {e}")
            raise

    # Add created_at column
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN created_at DATETIME")
        conn.commit()
        print("SUCCESS: Added 'created_at' column to users table")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("SKIPPED: Column 'created_at' already exists")
        else:
            print(f"ERROR: {e}")
            raise

    # Set first user of each org as OWNER and is_default
    try:
        cursor.execute("""
            UPDATE users SET role = 'OWNER', is_default = 1
            WHERE id IN (
                SELECT MIN(id) FROM users GROUP BY organization_id
            )
        """)
        conn.commit()
        rows = cursor.rowcount
        print(f"SUCCESS: Set {rows} user(s) as OWNER and default for their org")
    except Exception as e:
        print(f"WARNING: Could not set default owners: {e}")

    conn.close()


if __name__ == "__main__":
    migrate()
