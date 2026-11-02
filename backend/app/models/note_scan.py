"""Schémas Pydantic pour la saisie automatique des notes par reconnaissance d'image.

Ce module ne définit AUCUNE table : la note reconnue est enregistrée dans la
table ``Grade`` existante (voir ``NotesScanService.save_note``). Les schémas
ci-dessous ne servent qu'aux échanges HTTP des routes ``/notes/scan`` et
``/notes/save``.
"""

import uuid

from pydantic import BaseModel, Field


class ScannedStudent(BaseModel):
    """Étudiant identifié à partir du matricule reconnu sur la fiche."""

    matricule: str = Field(description="Matricule reconnu (User.user_number).")
    nom: str | None = Field(default=None, description="Nom de famille.")
    prenom: str | None = Field(default=None, description="Prénom.")
    classe: str | None = Field(
        default=None,
        description="Programme / niveau de l'étudiant (libellé lisible).",
    )
    photo_url: str | None = Field(
        default=None, description="Photo de l'étudiant si disponible."
    )
    student_id: uuid.UUID | None = Field(
        default=None, description="Identifiant interne de l'étudiant."
    )


class NoteScanResponse(BaseModel):
    """Résultat d'une reconnaissance de fiche.

    Le frontend pré-remplit ses champs éditables avec ``matricule`` / ``note``
    puis, après correction éventuelle, appelle ``/notes/save``.
    """

    success: bool
    message: str | None = None

    # Valeurs reconnues (brutes après reconstruction case par case)
    matricule: str | None = None
    note: float | None = None

    # Validité vis-à-vis des règles métier (regex matricule, plage 0..20)
    matricule_valid: bool = False
    note_valid: bool = False

    # Étudiant retrouvé en base (None si matricule introuvable ou invalide)
    student: ScannedStudent | None = None
    student_found: bool = False

    # Confiance moyenne de l'OCR (0..1), utile pour alerter l'utilisateur
    matricule_confidence: float | None = None
    note_confidence: float | None = None

    # Aperçu (PNG base64) des zones découpées avant OCR — aide au diagnostic
    preview_image: str | None = None


class NoteSaveRequest(BaseModel):
    """Corps de ``POST /notes/save`` : enregistre/actualise la note.

    ``assessment_id`` désigne l'évaluation choisie sur la page (une note est
    toujours rattachée à une évaluation dans ce système).
    """

    matricule: str = Field(description="Matricule de l'étudiant.")
    note: float = Field(ge=0.0, le=20.0, description="Note sur 20 (brut).")
    assessment_id: uuid.UUID = Field(
        description="Évaluation à laquelle rattacher la note."
    )


class NoteSaveResponse(BaseModel):
    """Réponse de ``POST /notes/save``."""

    success: bool
    message: str
    grade_id: uuid.UUID | None = None
    created: bool = Field(
        default=False,
        description="True si une nouvelle note a été créée, False si mise à jour.",
    )
