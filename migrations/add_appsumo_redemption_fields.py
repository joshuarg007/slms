#!/usr/bin/env python3
"""Add AppSumo redemption and addendum acceptance fields.

Creates:
- appsumo_codes table: Stores valid AppSumo codes with status tracking

Adds to organizations:
- appsumo_code: The redeemed AppSumo code
- appsumo_addendum_accepted: Whether addendum was accepted
- appsumo_addendum_version: Version of addendum accepted
- appsumo_addendum_accepted_at: When addendum was accepted
- appsumo_addendum_accepted_by_user_id: Who accepted the addendum

Adds to users:
- accepted_appsumo_addendum_at: When this user accepted
- accepted_appsumo_addendum_version: Version they accepted

Run this migration with:
    python migrations/add_appsumo_redemption_fields.py
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

    # Create appsumo_codes table
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS appsumo_codes (
                id SERIAL PRIMARY KEY,
                code VARCHAR(100) UNIQUE NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'unused',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                redeemed_at TIMESTAMP,
                revoked_at TIMESTAMP,
                redeemed_by_org_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
                revoked_reason VARCHAR(255),
                batch_id VARCHAR(50)
            )
        """)
        print("SUCCESS: Created 'appsumo_codes' table")
    except Exception as e:
        if "already exists" in str(e).lower():
            print("SKIPPED: Table 'appsumo_codes' already exists")
        else:
            print(f"ERROR creating table: {e}")

    # Create indexes on appsumo_codes
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_appsumo_codes_code ON appsumo_codes(code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_appsumo_codes_status ON appsumo_codes(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_appsumo_codes_batch ON appsumo_codes(batch_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_appsumo_codes_org ON appsumo_codes(redeemed_by_org_id)")
        print("SUCCESS: Created indexes on appsumo_codes")
    except Exception as e:
        print(f"WARNING: Could not create indexes: {e}")

    # Organization fields
    org_columns = [
        ("appsumo_code", "VARCHAR(100) UNIQUE"),
        ("appsumo_addendum_accepted", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("appsumo_addendum_version", "VARCHAR(10)"),
        ("appsumo_addendum_accepted_at", "TIMESTAMP"),
        ("appsumo_addendum_accepted_by_user_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
    ]

    for col_name, col_type in org_columns:
        try:
            cursor.execute(f"""
                ALTER TABLE organizations
                ADD COLUMN IF NOT EXISTS {col_name} {col_type}
            """)
            print(f"SUCCESS: Added '{col_name}' to organizations")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print(f"SKIPPED: Column '{col_name}' already exists")
            else:
                print(f"ERROR: {e}")

    # Create index on appsumo_code
    try:
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_organizations_appsumo_code
            ON organizations(appsumo_code)
        """)
        print("SUCCESS: Created index on appsumo_code")
    except Exception as e:
        print(f"WARNING: Could not create index: {e}")

    # User fields
    user_columns = [
        ("accepted_appsumo_addendum_at", "TIMESTAMP"),
        ("accepted_appsumo_addendum_version", "VARCHAR(10)"),
    ]

    for col_name, col_type in user_columns:
        try:
            cursor.execute(f"""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS {col_name} {col_type}
            """)
            print(f"SUCCESS: Added '{col_name}' to users")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print(f"SKIPPED: Column '{col_name}' already exists")
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

    # Create appsumo_codes table
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS appsumo_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code VARCHAR(100) UNIQUE NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'unused',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                redeemed_at DATETIME,
                revoked_at DATETIME,
                redeemed_by_org_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
                revoked_reason VARCHAR(255),
                batch_id VARCHAR(50)
            )
        """)
        conn.commit()
        print("SUCCESS: Created 'appsumo_codes' table")
    except sqlite3.OperationalError as e:
        if "already exists" in str(e).lower():
            print("SKIPPED: Table 'appsumo_codes' already exists")
        else:
            print(f"ERROR creating table: {e}")

    # Create indexes on appsumo_codes
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_appsumo_codes_code ON appsumo_codes(code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_appsumo_codes_status ON appsumo_codes(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_appsumo_codes_batch ON appsumo_codes(batch_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_appsumo_codes_org ON appsumo_codes(redeemed_by_org_id)")
        conn.commit()
        print("SUCCESS: Created indexes on appsumo_codes")
    except sqlite3.OperationalError as e:
        print(f"WARNING: Could not create indexes: {e}")

    # Check existing organization columns
    cursor.execute("PRAGMA table_info(organizations)")
    org_columns = [row[1] for row in cursor.fetchall()]

    # Organization fields
    org_new_columns = [
        ("appsumo_code", "VARCHAR(100) UNIQUE"),
        ("appsumo_addendum_accepted", "BOOLEAN NOT NULL DEFAULT 0"),
        ("appsumo_addendum_version", "VARCHAR(10)"),
        ("appsumo_addendum_accepted_at", "DATETIME"),
        ("appsumo_addendum_accepted_by_user_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
    ]

    for col_name, col_type in org_new_columns:
        if col_name not in org_columns:
            try:
                cursor.execute(f"""
                    ALTER TABLE organizations
                    ADD COLUMN {col_name} {col_type}
                """)
                conn.commit()
                print(f"SUCCESS: Added '{col_name}' to organizations")
            except sqlite3.OperationalError as e:
                print(f"ERROR: {e}")
        else:
            print(f"SKIPPED: Column '{col_name}' already exists in organizations")

    # Create index on appsumo_code
    try:
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_organizations_appsumo_code
            ON organizations(appsumo_code)
        """)
        conn.commit()
        print("SUCCESS: Created index on appsumo_code")
    except sqlite3.OperationalError as e:
        print(f"WARNING: Could not create index: {e}")

    # Check existing user columns
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [row[1] for row in cursor.fetchall()]

    # User fields
    user_new_columns = [
        ("accepted_appsumo_addendum_at", "DATETIME"),
        ("accepted_appsumo_addendum_version", "VARCHAR(10)"),
    ]

    for col_name, col_type in user_new_columns:
        if col_name not in user_columns:
            try:
                cursor.execute(f"""
                    ALTER TABLE users
                    ADD COLUMN {col_name} {col_type}
                """)
                conn.commit()
                print(f"SUCCESS: Added '{col_name}' to users")
            except sqlite3.OperationalError as e:
                print(f"ERROR: {e}")
        else:
            print(f"SKIPPED: Column '{col_name}' already exists in users")

    conn.close()
    print("Migration completed!")


if __name__ == "__main__":
    migrate()
