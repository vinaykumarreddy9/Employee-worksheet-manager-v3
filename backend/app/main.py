from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from app.core.database import engine, Base
from app.api.routes import auth, timesheets
from app.api.endpoints import admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup - non-fatal to prevent 502 crashes
    if engine:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logging.info("Database tables created or verified.")
        except Exception as e:
            logging.warning(f"Database initialization delayed: {e}. Backend will retry on request.")
    else:
        logging.error("DATABASE_URL not set. Skipping table creation.")
    yield

app = FastAPI(title="Employee Timesheet Manager API", lifespan=lifespan)
logging.basicConfig(level=logging.INFO)
logging.info("Starting Employee Timesheet Manager API...")

# Preserve specialized HTTP exceptions
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

# Global Exception Handler to prevent HTML error pages
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"UNHANDLED ERROR: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root route
@app.get("/")
async def root():
    return {"message": "Welcome to Employee Timesheet Manager API"}

@app.get("/health")
async def health():
    if not engine:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "detail": "DATABASE_URL not configured"}
        )
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logging.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "error", "detail": "Database unavailable"}
        )

# Include routers
app.include_router(auth.router)
app.include_router(timesheets.router)
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
