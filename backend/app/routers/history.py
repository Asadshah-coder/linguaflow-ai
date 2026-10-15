"""Per-user translation history (requires auth)."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])
MAX_PAGE = 50


@router.get("", response_model=list[schemas.HistoryOut])
def list_history(
    limit: int = Query(default=50, le=MAX_PAGE),
    offset: int = Query(default=0, ge=0),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.HistoryEntry)
        .filter(models.HistoryEntry.user_id == user.id)
        .order_by(models.HistoryEntry.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.post("", response_model=schemas.HistoryOut, status_code=status.HTTP_201_CREATED)
def create_entry(
    payload: schemas.HistoryCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = models.HistoryEntry(user_id=user.id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    # Keep server history bounded per user (latest 200).
    stale = (
        db.query(models.HistoryEntry.id)
        .filter(models.HistoryEntry.user_id == user.id)
        .order_by(models.HistoryEntry.id.desc())
        .offset(200)
        .all()
    )
    if stale:
        db.query(models.HistoryEntry).filter(
            models.HistoryEntry.id.in_([row[0] for row in stale])
        ).delete(synchronize_session=False)
        db.commit()
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = (
        db.query(models.HistoryEntry)
        .filter(models.HistoryEntry.id == entry_id, models.HistoryEntry.user_id == user.id)
        .first()
    )
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    db.delete(entry)
    db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_history(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(models.HistoryEntry).filter(models.HistoryEntry.user_id == user.id).delete(
        synchronize_session=False
    )
    db.commit()
