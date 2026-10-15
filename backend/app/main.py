"""LinguaFlow AI backend — FastAPI + JWT auth + per-user history.

In production this single service also serves the built frontend (../dist),
so one deploy covers API + app. In dev, run the Vite dev server separately
and let it proxy /api to this backend.
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from .routers import auth, history

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(history.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.app_name}


# ---- Serve the built frontend (production) ----
DIST = (Path(__file__).resolve().parent.parent / settings.frontend_dist).resolve()
if DIST.is_dir() and (DIST / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        # Let real files (favicon, etc.) serve; everything else → index.html.
        candidate = DIST / full_path
        if full_path and candidate.is_file() and DIST in candidate.resolve().parents:
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html")
