"""Routes de la saisie automatique des notes par reconnaissance d'image.

  * ``POST /notes/scan`` — reçoit une photo (multipart) et renvoie le matricule
    et la note reconnus, avec l'étudiant retrouvé en base.
  * ``POST /notes/save`` — enregistre/actualise la note d'un étudiant pour une
    évaluation donnée.

Accès réservé aux professeurs et aux administrateurs.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session

from app.api import deps
from app.models.note_scan import (
    NoteSaveRequest,
    NoteSaveResponse,
    NoteScanResponse,
)
from app.models.user import User
from app.services.notes_scan_service import NotesScanService

router = APIRouter()
logger = logging.getLogger(__name__)

# Taille maximale d'image acceptée (garde-fou mémoire/OCR).
MAX_IMAGE_BYTES = 12 * 1024 * 1024  # 12 Mo


def _require_teacher_or_admin(current_user: User) -> None:
    """Autorise uniquement les professeurs et les administrateurs."""
    is_teacher = any(getattr(role, "code", None) == "TEACHER" for role in current_user.roles)
    if not current_user.is_superuser and not is_teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")


@router.post("/scan", response_model=NoteScanResponse)
async def scan_note(
    *,
    image: UploadFile = File(..., description="Photo de la fiche standardisée."),
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> Any:
    """Analyse une photo de fiche et renvoie le matricule + la note reconnus."""
    _require_teacher_or_admin(current_user)

    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image.")

    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="Image vide.")
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image trop volumineuse (max 12 Mo).")

    return NotesScanService(db).scan(content)


@router.post("/save", response_model=NoteSaveResponse)
def save_note(
    *,
    body: NoteSaveRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> Any:
    """Enregistre (ou met à jour) la note d'un étudiant pour une évaluation."""
    _require_teacher_or_admin(current_user)

    graded_by = (
        f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()
        or current_user.email
    )

    try:
        return NotesScanService(db).save_note(
            matricule=body.matricule,
            note=body.note,
            assessment_id=body.assessment_id,
            graded_by=graded_by,
        )
    except ValueError as exc:
        detail = str(exc)
        if "introuvable" in detail.lower():
            raise HTTPException(status_code=404, detail=detail)
        raise HTTPException(status_code=400, detail=detail)
