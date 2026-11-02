import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models.attendance_record import (
    AttendanceRecord,
    AttendanceRecordCreate,
    AttendanceRecordUpdate,
    AttendanceStatus,
    AttendanceStatistics,
)
from app.repositories.attendance_record_repository import AttendanceRecordRepository
from app.repositories.attendance_session_repository import AttendanceSessionRepository
from app.models.attendance_session import AttendanceSessionUpdate
from app.services.base_service import BaseService


class AttendanceRecordService(BaseService[AttendanceRecord, AttendanceRecordRepository]):
    """Service pour la gestion des enregistrements de présence."""

    def __init__(self, session: Session):
        repository = AttendanceRecordRepository(session)
        super().__init__(repository)
        self.session_repository = AttendanceSessionRepository(session)

    def create_attendance_record(
        self, attendance_record_create: AttendanceRecordCreate
    ) -> AttendanceRecord:
        """Crée un nouvel enregistrement de présence avec validations."""
        # Vérifier si un enregistrement existe déjà
        if self.repository.exists_for_student_and_session(
            attendance_record_create.student_id,
            attendance_record_create.attendance_session_id
        ):
            raise ValueError(
                "An attendance record already exists for this student and session"
            )

        # Créer l'enregistrement
        attendance_record = AttendanceRecord.model_validate(attendance_record_create)
        created_record = self.repository.create(attendance_record)
        
        # Mettre à jour les compteurs de la séance
        self._update_session_counters(created_record.attendance_session_id)
        
        return created_record

    def update_attendance_record(
        self, attendance_record_id: uuid.UUID, 
        attendance_record_update: AttendanceRecordUpdate
    ) -> Optional[AttendanceRecord]:
        """Met à jour un enregistrement de présence."""
        attendance_record = self.repository.get_by_id(attendance_record_id)
        if not attendance_record:
            return None

        # Mettre à jour
        attendance_record_update.updated_at = datetime.utcnow()
        updated_record = self.repository.update(attendance_record_id, attendance_record_update)
        
        # Mettre à jour les compteurs de la séance
        if updated_record:
            self._update_session_counters(updated_record.attendance_session_id)
        
        return updated_record

    def mark_present(
        self, student_id: uuid.UUID, attendance_session_id: uuid.UUID
    ) -> AttendanceRecord:
        """Marque un étudiant comme présent."""
        return self._mark_attendance(
            student_id, attendance_session_id, AttendanceStatus.PRESENT
        )

    def mark_absent(
        self, student_id: uuid.UUID, attendance_session_id: uuid.UUID
    ) -> AttendanceRecord:
        """Marque un étudiant comme absent."""
        return self._mark_attendance(
            student_id, attendance_session_id, AttendanceStatus.ABSENT
        )

    def mark_late(
        self, student_id: uuid.UUID, attendance_session_id: uuid.UUID
    ) -> AttendanceRecord:
        """Marque un étudiant comme en retard."""
        return self._mark_attendance(
            student_id, attendance_session_id, AttendanceStatus.LATE
        )

    def mark_excused(
        self, student_id: uuid.UUID, attendance_session_id: uuid.UUID,
        excuse_document: Optional[str] = None
    ) -> AttendanceRecord:
        """Marque un étudiant comme excusé."""
        return self._mark_attendance(
            student_id, attendance_session_id, AttendanceStatus.EXCUSED,
            excuse_document=excuse_document, is_excused=True
        )

    def _mark_attendance(
        self, student_id: uuid.UUID, attendance_session_id: uuid.UUID,
        status: AttendanceStatus, excuse_document: Optional[str] = None,
        is_excused: bool = False
    ) -> AttendanceRecord:
        """Marque la présence d'un étudiant."""
        # Vérifier si un enregistrement existe
        existing = self.repository.get_by_student_and_session(
            student_id, attendance_session_id
        )
        
        if existing:
            # Mettre à jour l'enregistrement existant
            update = AttendanceRecordUpdate(
                status=status,
                arrival_time=datetime.utcnow() if status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE] else None,
                excuse_document=excuse_document,
                is_excused=is_excused,
                updated_at=datetime.utcnow()
            )
            return self.repository.update(existing.id, update)
        else:
            # Créer un nouvel enregistrement
            create = AttendanceRecordCreate(
                student_id=student_id,
                attendance_session_id=attendance_session_id,
                status=status,
                arrival_time=datetime.utcnow() if status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE] else None,
                excuse_document=excuse_document,
                is_excused=is_excused
            )
            return self.create_attendance_record(create)

    def _update_session_counters(self, attendance_session_id: uuid.UUID) -> None:
        """Met à jour les compteurs de présence d'une séance."""
        # Compter par statut
        present_count = self.repository.count_by_status(
            attendance_session_id, AttendanceStatus.PRESENT
        )
        absent_count = self.repository.count_by_status(
            attendance_session_id, AttendanceStatus.ABSENT
        )
        late_count = self.repository.count_by_status(
            attendance_session_id, AttendanceStatus.LATE
        )
        
        # Mettre à jour la séance
        update = AttendanceSessionUpdate(
            present_students=present_count,
            absent_students=absent_count,
            late_students=late_count,
            total_students=present_count + absent_count + late_count,
            updated_at=datetime.utcnow()
        )
        self.session_repository.update(attendance_session_id, update)

    def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        student_query: Optional[str] = None,
        status: Optional[str] = None,
        teacher_id: Optional["uuid.UUID"] = None,
        course_id: Optional["uuid.UUID"] = None,
        academic_year_id: Optional["uuid.UUID"] = None,
        year_level: Optional[int] = None,
        program_level_id: Optional["uuid.UUID"] = None,
        session_id: Optional["uuid.UUID"] = None,
    ) -> list[AttendanceRecord]:
        """Récupère tous les enregistrements avec filtres."""
        return self.repository.get_all(
            skip=skip, limit=limit, student_query=student_query, status=status,
            teacher_id=teacher_id, course_id=course_id, academic_year_id=academic_year_id,
            year_level=year_level, program_level_id=program_level_id, session_id=session_id
        )

    def count_filtered(
        self, student_query: Optional[str] = None, status: Optional[str] = None,
        teacher_id: Optional["uuid.UUID"] = None,
        course_id: Optional["uuid.UUID"] = None,
        academic_year_id: Optional["uuid.UUID"] = None,
        year_level: Optional[int] = None,
        program_level_id: Optional["uuid.UUID"] = None,
        session_id: Optional["uuid.UUID"] = None,
    ) -> int:
        """Compte les enregistrements avec filtres."""
        return self.repository.count_filtered(
            student_query=student_query, status=status, teacher_id=teacher_id,
            course_id=course_id, academic_year_id=academic_year_id,
            year_level=year_level, program_level_id=program_level_id, session_id=session_id
        )

    def get_by_attendance_session(
        self, attendance_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[AttendanceRecord]:
        """Récupère les enregistrements d'une séance."""
        return self.repository.get_by_attendance_session(
            attendance_session_id, skip, limit
        )

    def get_by_student(
        self, student_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[AttendanceRecord]:
        """Récupère les enregistrements d'un étudiant."""
        return self.repository.get_by_student(student_id, skip, limit)

    def get_by_status(
        self, attendance_session_id: uuid.UUID, status: AttendanceStatus,
        skip: int = 0, limit: int = 100
    ) -> list[AttendanceRecord]:
        """Récupère les enregistrements par statut."""
        return self.repository.get_by_status(
            attendance_session_id, status, skip, limit
        )

    def get_student_statistics(
        self, student_id: uuid.UUID, schedule_id: uuid.UUID
    ) -> AttendanceStatistics:
        """Récupère les statistiques de présence d'un étudiant."""
        stats = self.repository.get_student_attendance_rate(student_id, schedule_id)
        return AttendanceStatistics(**stats)

    def bulk_mark_attendance(
        self, attendance_session_id: uuid.UUID,
        student_statuses: list[dict]
    ) -> list[AttendanceRecord]:
        """Marque la présence pour plusieurs étudiants en une fois."""
        records = []
        for student_status in student_statuses:
            student_id = student_status.get("student_id")
            status = student_status.get("status")
            
            if not student_id or not status:
                continue
            
            try:
                record = self._mark_attendance(
                    student_id, attendance_session_id, AttendanceStatus(status)
                )
                records.append(record)
            except Exception:
                continue
        
        return records