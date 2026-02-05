"""
One-time migration: Enable booking integration for all chat widgets.

This script links each chat widget to its organization's default booking config
and enables booking integration so the AI will direct users to schedule meetings.
"""
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


def main():
    session = Session()
    try:
        # Get all chat widgets that don't have booking enabled yet
        widgets_without_booking = session.execute(text("""
            SELECT cwc.id, cwc.widget_key, cwc.business_name, cwc.organization_id, cwc.booking_enabled, cwc.booking_config_id
            FROM chat_widget_configs cwc
            WHERE cwc.booking_enabled = false OR cwc.booking_config_id IS NULL
        """)).fetchall()

        if not widgets_without_booking:
            print("All chat widgets already have booking enabled!")
            return

        print(f"Found {len(widgets_without_booking)} chat widget(s) without booking enabled:")

        for widget in widgets_without_booking:
            widget_id, widget_key, business_name, org_id, booking_enabled, booking_config_id = widget
            print(f"  - {business_name} (key: {widget_key}, org: {org_id})")

            # Find the first (default) booking config for this organization
            booking_config = session.execute(text("""
                SELECT id, slug, business_name
                FROM booking_configs
                WHERE organization_id = :org_id
                ORDER BY created_at ASC
                LIMIT 1
            """), {"org_id": org_id}).fetchone()

            if booking_config:
                bc_id, bc_slug, bc_name = booking_config
                print(f"    -> Linking to booking config: {bc_name} (slug: {bc_slug})")

                # Enable booking and link to the booking config
                session.execute(text("""
                    UPDATE chat_widget_configs
                    SET booking_enabled = true, booking_config_id = :booking_config_id
                    WHERE id = :widget_id
                """), {"booking_config_id": bc_id, "widget_id": widget_id})
            else:
                print(f"    -> No booking config found for org {org_id}, skipping")

        session.commit()
        print("\nMigration completed!")

    except Exception as e:
        session.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
    print("Migration completed!")
