"""
Repository pour la vue complète des présences étudiants.
Fournit l'accès aux données de la vue v_student_attendance_complete avec
des méthodes optimisées pour les requêtes courantes.
"""

from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlmodel import Session, text, select
from sqlalchemy import func

from app.models.student_attendance_view import (
    StudentAttendanceComplete,
    StudentAttendanceCompletePublic,
    StudentAttendanceViewFilters,
    StudentAttendanceViewSummary,
    StudentAttendanceStatistics,
    AttendanceReport,
    CourseAttendanceSummary,
)


class StudentAttendanceViewRepository:
    """Repository pour les opérations sur la vue complète des présences."""
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_by_student_id(
        self,
        student_id: UUID,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentAttendanceViewFilters] = None,
    ) -> List[StudentAttendanceCompletePublic]:
        """Récupère les présences d'un étudiant spécifique."""
        
        query = """
        SELECT * FROM v_student_attendance_complete 
        WHERE student_id = :student_id
        """
        params = {"student_id": str(student_id)}
        
        # Ajouter les filtres
        query, params = self._apply_filters(query, params, filters)
        
        # Ajouter l'ordre et la pagination
        query += " ORDER BY session_date DESC, session_start_time DESC"
        query += f" LIMIT {limit} OFFSET {skip}"
        
        result = self.session.exec(text(query), params)
        return [self._parse_attendance_result(row) for row in result.fetchall()]
    
    def get_by_course_session(
        self,
        course_session_id: UUID,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentAttendanceViewFilters] = None,
    ) -> List[StudentAttendanceCompletePublic]:
        """Récupère les présences pour une session de cours."""
        
        query = """
        SELECT * FROM v_student_attendance_complete 
        WHERE course_session_id = :course_session_id
        """
        params = {"course_session_id": str(course_session_id)}
        
        query, params = self._apply_filters(query, params, filters)
        query += " ORDER BY student_name, session_date DESC"
        query += f" LIMIT {limit} OFFSET {skip}"
        
        result = self.session.exec(text(query), params)
        return [self._parse_attendance_result(row) for row in result.fetchall()]
    
    def get_by_attendance_session(
        self,
        attendance_session_id: UUID,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentAttendanceViewFilters] = None,
    ) -> List[StudentAttendanceCompletePublic]:
        """Récupère les présences pour une séance spécifique."""
        
        query = """
        SELECT * FROM v_student_attendance_complete 
        WHERE attendance_session_id = :attendance_session_id
        """
        params = {"attendance_session_id": str(attendance_session_id)}
        
        query, params = self._apply_filters(query, params, filters)
        query += " ORDER BY student_name"
        query += f" LIMIT {limit} OFFSET {skip}"
        
        result = self.session.exec(text(query), params)
        return [self._parse_attendance_result(row) for row in result.fetchall()]
    
    def get_by_academic_session(
        self,
        session_id: UUID,
        student_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentAttendanceViewFilters] = None,
    ) -> List[StudentAttendanceCompletePublic]:
        """Récupère les présences pour une session académique."""
        
        query = """
        SELECT * FROM v_student_attendance_complete 
        WHERE session_id = :session_id
        """
        params = {"session_id": str(session_id)}
        
        if student_id:
            query += " AND student_id = :student_id"
            params["student_id"] = str(student_id)
        
        query, params = self._apply_filters(query, params, filters)
        query += " ORDER BY session_date DESC, student_name, course_name"
        query += f" LIMIT {limit} OFFSET {skip}"
        
        result = self.session.exec(text(query), params)
        return [self._parse_attendance_result(row) for row in result.fetchall()]
    
    def get_by_teacher(
        self,
        teacher_id: UUID,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentAttendanceViewFilters] = None,
    ) -> List[StudentAttendanceCompletePublic]:
        """Récupère les présences pour un enseignant."""
        
        query = """
        SELECT * FROM v_student_attendance_complete 
        WHERE teacher_id = :teacher_id
        """
        params = {"teacher_id": str(teacher_id)}
        
        query, params = self._apply_filters(query, params, filters)
        query += " ORDER BY session_date DESC, course_name, student_name"
        query += f" LIMIT {limit} OFFSET {skip}"
        
        result = self.session.exec(text(query), params)
        return [self._parse_attendance_result(row) for row in result.fetchall()]
    
    def get_by_date_range(
        self,
        start_date: date,
        end_date: date,
        student_id: Optional[UUID] = None,
        course_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[StudentAttendanceCompletePublic]:
        """Récupère les présences dans une période donnée."""
        
        query = """
        SELECT * FROM v_student_attendance_complete 
        WHERE session_date BETWEEN :start_date AND :end_date
        """
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        
        if student_id:
            query += " AND student_id = :student_id"
            params["student_id"] = str(student_id)
        
        if course_id:
            query += " AND course_id = :course_id"
            params["course_id"] = str(course_id)
        
        query += " ORDER BY session_date DESC, student_name"
        query += f" LIMIT {limit} OFFSET {skip}"
        
        result = self.session.exec(text(query), params)
        return [self._parse_attendance_result(row) for row in result.fetchall()]
    
    def search_attendance(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentAttendanceViewFilters] = None,
    ) -> List[StudentAttendanceCompletePublic]:
        """Recherche dans les présences par nom d'étudiant, cours, etc."""
        
        query = """
        SELECT * FROM v_student_attendance_complete 
        WHERE (
            LOWER(student_name) LIKE LOWER(:search_term) OR
            LOWER(student_number) LIKE LOWER(:search_term) OR
            LOWER(course_name) LIKE LOWER(:search_term) OR
            LOWER(course_code) LIKE LOWER(:search_term) OR
            LOWER(teacher_name) LIKE LOWER(:search_term)
        )
        """
        params = {"search_term": f"%{search_term}%"}
        
        query, params = self._apply_filters(query, params, filters)
        query += " ORDER BY session_date DESC, student_name"
        query += f" LIMIT {limit} OFFSET {skip}"
        
        result = self.session.exec(text(query), params)
        return [self._parse_attendance_result(row) for row in result.fetchall()]
    
    def get_student_attendance_statistics(
        self,
        student_id: UUID,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        course_id: Optional[UUID] = None,
    ) -> StudentAttendanceStatistics:
        """Calcule les statistiques de présence pour un étudiant."""
        
        query = """
        SELECT 
            COUNT(*) as total_sessions,
            COUNT(CASE WHEN attendance_category IN ('on_time', 'late_arrival') THEN 1 END) as attended_sessions,
            COUNT(CASE WHEN attendance_category IN ('unexcused_absence') THEN 1 END) as absent_sessions,
            COUNT(CASE WHEN attendance_category = 'late' THEN 1 END) as late_sessions,
            COUNT(CASE WHEN attendance_category = 'excused_absence' THEN 1 END) as excused_sessions,
            COUNT(CASE WHEN is_cancelled = true THEN 1 END) as cancelled_sessions,
            AVG(CASE WHEN minutes_late > 0 THEN minutes_late ELSE NULL END) as avg_minutes_late
        FROM v_student_attendance_complete 
        WHERE student_id = :student_id
        """
        params = {"student_id": str(student_id)}
        
        if date_from:
            query += " AND session_date >= :date_from"
            params["date_from"] = date_from.isoformat()
        
        if date_to:
            query += " AND session_date <= :date_to"
            params["date_to"] = date_to.isoformat()
        
        if course_id:
            query += " AND course_id = :course_id"
            params["course_id"] = str(course_id)
        
        result = self.session.exec(text(query), params).fetchone()
        
        if not result:
            return StudentAttendanceStatistics()
        
        total = result.total_sessions or 0
        attended = result.attended_sessions or 0
        absent = result.absent_sessions or 0
        late = result.late_sessions or 0
        excused = result.excused_sessions or 0
        cancelled = result.cancelled_sessions or 0
        avg_late = result.avg_minutes_late or 0.0
        
        # Calcul des pourcentages (excluant les sessions annulées)
        active_sessions = total - cancelled
        attendance_rate = (attended / active_sessions * 100) if active_sessions > 0 else 0
        absence_rate = (absent / active_sessions * 100) if active_sessions > 0 else 0
        punctuality_rate = ((attended - late) / active_sessions * 100) if active_sessions > 0 else 0
        excuse_rate = (excused / active_sessions * 100) if active_sessions > 0 else 0
        
        return StudentAttendanceStatistics(
            total_sessions=total,
            attended_sessions=attended,
            absent_sessions=absent,
            late_sessions=late,
            excused_sessions=excused,
            cancelled_sessions=cancelled,
            attendance_rate=round(attendance_rate, 2),
            absence_rate=round(absence_rate, 2),
            punctuality_rate=round(punctuality_rate, 2),
            excuse_rate=round(excuse_rate, 2),
            average_minutes_late=round(avg_late, 2),
        )
    
    def get_course_attendance_summary(
        self,
        course_session_id: UUID,
    ) -> CourseAttendanceSummary:
        """Génère un résumé de présence pour un cours."""
        
        # Obtenir les informations du cours
        course_info_query = """
        SELECT DISTINCT 
            course_id, course_code, course_name, credits,
            course_session_id, session_year_level,
            teacher_id, teacher_name, teacher_email,
            session_id, session_name, academic_year_name
        FROM v_student_attendance_complete 
        WHERE course_session_id = :course_session_id
        LIMIT 1
        """
        
        course_result = self.session.exec(
            text(course_info_query), 
            {"course_session_id": str(course_session_id)}
        ).fetchone()
        
        if not course_result:
            return CourseAttendanceSummary(
                course_info={},
                teacher_info={},
                session_info={},
            )
        
        # Statistiques du cours
        stats_query = """
        SELECT 
            COUNT(DISTINCT student_id) as total_students,
            COUNT(DISTINCT attendance_session_id) as total_sessions_held,
            COUNT(DISTINCT CASE WHEN is_cancelled = true THEN attendance_session_id END) as cancelled_sessions,
            AVG(CASE WHEN attendance_category IN ('on_time', 'late_arrival') THEN 1.0 ELSE 0.0 END) * 100 as avg_attendance_rate,
            AVG(session_present_students) as avg_students_per_session
        FROM v_student_attendance_complete 
        WHERE course_session_id = :course_session_id
        """
        
        stats_result = self.session.exec(
            text(stats_query), 
            {"course_session_id": str(course_session_id)}
        ).fetchone()
        
        # Présence par session
        sessions_query = """
        SELECT 
            attendance_session_id,
            session_date,
            session_topic,
            COUNT(*) as total_students_registered,
            COUNT(CASE WHEN attendance_category IN ('on_time', 'late_arrival') THEN 1 END) as present_count,
            COUNT(CASE WHEN attendance_category = 'unexcused_absence' THEN 1 END) as absent_count,
            COUNT(CASE WHEN attendance_category = 'late' THEN 1 END) as late_count,
            is_cancelled
        FROM v_student_attendance_complete 
        WHERE course_session_id = :course_session_id
        GROUP BY attendance_session_id, session_date, session_topic, is_cancelled
        ORDER BY session_date DESC
        """
        
        sessions_result = self.session.exec(
            text(sessions_query), 
            {"course_session_id": str(course_session_id)}
        ).fetchall()
        
        return CourseAttendanceSummary(
            course_info={
                "course_id": str(course_result.course_id),
                "course_code": course_result.course_code,
                "course_name": course_result.course_name,
                "credits": course_result.credits,
                "year_level": course_result.session_year_level,
            },
            teacher_info={
                "teacher_id": str(course_result.teacher_id),
                "teacher_name": course_result.teacher_name,
                "teacher_email": course_result.teacher_email,
            },
            session_info={
                "session_id": str(course_result.session_id),
                "session_name": course_result.session_name,
                "academic_year": course_result.academic_year_name,
            },
            total_students_enrolled=stats_result.total_students or 0,
            total_sessions_planned=stats_result.total_sessions_held or 0,
            total_sessions_held=(stats_result.total_sessions_held or 0) - (stats_result.cancelled_sessions or 0),
            total_sessions_cancelled=stats_result.cancelled_sessions or 0,
            average_attendance_rate=round(stats_result.avg_attendance_rate or 0, 2),
            average_students_per_session=round(stats_result.avg_students_per_session or 0, 1),
            attendance_by_session=[
                {
                    "session_id": str(session.attendance_session_id),
                    "date": session.session_date.isoformat() if session.session_date else None,
                    "topic": session.session_topic,
                    "present": session.present_count,
                    "absent": session.absent_count,
                    "late": session.late_count,
                    "total": session.total_students_registered,
                    "attendance_rate": round((session.present_count / session.total_students_registered * 100) if session.total_students_registered > 0 else 0, 1),
                    "is_cancelled": session.is_cancelled,
                }
                for session in sessions_result
            ]
        )
    
    def get_summary_statistics(
        self, 
        filters: Optional[StudentAttendanceViewFilters] = None
    ) -> StudentAttendanceViewSummary:
        """Génère des statistiques résumées pour la vue des présences."""
        
        base_query = "SELECT * FROM v_student_attendance_complete WHERE 1=1"
        params = {}
        
        query, params = self._apply_filters(base_query, params, filters)
        
        # Statistiques globales
        stats_query = f"""
        WITH filtered_data AS ({query})
        SELECT 
            COUNT(*) as total_records,
            COUNT(DISTINCT student_id) as total_students,
            COUNT(DISTINCT course_id) as total_courses,
            COUNT(DISTINCT attendance_session_id) as total_sessions,
            COUNT(CASE WHEN attendance_category IN ('on_time', 'late_arrival') THEN 1 END) as total_attended,
            COUNT(CASE WHEN attendance_category = 'unexcused_absence' THEN 1 END) as total_absent,
            COUNT(CASE WHEN attendance_category = 'late' THEN 1 END) as total_late,
            COUNT(CASE WHEN attendance_category = 'excused_absence' THEN 1 END) as total_excused,
            AVG(CASE WHEN minutes_late > 0 THEN minutes_late ELSE NULL END) as avg_minutes_late
        FROM filtered_data
        """
        
        result = self.session.exec(text(stats_query), params).fetchone()
        
        if not result:
            return StudentAttendanceViewSummary()
        
        total = result.total_records or 0
        attended = result.total_attended or 0
        absent = result.total_absent or 0
        late = result.total_late or 0
        excused = result.total_excused or 0
        
        attendance_rate = (attended / total * 100) if total > 0 else 0
        absence_rate = (absent / total * 100) if total > 0 else 0
        punctuality_rate = ((attended - late) / total * 100) if total > 0 else 0
        
        overall_stats = StudentAttendanceStatistics(
            total_sessions=result.total_sessions or 0,
            attended_sessions=attended,
            absent_sessions=absent,
            late_sessions=late,
            excused_sessions=excused,
            attendance_rate=round(attendance_rate, 2),
            absence_rate=round(absence_rate, 2),
            punctuality_rate=round(punctuality_rate, 2),
            average_minutes_late=round(result.avg_minutes_late or 0, 2),
        )
        
        return StudentAttendanceViewSummary(
            total_records=total,
            total_students=result.total_students or 0,
            total_courses=result.total_courses or 0,
            total_sessions=result.total_sessions or 0,
            overall_statistics=overall_stats,
        )
    
    def count_by_filters(self, filters: Optional[StudentAttendanceViewFilters] = None) -> int:
        """Compte le nombre d'enregistrements selon les filtres."""
        
        query = "SELECT COUNT(*) FROM v_student_attendance_complete WHERE 1=1"
        params = {}
        
        query, params = self._apply_filters(query, params, filters)
        
        result = self.session.exec(text(query), params).fetchone()
        return result[0] if result else 0
    
    def _apply_filters(
        self, 
        query: str, 
        params: Dict[str, Any], 
        filters: Optional[StudentAttendanceViewFilters]
    ) -> tuple[str, Dict[str, Any]]:
        """Applique les filtres à la requête."""
        
        if not filters:
            return query, params
        
        conditions = []
        
        # Filtres sur l'étudiant
        if filters.student_id:
            conditions.append("student_id = :filter_student_id")
            params["filter_student_id"] = str(filters.student_id)
        
        if filters.student_number:
            conditions.append("student_number ILIKE :student_number")
            params["student_number"] = f"%{filters.student_number}%"
        
        if filters.current_year_level is not None:
            conditions.append("current_year_level = :current_year_level")
            params["current_year_level"] = filters.current_year_level
        
        # Filtres sur la présence
        if filters.attendance_status:
            conditions.append("attendance_status = :attendance_status")
            params["attendance_status"] = filters.attendance_status
        
        if filters.attendance_category:
            conditions.append("attendance_category = :attendance_category")
            params["attendance_category"] = filters.attendance_category
        
        if filters.is_excused is not None:
            conditions.append("is_excused = :is_excused")
            params["is_excused"] = filters.is_excused
        
        # Filtres temporels
        if filters.session_date_from:
            conditions.append("session_date >= :session_date_from")
            params["session_date_from"] = filters.session_date_from.isoformat()
        
        if filters.session_date_to:
            conditions.append("session_date <= :session_date_to")
            params["session_date_to"] = filters.session_date_to.isoformat()
        
        if filters.day_of_week is not None:
            conditions.append("day_of_week = :day_of_week")
            params["day_of_week"] = filters.day_of_week
        
        # Filtres sur les cours et sessions
        if filters.course_id:
            conditions.append("course_id = :filter_course_id")
            params["filter_course_id"] = str(filters.course_id)
        
        if filters.course_session_id:
            conditions.append("course_session_id = :filter_course_session_id")
            params["filter_course_session_id"] = str(filters.course_session_id)
        
        if filters.session_id:
            conditions.append("session_id = :filter_session_id")
            params["filter_session_id"] = str(filters.session_id)
        
        if filters.teacher_id:
            conditions.append("teacher_id = :filter_teacher_id")
            params["filter_teacher_id"] = str(filters.teacher_id)
        
        # Filtres sur la ponctualité
        if filters.is_late is not None:
            if filters.is_late:
                conditions.append("minutes_late > 0")
            else:
                conditions.append("minutes_late = 0")
        
        if filters.max_minutes_late is not None:
            conditions.append("minutes_late <= :max_minutes_late")
            params["max_minutes_late"] = filters.max_minutes_late
        
        # Ajouter les conditions à la requête
        if conditions:
            query += " AND " + " AND ".join(conditions)
        
        return query, params
    
    def _parse_attendance_result(self, row) -> StudentAttendanceCompletePublic:
        """Parse une ligne de résultat en modèle StudentAttendanceCompletePublic."""
        
        return StudentAttendanceCompletePublic(
            # Informations de l'étudiant
            student_id=row.student_id,
            student_number=row.student_number,
            current_year_level=row.current_year_level,
            student_name=row.student_name,
            student_email=row.student_email,
            
            # Informations de la présence
            attendance_record_id=row.attendance_record_id,
            attendance_status=row.attendance_status,
            arrival_time=row.arrival_time,
            is_excused=row.is_excused,
            excuse_document=row.excuse_document,
            attendance_notes=row.attendance_notes,
            record_created_at=row.record_created_at,
            
            # Informations de la séance
            attendance_session_id=row.attendance_session_id,
            session_date=row.session_date,
            session_start_time=row.session_start_time,
            session_end_time=row.session_end_time,
            session_topic=row.session_topic,
            session_description=row.session_description,
            actual_room=row.actual_room,
            actual_building=row.actual_building,
            is_cancelled=row.is_cancelled,
            cancellation_reason=row.cancellation_reason,
            attendance_taken=row.attendance_taken,
            session_total_students=row.session_total_students,
            session_present_students=row.session_present_students,
            
            # Calcul du retard
            minutes_late=row.minutes_late or 0.0,
            
            # Informations de l'horaire
            schedule_id=row.schedule_id,
            day_of_week=row.day_of_week,
            scheduled_start_time=row.scheduled_start_time,
            scheduled_end_time=row.scheduled_end_time,
            room=row.room,
            building=row.building,
            
            # Informations du cours
            course_id=row.course_id,
            course_code=row.course_code,
            course_name=row.course_name,
            credits=row.credits,
            
            # Informations de la session du cours
            course_session_id=row.course_session_id,
            classroom=row.classroom,
            session_year_level=row.session_year_level,
            
            # Informations de la session académique
            session_id=row.session_id,
            session_name=row.session_name,
            session_number=row.session_number,
            session_start_date=row.session_start_date,
            session_end_date=row.session_end_date,
            
            # Informations de l'année académique
            academic_year_id=row.academic_year_id,
            academic_year_name=row.academic_year_name,
            is_current_year=row.is_current_year,
            
            # Informations du professeur
            teacher_id=row.teacher_id,
            teacher_name=row.teacher_name,
            teacher_email=row.teacher_email,
            
            # Catégorisation enrichie
            attendance_category=row.attendance_category,
            status_icon=row.status_icon,
        )