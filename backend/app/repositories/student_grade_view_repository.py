"""
Repository pour la vue v_student_grades_complete
Fournit des méthodes pour interroger la vue complète des notes étudiants
"""

from typing import Optional, Sequence
from uuid import UUID

from sqlmodel import Session, select, text, func
from sqlalchemy import and_, or_

from app.models.student_grade_view import (
    StudentGradeComplete,
    StudentGradeViewFilters,
    StudentGradeViewSummary,
)


class StudentGradeViewRepository:
    """Repository pour la vue complète des notes étudiants."""
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_by_student_id(
        self,
        student_id: UUID,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentGradeViewFilters] = None,
    ) -> Sequence[StudentGradeComplete]:
        """Récupère toutes les notes d'un étudiant via la vue complète."""
        
        # Base query sur la vue
        query = select(StudentGradeComplete).where(
            StudentGradeComplete.student_id == student_id
        )
        
        # Appliquer les filtres additionnels
        if filters:
            query = self._apply_filters(query, filters)
        
        # Ordre par défaut : session puis cours puis évaluation
        query = query.order_by(
            StudentGradeComplete.session_start_date.desc(),
            StudentGradeComplete.course_name,
            StudentGradeComplete.assessment_due_date.desc()
        )
        
        # Pagination
        query = query.offset(skip).limit(limit)
        
        return self.session.exec(query).all()
    
    def get_by_course_session(
        self,
        course_session_id: UUID,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentGradeViewFilters] = None,
    ) -> Sequence[StudentGradeComplete]:
        """Récupère toutes les notes d'une session de cours."""
        
        query = select(StudentGradeComplete).where(
            StudentGradeComplete.course_session_id == course_session_id
        )
        
        if filters:
            query = self._apply_filters(query, filters)
        
        query = query.order_by(
            StudentGradeComplete.student_number,
            StudentGradeComplete.assessment_due_date.desc()
        )
        
        return self.session.exec(query.offset(skip).limit(limit)).all()
    
    def get_by_academic_session(
        self,
        session_id: UUID,
        student_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentGradeViewFilters] = None,
    ) -> Sequence[StudentGradeComplete]:
        """Récupère les notes pour une session académique (semestre)."""
        
        query = select(StudentGradeComplete).where(
            StudentGradeComplete.session_id == session_id
        )
        
        if student_id:
            query = query.where(StudentGradeComplete.student_id == student_id)
        
        if filters:
            query = self._apply_filters(query, filters)
        
        query = query.order_by(
            StudentGradeComplete.student_number,
            StudentGradeComplete.course_name,
            StudentGradeComplete.assessment_due_date.desc()
        )
        
        return self.session.exec(query.offset(skip).limit(limit)).all()
    
    def get_by_year_level(
        self,
        year_level: int,
        student_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentGradeViewFilters] = None,
    ) -> Sequence[StudentGradeComplete]:
        """Récupère les notes pour un niveau d'année."""
        
        query = select(StudentGradeComplete).where(
            StudentGradeComplete.course_session_year_level == year_level
        )
        
        if student_id:
            query = query.where(StudentGradeComplete.student_id == student_id)
        
        if filters:
            query = self._apply_filters(query, filters)
        
        query = query.order_by(
            StudentGradeComplete.session_start_date.desc(),
            StudentGradeComplete.student_number,
            StudentGradeComplete.course_name
        )
        
        return self.session.exec(query.offset(skip).limit(limit)).all()
    
    def get_student_transcript(
        self, student_id: UUID
    ) -> Sequence[StudentGradeComplete]:
        """Récupère le relevé complet d'un étudiant (toutes ses notes)."""
        
        query = select(StudentGradeComplete).where(
            and_(
                StudentGradeComplete.student_id == student_id,
                StudentGradeComplete.is_published == True
            )
        ).order_by(
            StudentGradeComplete.session_start_date,
            StudentGradeComplete.course_name,
            StudentGradeComplete.assessment_due_date
        )
        
        return self.session.exec(query).all()
    
    def count_by_filters(
        self, filters: Optional[StudentGradeViewFilters] = None
    ) -> int:
        """Compte le nombre de notes selon les filtres."""
        
        query = select(func.count(StudentGradeComplete.grade_id))
        
        if filters:
            # Créer une sous-requête avec les filtres appliqués
            subquery = select(StudentGradeComplete.grade_id)
            subquery = self._apply_filters(subquery, filters)
            query = select(func.count()).select_from(subquery.subquery())
        
        return self.session.exec(query).one()
    
    def get_summary_statistics(
        self, filters: Optional[StudentGradeViewFilters] = None
    ) -> StudentGradeViewSummary:
        """Calcule des statistiques résumées selon les filtres."""
        
        # Base query pour les statistiques
        base_query = select(StudentGradeComplete)
        
        if filters:
            base_query = self._apply_filters(base_query, filters)
        
        # Exécuter la requête pour obtenir les données
        results = self.session.exec(base_query).all()
        
        if not results:
            return StudentGradeViewSummary(
                total_grades=0,
                published_grades=0,
                passing_grades=0,
                failing_grades=0,
                total_credits=0,
                total_assessments=0,
                unique_courses=0,
                unique_sessions=0,
            )
        
        # Calculer les statistiques
        total_grades = len(results)
        published_grades = sum(1 for r in results if r.is_published)
        passing_grades = sum(1 for r in results if r.is_passing)
        failing_grades = sum(1 for r in results if not r.is_passing)
        
        scores = [r.score for r in results if r.score is not None]
        
        # Calcul de la moyenne pondérée
        weighted_sum = 0.0
        total_weight = 0.0
        for result in results:
            if result.score is not None and result.assessment_weight is not None:
                weighted_sum += result.score * (result.assessment_weight / 100)
                total_weight += result.assessment_weight / 100
        
        # Statistiques uniques
        unique_courses = len(set(r.course_id for r in results))
        unique_sessions = len(set(r.session_id for r in results))
        total_credits = sum(set((r.course_id, r.course_credits) for r in results))[1] if results else 0
        
        return StudentGradeViewSummary(
            total_grades=total_grades,
            published_grades=published_grades,
            passing_grades=passing_grades,
            failing_grades=failing_grades,
            average_score=sum(scores) / len(scores) if scores else None,
            weighted_average=weighted_sum / total_weight if total_weight > 0 else None,
            highest_score=max(scores) if scores else None,
            lowest_score=min(scores) if scores else None,
            total_credits=total_credits,
            total_assessments=total_grades,
            unique_courses=unique_courses,
            unique_sessions=unique_sessions,
        )
    
    def _apply_filters(
        self, query, filters: StudentGradeViewFilters
    ):
        """Applique les filtres à la requête."""
        
        if filters.student_id:
            query = query.where(StudentGradeComplete.student_id == filters.student_id)
        
        if filters.course_id:
            query = query.where(StudentGradeComplete.course_id == filters.course_id)
        
        if filters.session_id:
            query = query.where(StudentGradeComplete.session_id == filters.session_id)
        
        if filters.academic_year_id:
            query = query.where(StudentGradeComplete.academic_year_id == filters.academic_year_id)
        
        if filters.teacher_id:
            query = query.where(StudentGradeComplete.teacher_id == filters.teacher_id)
        
        if filters.program_id:
            query = query.where(StudentGradeComplete.program_id == filters.program_id)
        
        if filters.program_level_id:
            query = query.where(StudentGradeComplete.program_level_id == filters.program_level_id)
        
        if filters.year_level:
            query = query.where(StudentGradeComplete.course_session_year_level == filters.year_level)
        
        if filters.is_published is not None:
            query = query.where(StudentGradeComplete.is_published == filters.is_published)
        
        if filters.is_passing is not None:
            query = query.where(StudentGradeComplete.is_passing == filters.is_passing)
        
        if filters.assessment_type:
            query = query.where(StudentGradeComplete.assessment_type == filters.assessment_type)
        
        if filters.enrollment_status:
            query = query.where(StudentGradeComplete.enrollment_status == filters.enrollment_status)
        
        # Filtres de date
        if filters.graded_after:
            query = query.where(StudentGradeComplete.graded_date >= filters.graded_after)
        
        if filters.graded_before:
            query = query.where(StudentGradeComplete.graded_date <= filters.graded_before)
        
        if filters.session_start_after:
            query = query.where(StudentGradeComplete.session_start_date >= filters.session_start_after)
        
        if filters.session_start_before:
            query = query.where(StudentGradeComplete.session_start_date <= filters.session_start_before)
        
        # Filtres de score
        if filters.min_score is not None:
            query = query.where(StudentGradeComplete.score >= filters.min_score)
        
        if filters.max_score is not None:
            query = query.where(StudentGradeComplete.score <= filters.max_score)
        
        return query
    
    def search_grades(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentGradeViewFilters] = None,
    ) -> Sequence[StudentGradeComplete]:
        """Recherche dans les notes avec terme de recherche."""
        
        # Recherche dans plusieurs champs
        search_conditions = or_(
            StudentGradeComplete.student_first_name.ilike(f"%{search_term}%"),
            StudentGradeComplete.student_last_name.ilike(f"%{search_term}%"),
            StudentGradeComplete.student_number.ilike(f"%{search_term}%"),
            StudentGradeComplete.student_email.ilike(f"%{search_term}%"),
            StudentGradeComplete.course_name.ilike(f"%{search_term}%"),
            StudentGradeComplete.course_code.ilike(f"%{search_term}%"),
            StudentGradeComplete.assessment_name.ilike(f"%{search_term}%"),
            StudentGradeComplete.teacher_name.ilike(f"%{search_term}%"),
        )
        
        query = select(StudentGradeComplete).where(search_conditions)
        
        if filters:
            query = self._apply_filters(query, filters)
        
        query = query.order_by(
            StudentGradeComplete.student_number,
            StudentGradeComplete.session_start_date.desc(),
            StudentGradeComplete.course_name
        )
        
        return self.session.exec(query.offset(skip).limit(limit)).all()