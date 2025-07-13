from app.db.session import engine, Base

print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Creating fresh tables...")
Base.metadata.create_all(bind=engine)
print("Done.")
