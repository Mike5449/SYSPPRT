"""
Repository pour la gestion des données de la vue complète des évaluations étudiants.
Gère l'accès à v_student_assessments_complete avec optimisations et requêtes complexes.
"""

from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlmodel import Session

from app.models.student_assessments_view import (
    StudentAssessmentsComplete,
    StudentAssessmentsViewFilters,
    AssessmentStatistics
)


class StudentAssessmentsViewRepository:
    """Repository pour les opérations sur la vue complète des évaluations étudiants."""
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_by_student_id(self, student_id: UUID) -> list[StudentAssessmentsComplete]:
        """
        Récupère toutes les évaluations d'un étudiant spécifique.
        
        Args:
            student_id: UUID de l'étudiant
            
        Returns:
            Liste des évaluations complètes de l'étudiant
        """
        query = text("""
            SELECT * FROM v_student_assessments_complete 
            WHERE student_id = :student_id
            ORDER BY 
                CASE 
                    WHEN due_date IS NULL THEN 2
                    WHEN deadline_status = 'overdue' THEN 0
                    WHEN deadline_status = 'urgent' THEN 1
                    ELSE 2
                END,
                due_date ASC NULLS LAST,
                assessment_date DESC,
                assessment_name
        """)
        
        result = self.session.exec(query, {"student_id": str(student_id)})
        return [StudentAssessmentsComplete(**row._asdict()) for row in result]
    
    def get_by_assessment_id(self, assessment_id: UUID) -> list[StudentAssessmentsComplete]:
        """
        Récupère tous les étudiants pour une évaluation spécifique.
        
        Args:
            assessment_id: UUID de l'évaluation
            
        Returns:
            Liste des étudiants avec leurs résultats pour cette évaluation
        """
        query = text("""
            SELECT * FROM v_student_assessments_complete 
            WHERE assessment_id = :assessment_id
            ORDER BY 
                CASE WHEN score IS NULL THEN 1 ELSE 0 END,
                score DESC NULLS LAST,
                student_name
        """)
        
        result = self.session.exec(query, {"assessment_id": str(assessment_id)})
        return [StudentAssessmentsComplete(**row._asdict()) for row in result]
    
    def get_by_course_session_id(self, course_session_id: UUID) -> list[StudentAssessmentsComplete]:
        """
        Récupère toutes les évaluations d'une session de cours.
        
        Args:
            course_session_id: UUID de la session de cours
            
        Returns:
            Liste des évaluations de la session avec les résultats des étudiants
        """
        query = text("""
            SELECT * FROM v_student_assessments_complete 
            WHERE course_session_id = :course_session_id
            ORDER BY 
                due_date ASC NULLS LAST,
                assessment_date ASC NULLS LAST,
                assessment_name,
                student_name
        """)
        
        result = self.session.exec(query, {"course_session_id": str(course_session_id)})
        return [StudentAssessmentsComplete(**row._asdict()) for row in result]
    
    def get_by_teacher_id(self, teacher_id: UUID) -> list[StudentAssessmentsComplete]:
        """
        Récupère toutes les évaluations des cours d'un enseignant.
        
        Args:
            teacher_id: UUID de l'enseignant
            
        Returns:
            Liste des évaluations de l'enseignant avec les résultats des étudiants
        """
        query = text("""
            SELECT * FROM v_student_assessments_complete 
            WHERE teacher_id = :teacher_id
            ORDER BY 
                CASE WHEN grade_id IS NULL THEN 0 ELSE 1 END,  -- Non notées en premier
                due_date ASC NULLS LAST,
                course_name,
                assessment_name,
                student_name
        """)
        
        result = self.session.exec(query, {"teacher_id": str(teacher_id)})
        return [StudentAssessmentsComplete(**row._asdict()) for row in result]
    
    def get_by_filters(
        self, 
        filters: StudentAssessmentsViewFilters,
        skip: int = 0,
        limit: int = 100
    ) -> list[StudentAssessmentsComplete]:
        """
        Récupère les évaluations selon des filtres spécifiques.
        
        Args:
            filters: Filtres à appliquer
            skip: Nombre d'enregistrements à ignorer
            limit: Nombre maximum d'enregistrements à retourner
            
        Returns:
            Liste filtrée des évaluations complètes
        """
        where_clauses = []
        params = {}
        
        # Construction des clauses WHERE basées sur les filtres
        if filters.student_id:
            where_clauses.append("student_id = :student_id")
            params["student_id"] = str(filters.student_id)
        
        if filters.student_number:
            where_clauses.append("student_number ILIKE :student_number")
            params["student_number"] = f"%{filters.student_number}%"
        
        if filters.current_year_level:
            where_clauses.append("current_year_level = :current_year_level")
            params["current_year_level"] = filters.current_year_level
        
        if filters.assessment_id:
            where_clauses.append("assessment_id = :assessment_id")
            params["assessment_id"] = str(filters.assessment_id)
        
        if filters.assessment_name:
            where_clauses.append("assessment_name ILIKE :assessment_name")
            params["assessment_name"] = f"%{filters.assessment_name}%"
        
        if filters.assessment_type:
            where_clauses.append("assessment_type = :assessment_type")
            params["assessment_type"] = filters.assessment_type
        
        if filters.is_mandatory is not None:
            where_clauses.append("is_mandatory = :is_mandatory")
            params["is_mandatory"] = filters.is_mandatory
        
        if filters.is_published is not None:
            where_clauses.append("is_published = :is_published")
            params["is_published"] = filters.is_published
        
        if filters.has_grade is not None:
            if filters.has_grade:
                where_clauses.append("grade_id IS NOT NULL")
            else:
                where_clauses.append("grade_id IS NULL")
        
        if filters.grade_published is not None:
            where_clauses.append("grade_published = :grade_published")
            params["grade_published"] = filters.grade_published
        
        if filters.is_passing is not None:
            where_clauses.append("is_passing = :is_passing")
            params["is_passing"] = filters.is_passing
        
        if filters.min_score:
            where_clauses.append("score >= :min_score")
            params["min_score"] = filters.min_score
        
        if filters.max_score_filter:
            where_clauses.append("score <= :max_score_filter")
            params["max_score_filter"] = filters.max_score_filter
        
        if filters.letter_grade:
            where_clauses.append("letter_grade = :letter_grade")
            params["letter_grade"] = filters.letter_grade
        
        if filters.course_id:
            where_clauses.append("course_id = :course_id")
            params["course_id"] = str(filters.course_id)
        
        if filters.course_code:
            where_clauses.append("course_code ILIKE :course_code")
            params["course_code"] = f"%{filters.course_code}%"
        
        if filters.course_name:
            where_clauses.append("course_name ILIKE :course_name")
            params["course_name"] = f"%{filters.course_name}%"
        
        if filters.course_session_id:
            where_clauses.append("course_session_id = :course_session_id")
            params["course_session_id"] = str(filters.course_session_id)
        
        if filters.session_id:
            where_clauses.append("session_id = :session_id")
            params["session_id"] = str(filters.session_id)
        
        if filters.academic_year_id:
            where_clauses.append("academic_year_id = :academic_year_id")
            params["academic_year_id"] = str(filters.academic_year_id)
        
        if filters.is_current_year is not None:
            where_clauses.append("is_current_year = :is_current_year")
            params["is_current_year"] = filters.is_current_year
        
        if filters.teacher_id:
            where_clauses.append("teacher_id = :teacher_id")
            params["teacher_id"] = str(filters.teacher_id)
        
        if filters.student_assessment_status:
            where_clauses.append("student_assessment_status = :student_assessment_status")
            params["student_assessment_status"] = filters.student_assessment_status
        
        if filters.deadline_status:
            where_clauses.append("deadline_status = :deadline_status")
            params["deadline_status"] = filters.deadline_status
        
        # Filtres temporels
        if filters.due_date_from:
            where_clauses.append("due_date >= :due_date_from")
            params["due_date_from"] = filters.due_date_from
        
        if filters.due_date_to:
            where_clauses.append("due_date <= :due_date_to")
            params["due_date_to"] = filters.due_date_to
        
        if filters.assessment_date_from:
            where_clauses.append("assessment_date >= :assessment_date_from")
            params["assessment_date_from"] = filters.assessment_date_from
        
        if filters.assessment_date_to:
            where_clauses.append("assessment_date <= :assessment_date_to")
            params["assessment_date_to"] = filters.assessment_date_to
        
        if filters.graded_date_from:
            where_clauses.append("graded_date >= :graded_date_from")
            params["graded_date_from"] = filters.graded_date_from
        
        if filters.graded_date_to:
            where_clauses.append("graded_date <= :graded_date_to")
            params["graded_date_to"] = filters.graded_date_to
        
        # Construction de la requête finale
        base_query = "SELECT * FROM v_student_assessments_complete"
        
        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)
        
        base_query += """ 
            ORDER BY 
                CASE 
                    WHEN deadline_status = 'overdue' THEN 0
                    WHEN deadline_status = 'urgent' THEN 1
                    WHEN deadline_status = 'upcoming' THEN 2
                    ELSE 3
                END,
                due_date ASC NULLS LAST,
                assessment_name,
                student_name
        """
        base_query += f" OFFSET {skip} LIMIT {limit}"
        
        result = self.session.exec(text(base_query), params)
        return [StudentAssessmentsComplete(**row._asdict()) for row in result]
    
    def count_by_filters(self, filters: StudentAssessmentsViewFilters) -> int:
        """
        Compte le nombre total d'enregistrements correspondant aux filtres.
        
        Args:
            filters: Filtres à appliquer
            
        Returns:
            Nombre total d'enregistrements
        """
        where_clauses = []
        params = {}
        
        # Réutiliser la même logique de filtres que get_by_filters
        # (logique similaire mais pour COUNT)
        
        base_query = "SELECT COUNT(*) as count FROM v_student_assessments_complete"
        
        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)
        
        result = self.session.exec(text(base_query), params)
        return result.first().count
    
    def get_student_assessments_statistics(self, student_id: UUID) -> AssessmentStatistics:
        """
        Calcule les statistiques détaillées des évaluations pour un étudiant.
        
        Args:
            student_id: UUID de l'étudiant
            
        Returns:
            Statistiques complètes des évaluations de l'étudiant
        """
        query = text("""
            WITH assessment_stats AS (
                SELECT 
                    COUNT(*) as total_assessments,
                    COUNT(CASE WHEN grade_id IS NOT NULL THEN 1 END) as completed_assessments,
                    COUNT(CASE WHEN grade_id IS NULL THEN 1 END) as pending_assessments,
                    COUNT(CASE WHEN deadline_status = 'overdue' THEN 1 END) as overdue_assessments,
                    COUNT(CASE WHEN is_passing = true THEN 1 END) as passed_assessments,
                    COUNT(CASE WHEN is_passing = false THEN 1 END) as failed_assessments,
                    
                    AVG(CASE WHEN score IS NOT NULL THEN score END) as overall_average,
                    AVG(CASE WHEN score IS NOT NULL THEN (score * weight) END) as weighted_average,
                    AVG(CASE WHEN is_current_year = true AND score IS NOT NULL THEN score END) as current_semester_average,
                    
                    AVG(CASE WHEN assessment_type = 'exam' AND score IS NOT NULL THEN score END) as exam_average,
                    AVG(CASE WHEN assessment_type = 'quiz' AND score IS NOT NULL THEN score END) as quiz_average,
                    AVG(CASE WHEN assessment_type = 'assignment' AND score IS NOT NULL THEN score END) as assignment_average,
                    AVG(CASE WHEN assessment_type = 'project' AND score IS NOT NULL THEN score END) as project_average,
                    
                    COUNT(CASE WHEN deadline_status IN ('upcoming', 'urgent') THEN 1 END) as upcoming_deadlines,
                    COUNT(CASE WHEN deadline_status = 'urgent' THEN 1 END) as urgent_submissions,
                    
                    STDDEV(CASE WHEN score IS NOT NULL THEN score END) as score_stddev
                    
                FROM v_student_assessments_complete
                WHERE student_id = :student_id
            ),
            submission_stats AS (
                SELECT 
                    COUNT(CASE WHEN grade_id IS NOT NULL AND (due_date IS NULL OR graded_date <= due_date + INTERVAL '1 day') THEN 1 END)::float / 
                    NULLIF(COUNT(CASE WHEN grade_id IS NOT NULL THEN 1 END), 0) * 100 as on_time_rate
                FROM v_student_assessments_complete
                WHERE student_id = :student_id
            )
            SELECT 
                *,
                CASE 
                    WHEN completed_assessments = 0 THEN 0
                    ELSE (completed_assessments::float / NULLIF(total_assessments, 0)) * 100
                END as completion_rate,
                CASE 
                    WHEN completed_assessments = 0 THEN 0
                    ELSE (passed_assessments::float / NULLIF(completed_assessments, 0)) * 100
                END as success_rate,
                CASE 
                    WHEN score_stddev IS NULL OR overall_average IS NULL OR overall_average = 0 THEN 1.0
                    ELSE 1.0 / (1.0 + (score_stddev / overall_average))
                END as consistency_score,
                on_time_rate
            FROM assessment_stats, submission_stats
        """)
        
        result = self.session.exec(query, {"student_id": str(student_id)}).first()
        
        if not result:
            return AssessmentStatistics()
        
        # Déterminer la tendance de performance (simulation simple)
        performance_trend = "stable"
        if result.overall_average and result.current_semester_average:
            if result.current_semester_average > result.overall_average + 5:
                performance_trend = "improving"
            elif result.current_semester_average < result.overall_average - 5:
                performance_trend = "declining"
        
        return AssessmentStatistics(
            total_assessments=result.total_assessments or 0,
            completed_assessments=result.completed_assessments or 0,
            pending_assessments=result.pending_assessments or 0,
            overdue_assessments=result.overdue_assessments or 0,
            passed_assessments=result.passed_assessments or 0,
            failed_assessments=result.failed_assessments or 0,
            overall_average=float(result.overall_average or 0.0),
            weighted_average=float(result.weighted_average or 0.0),
            current_semester_average=float(result.current_semester_average or 0.0),
            completion_rate=float(result.completion_rate or 0.0),
            success_rate=float(result.success_rate or 0.0),
            on_time_submission_rate=float(result.on_time_rate or 0.0),
            exam_average=float(result.exam_average) if result.exam_average else None,
            quiz_average=float(result.quiz_average) if result.quiz_average else None,
            assignment_average=float(result.assignment_average) if result.assignment_average else None,
            project_average=float(result.project_average) if result.project_average else None,
            performance_trend=performance_trend,
            consistency_score=float(result.consistency_score or 0.0),
            upcoming_deadlines=result.upcoming_deadlines or 0,
            urgent_submissions=result.urgent_submissions or 0
        )
    
    def get_assessment_class_statistics(self, assessment_id: UUID) -> dict:
        """
        Calcule les statistiques de classe pour une évaluation spécifique.
        
        Args:
            assessment_id: UUID de l'évaluation
            
        Returns:
            Dictionnaire avec les statistiques de classe
        """
        query = text("""
            SELECT 
                COUNT(*) as total_students,
                COUNT(CASE WHEN grade_id IS NOT NULL THEN 1 END) as submitted_count,
                COUNT(CASE WHEN grade_id IS NULL THEN 1 END) as not_submitted_count,
                COUNT(CASE WHEN is_passing = true THEN 1 END) as passed_count,
                COUNT(CASE WHEN is_passing = false THEN 1 END) as failed_count,
                
                AVG(CASE WHEN score IS NOT NULL THEN score END) as class_average,
                MIN(CASE WHEN score IS NOT NULL THEN score END) as min_score,
                MAX(CASE WHEN score IS NOT NULL THEN score END) as max_score,
                STDDEV(CASE WHEN score IS NOT NULL THEN score END) as score_stddev,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score) as median_score,
                
                assessment_name,
                assessment_type,
                max_score as total_points,
                weight,
                course_name,
                
                COUNT(CASE WHEN score >= 90 THEN 1 END) as grade_a_count,
                COUNT(CASE WHEN score >= 80 AND score < 90 THEN 1 END) as grade_b_count,
                COUNT(CASE WHEN score >= 70 AND score < 80 THEN 1 END) as grade_c_count,
                COUNT(CASE WHEN score >= 60 AND score < 70 THEN 1 END) as grade_d_count,
                COUNT(CASE WHEN score < 60 THEN 1 END) as grade_f_count
                
            FROM v_student_assessments_complete
            WHERE assessment_id = :assessment_id
            GROUP BY assessment_id, assessment_name, assessment_type, max_score, weight, course_name
        """)
        
        result = self.session.exec(query, {"assessment_id": str(assessment_id)}).first()
        
        if not result:
            return {}
        
        return {
            "assessment_info": {
                "name": result.assessment_name,
                "type": result.assessment_type,
                "total_points": float(result.total_points),
                "weight": float(result.weight),
                "course_name": result.course_name
            },
            "participation": {
                "total_students": result.total_students,
                "submitted_count": result.submitted_count,
                "not_submitted_count": result.not_submitted_count,
                "submission_rate": (result.submitted_count / result.total_students * 100) if result.total_students > 0 else 0
            },
            "performance": {
                "class_average": float(result.class_average) if result.class_average else 0.0,
                "median_score": float(result.median_score) if result.median_score else 0.0,
                "min_score": float(result.min_score) if result.min_score else 0.0,
                "max_score": float(result.max_score) if result.max_score else 0.0,
                "score_stddev": float(result.score_stddev) if result.score_stddev else 0.0,
                "passed_count": result.passed_count,
                "failed_count": result.failed_count,
                "pass_rate": (result.passed_count / result.submitted_count * 100) if result.submitted_count > 0 else 0
            },
            "grade_distribution": {
                "A": result.grade_a_count,
                "B": result.grade_b_count,
                "C": result.grade_c_count,
                "D": result.grade_d_count,
                "F": result.grade_f_count
            }
        }
    
    def get_teacher_grading_workload(self, teacher_id: UUID) -> dict:
        """
        Calcule la charge de notation pour un enseignant.
        
        Args:
            teacher_id: UUID de l'enseignant
            
        Returns:
            Dictionnaire avec les informations de charge de travail
        """
        query = text("""
            SELECT 
                teacher_name,
                teacher_email,
                
                COUNT(*) as total_assessments,
                COUNT(CASE WHEN grade_id IS NOT NULL THEN 1 END) as graded_assessments,
                COUNT(CASE WHEN grade_id IS NULL THEN 1 END) as pending_grading,
                
                COUNT(CASE WHEN grade_id IS NULL AND due_date < CURRENT_DATE THEN 1 END) as overdue_grading,
                COUNT(CASE WHEN grade_id IS NULL AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 1 END) as urgent_grading,
                
                COUNT(DISTINCT course_session_id) as active_courses,
                COUNT(DISTINCT student_id) as total_students,
                
                AVG(CASE WHEN graded_date IS NOT NULL AND due_date IS NOT NULL THEN 
                    EXTRACT(DAY FROM graded_date - due_date) END) as avg_grading_delay_days
                
            FROM v_student_assessments_complete
            WHERE teacher_id = :teacher_id
            GROUP BY teacher_id, teacher_name, teacher_email
        """)
        
        result = self.session.exec(query, {"teacher_id": str(teacher_id)}).first()
        
        if not result:
            return {}
        
        return {
            "teacher_info": {
                "name": result.teacher_name,
                "email": result.teacher_email
            },
            "workload": {
                "total_assessments": result.total_assessments,
                "graded_assessments": result.graded_assessments,
                "pending_grading": result.pending_grading,
                "overdue_grading": result.overdue_grading,
                "urgent_grading": result.urgent_grading,
                "grading_completion_rate": (result.graded_assessments / result.total_assessments * 100) if result.total_assessments > 0 else 0
            },
            "scope": {
                "active_courses": result.active_courses,
                "total_students": result.total_students
            },
            "efficiency": {
                "avg_grading_delay_days": float(result.avg_grading_delay_days) if result.avg_grading_delay_days else 0.0
            }
        }
    
    def get_overdue_assessments(self, limit: int = 100) -> list[StudentAssessmentsComplete]:
        """
        Récupère les évaluations en retard.
        
        Args:
            limit: Nombre maximum de résultats
            
        Returns:
            Liste des évaluations en retard
        """
        query = text("""
            SELECT * FROM v_student_assessments_complete
            WHERE deadline_status = 'overdue'
            ORDER BY days_until_due DESC, assessment_name, student_name
            LIMIT :limit
        """)
        
        result = self.session.exec(query, {"limit": limit})
        return [StudentAssessmentsComplete(**row._asdict()) for row in result]
    
    def get_urgent_assessments(self, days_ahead: int = 7, limit: int = 100) -> list[StudentAssessmentsComplete]:
        """
        Récupère les évaluations urgentes (à rendre bientôt).
        
        Args:
            days_ahead: Nombre de jours à regarder en avant
            limit: Nombre maximum de résultats
            
        Returns:
            Liste des évaluations urgentes
        """
        query = text("""
            SELECT * FROM v_student_assessments_complete
            WHERE deadline_status IN ('urgent', 'upcoming')
            AND due_date <= CURRENT_DATE + INTERVAL ':days_ahead days'
            AND grade_id IS NULL
            ORDER BY due_date ASC, assessment_name, student_name
            LIMIT :limit
        """)
        
        result = self.session.exec(query, {"days_ahead": days_ahead, "limit": limit})
        return [StudentAssessmentsComplete(**row._asdict()) for row in result]
    
    def search_assessments(self, search_term: str, limit: int = 50) -> list[StudentAssessmentsComplete]:
        """
        Recherche des évaluations par nom, description, cours ou étudiant.
        
        Args:
            search_term: Terme de recherche
            limit: Nombre maximum de résultats
            
        Returns:
            Liste des évaluations correspondant à la recherche
        """
        query = text("""
            SELECT * FROM v_student_assessments_complete
            WHERE 
                assessment_name ILIKE :search_term OR 
                assessment_description ILIKE :search_term OR 
                course_name ILIKE :search_term OR
                course_code ILIKE :search_term OR
                student_name ILIKE :search_term OR
                teacher_name ILIKE :search_term
            ORDER BY 
                CASE 
                    WHEN assessment_name ILIKE :exact_term THEN 1
                    WHEN course_code ILIKE :exact_term THEN 2
                    WHEN student_name ILIKE :exact_term THEN 3
                    ELSE 4
                END,
                deadline_status ASC,
                due_date ASC NULLS LAST
            LIMIT :limit
        """)
        
        search_pattern = f"%{search_term}%"
        exact_pattern = f"{search_term}%"
        
        result = self.session.exec(query, {
            "search_term": search_pattern,
            "exact_term": exact_pattern,
            "limit": limit
        })
        
        return [StudentAssessmentsComplete(**row._asdict()) for row in result]
    
    def get_assessments_by_date_range(
        self, 
        start_date: date, 
        end_date: date,
        student_id: Optional[UUID] = None,
        teacher_id: Optional[UUID] = None
    ) -> list[StudentAssessmentsComplete]:
        """
        Récupère les évaluations dans une période donnée.
        
        Args:
            start_date: Date de début
            end_date: Date de fin
            student_id: UUID optionnel de l'étudiant
            teacher_id: UUID optionnel de l'enseignant
            
        Returns:
            Liste des évaluations dans la période
        """
        where_clause = """
            (due_date BETWEEN :start_date AND :end_date OR 
             assessment_date BETWEEN :start_date AND :end_date)
        """
        params = {
            "start_date": start_date,
            "end_date": end_date
        }
        
        if student_id:
            where_clause += " AND student_id = :student_id"
            params["student_id"] = str(student_id)
        
        if teacher_id:
            where_clause += " AND teacher_id = :teacher_id"
            params["teacher_id"] = str(teacher_id)
        
        query = text(f"""
            SELECT * FROM v_student_assessments_complete
            WHERE {where_clause}
            ORDER BY due_date ASC NULLS LAST, assessment_date ASC NULLS LAST
        """)
        
        result = self.session.exec(query, params)
        return [StudentAssessmentsComplete(**row._asdict()) for row in result]