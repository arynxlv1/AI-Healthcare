from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .config import settings

# For Supabase pooler mode, we might need specific connect_args
# especially for SSL if not handled in the URL.
engine = create_engine(
    settings.DATABASE_URL,
    # pool_pre_ping=True is good for long-lived connections like poolers
    pool_pre_ping=True 
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
