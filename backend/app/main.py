from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.db.mongodb import connect_db, close_db
from app.api.routes import resume, interview, dashboard, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


settings = get_settings()

app = FastAPI(
    title="InterviewOS",
    description="AI-Powered Interview Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(resume.router, prefix="/api/resume", tags=["Resume"])
app.include_router(interview.router, prefix="/api/interview", tags=["Interview"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "InterviewOS"}
