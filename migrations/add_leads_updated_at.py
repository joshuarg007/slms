#!/usr/bin/env python3
"""Add updated_at column to leads table.

Run this migration with:
    python migrations/add_leads_updated_at.py
"""

import sqlite3
import os

# Get database path - adjust if needed
DB_PATH = os.environ.get("DATABASE_URL", "test.db").replace("sqlite:///", "")

def migrate():
    print(f"Migrating database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE leads ADD COLUMN updated_at DATETIME")
        conn.commit()
        print("SUCCESS: Added 'updated_at' column to leads table")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("SKIPPED: Column 'updated_at' already exists")
        else:
            print(f"ERROR: {e}")
            raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
