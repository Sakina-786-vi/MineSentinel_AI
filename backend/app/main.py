"""Expose the backend FastAPI application through the ``app.main`` module path."""

from main import app

__all__ = ["app"]
