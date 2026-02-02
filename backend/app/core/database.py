import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Ensure the URL uses the asyncpg driver and lacks incompatible sslmode params
if DATABASE_URL:
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Remove sslmode from query parameters as asyncpg doesn't support it
    if "?" in DATABASE_URL:
        base_url, query = DATABASE_URL.split("?", 1)
        params = query.split("&")
        params = [p for p in params if not p.startswith("sslmode=")]
        if params:
            DATABASE_URL = f"{base_url}?{'&'.join(params)}"
        else:
            DATABASE_URL = base_url

# Delayed initialization to prevent startup crashes
engine = None
AsyncSessionLocal = None

if DATABASE_URL:
    masked_url = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else "configured"
    print(f"DEBUG: Initializing Database Engine for {masked_url}")
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"ssl": True},
        pool_size=1,
        max_overflow=0,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True
    )
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()

async def get_db():
    if not AsyncSessionLocal:
        raise Exception("DATABASE_URL not configured. Please check your environment variables.")
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
