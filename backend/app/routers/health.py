from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    # Verify SQLite connectivity
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as exc:
        db_status = f"unreachable: {str(exc)}"

    return {
        "status": "healthy",
        "database": db_status,
        "service": "FreshCart Backend API",
        "version": "1.0.0"
    }
