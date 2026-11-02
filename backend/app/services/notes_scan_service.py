"""Orchestration de la saisie automatique des notes.

Fait le lien entre :
  * la reconnaissance d'image (``note_ocr_service``),
  * la recherche de l'étudiant par matricule (``StudentRepository``),
  * l'enregistrement de la note dans la table ``Grade`` existante.

Choix métier (validés avec l'utilisateur) :
  * Le matricule correspond à ``User.user_number``.
  * La note est enregistrée **brute sur 20** dans ``Grade.score``.
  * Une note est toujours rattachée à une évaluation (``assessment_id``).
  * On ne crée jamais d'étudiant ; on crée ou met à jour uniquement la note.
"""

from __future__ import annotations

import logging
import re
import uuid
from datetime import date, datetime

from sqlmodel import Session

from app.models.assessment import Assessment
from app.models.grade import ExamType, Grade
from app.models.note_scan import (
    NoteSaveResponse,
    NoteScanResponse,
    ScannedStudent,
)
from app.repositories.grade_repository import GradeRepository
from app.repositories.student_repository import StudentRepository

logger = logging.getLogger(__name__)

MATRICULE_RE = re.compile(r"^[A-Z]{2}[0-9]{6}$")
PASSING_THRESHOLD_ON_20 = 10.0  # seuil de réussite sur 20 (système haïtien/français)


class NotesScanService:
    """Service de la fonctionnalité « Saisie automatique des notes »."""

    def __init__(self, session: Session):
        self.session = session
        self.student_repo = StudentRepository(session)
        self.grade_repo = GradeRepository(session)

    # -- Reconnaissance -----------------------------------------------------
    def scan(self, image_bytes: bytes) -> NoteScanResponse:
        """Reconnaît la fiche et retrouve l'étudiant (sans rien enregistrer)."""
        # Import paresseux : n'importe OpenCV/EasyOCR que lorsqu'on scanne, pour
        # ne pas coupler le démarrage de l'application à ces dépendances lourdes.
        from app.services import note_ocr_service

        try:
            ocr = note_ocr_service.extract_matricule_and_note(image_bytes)
        except note_ocr_service.NoteOCRError as exc:
            logger.warning("Échec OCR: %s", exc)
            return NoteScanResponse(success=False, message=str(exc))
        except Exception:  # pragma: no cover - robustesse
            logger.exception("Erreur inattendue pendant l'OCR")
            return NoteScanResponse(
                success=False,
                message="Erreur interne pendant l'analyse de l'image.",
            )

        response = NoteScanResponse(
            success=True,
            matricule=ocr.matricule,
            note=ocr.note,
            matricule_valid=ocr.matricule_valid,
            note_valid=ocr.note_valid,
            matricule_confidence=ocr.matricule_confidence,
            note_confidence=ocr.note_confidence,
            preview_image=ocr.preview_png_b64,
        )

        # Recherche de l'étudiant uniquement si le matricule est valide.
        if ocr.matricule_valid and ocr.matricule:
            student = self.student_repo.get_by_student_number(ocr.matricule)
            if student is None:
                response.student_found = False
                response.message = "Matricule introuvable."
            else:
                response.student_found = True
                response.student = self._to_scanned_student(student, ocr.matricule)
        else:
            response.message = (
                "Matricule non reconnu ou invalide. Corrigez-le manuellement."
            )

        if ocr.warnings:
            suffix = " ".join(ocr.warnings)
            response.message = f"{response.message + ' ' if response.message else ''}{suffix}".strip()

        return response

    # -- Enregistrement -----------------------------------------------------
    def save_note(
        self,
        matricule: str,
        note: float,
        assessment_id: uuid.UUID,
        graded_by: str | None = None,
    ) -> NoteSaveResponse:
        """Crée ou met à jour la note d'un étudiant pour une évaluation.

        Lève ``ValueError`` (traduite en 400/404 par la route) en cas de
        matricule invalide/introuvable ou d'évaluation inexistante.
        """
        matricule = (matricule or "").strip().upper()
        if not MATRICULE_RE.match(matricule):
            raise ValueError("Matricule invalide (format attendu : AA000000).")
        if not (0.0 <= note <= 20.0):
            raise ValueError("Note hors plage (0 à 20).")

        student = self.student_repo.get_by_student_number(matricule)
        if student is None:
            raise ValueError("Matricule introuvable.")

        assessment = self.session.get(Assessment, assessment_id)
        if assessment is None:
            raise ValueError("Évaluation introuvable.")

        existing = self.grade_repo.get_by_student_and_assessment(
            student.id, assessment_id
        )
        is_passing = note >= PASSING_THRESHOLD_ON_20

        if existing is not None:
            existing.score = note
            existing.is_passing = is_passing
            existing.graded_date = date.today()
            existing.graded_by = graded_by
            existing.exam_type = ExamType.REGULAR
            existing.updated_at = datetime.utcnow()
            self.session.add(existing)
            self.session.commit()
            self.session.refresh(existing)
            logger.info(
                "Note mise à jour: matricule=%s assessment=%s note=%.2f/20",
                matricule, assessment_id, note,
            )
            return NoteSaveResponse(
                success=True,
                message="Note mise à jour.",
                grade_id=existing.id,
                created=False,
            )

        grade = Grade(
            student_id=student.id,
            assessment_id=assessment_id,
            score=note,
            is_passing=is_passing,
            exam_type=ExamType.REGULAR,
            graded_date=date.today(),
            graded_by=graded_by,
            is_published=False,
        )
        self.session.add(grade)
        self.session.commit()
        self.session.refresh(grade)
        logger.info(
            "Note créée: matricule=%s assessment=%s note=%.2f/20",
            matricule, assessment_id, note,
        )
        return NoteSaveResponse(
            success=True,
            message="Note enregistrée.",
            grade_id=grade.id,
            created=True,
        )

    # -- Helpers ------------------------------------------------------------
    @staticmethod
    def _to_scanned_student(student, matricule: str) -> ScannedStudent:
        """Construit la vue publique de l'étudiant reconnu."""
        user = getattr(student, "user", None)
        program_level = getattr(student, "program_level", None)
        program = getattr(program_level, "program", None) if program_level else None

        parts: list[str] = []
        if program is not None and getattr(program, "name", None):
            parts.append(program.name)
        if program_level is not None and getattr(program_level, "name", None):
            parts.append(program_level.name)
        classe = " — ".join(parts) if parts else None
        year = getattr(student, "current_year_level", None)
        if classe and year:
            classe = f"{classe} (Année {year})"

        return ScannedStudent(
            matricule=matricule,
            nom=getattr(user, "last_name", None),
            prenom=getattr(user, "first_name", None),
            classe=classe,
            photo_url=None,  # aucun champ photo dans le modèle actuel
            student_id=student.id,
        )
