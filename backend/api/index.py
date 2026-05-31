"""Vercel serverless entry point for FastAPI app."""
import sys
from pathlib import Path

# Add parent directory to path so 'app' package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402
