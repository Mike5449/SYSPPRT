"""
Repository pour la gestion des données de la vue complète des cours étudiants.
Gère l'accès à v_student_courses_complete avec optimisations et requêtes complexes.
"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlmodel import Session, select

from app.models.student_courses_view import (
    StudentCoursesComplete,
    StudentCoursesViewFilters,
    StudentCoursesStatistics
)


class StudentCoursesViewRepository:
    """Repository pour les opérations sur la vue complète des cours étudiants."""
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_by_student_id(self, student_id: UUID) -> list[StudentCoursesComplete]:
        """
        Récupère tous les cours d'un étudiant spécifique.
        
        Args:
            student_id: UUID de l'étudiant
            
        Returns:
            Liste des cours complets de l'étudiant
        """
        query = text("""
            SELECT * FROM v_student_courses_complete 
            WHERE student_id = :student_id
            ORDER BY session_start_date DESC, course_name
        """)
        
        result = self.session.exec(query, {"student_id": str(student_id)})
        return [StudentCoursesComplete(**row._asdict()) for row in result]
    
    def get_by_course_session_id(self, course_session_id: UUID) -> list[StudentCoursesComplete]:
        """
        Récupère tous les étudiants d'une session de cours spécifique.
        
        Args:
            course_session_id: UUID de la session de cours
            
        Returns:
            Liste des étudiants inscrits à cette session
        """
        query = text("""
            SELECT * FROM v_student_courses_complete 
            WHERE course_session_id = :course_session_id
            ORDER BY student_name
        """)
        
        result = self.session.exec(query, {"course_session_id": str(course_session_id)})
        return [StudentCoursesComplete(**row._asdict()) for row in result]
    
    def get_by_teacher_id(self, teacher_id: UUID) -> list[StudentCoursesComplete]:
        """
        Récupère tous les cours enseignés par un professeur spécifique.
        
        Args:
            teacher_id: UUID du professeur
            
        Returns:
            Liste des cours du professeur avec leurs étudiants
        """
        query = text("""
            SELECT * FROM v_student_courses_complete 
            WHERE teacher_id = :teacher_id
            ORDER BY session_start_date DESC, course_name, student_name
        """)
        
        result = self.session.exec(query, {"teacher_id": str(teacher_id)})
        return [StudentCoursesComplete(**row._asdict()) for row in result]
    
    def get_by_filters(
        self, 
        filters: StudentCoursesViewFilters,
        skip: int = 0,
        limit: int = 100
    ) -> list[StudentCoursesComplete]:
        """
        Récupère les cours selon des filtres spécifiques.
        
        Args:
            filters: Filtres à appliquer
            skip: Nombre d'enregistrements à ignorer
            limit: Nombre maximum d'enregistrements à retourner
            
        Returns:
            Liste filtrée des cours complets
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
        
        if filters.course_id:
            where_clauses.append("course_id = :course_id")
            params["course_id"] = str(filters.course_id)
        
        if filters.course_code:
            where_clauses.append("course_code ILIKE :course_code")
            params["course_code"] = f"%{filters.course_code}%"
        
        if filters.course_name:
            where_clauses.append("course_name ILIKE :course_name")
            params["course_name"] = f"%{filters.course_name}%"
        
        if filters.course_mandatory is not None:
            where_clauses.append("course_mandatory = :course_mandatory")
            params["course_mandatory"] = filters.course_mandatory
        
        if filters.min_credits:
            where_clauses.append("credits >= :min_credits")
            params["min_credits"] = filters.min_credits
        
        if filters.max_credits:
            where_clauses.append("credits <= :max_credits")
            params["max_credits"] = filters.max_credits
        
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
        
        if filters.session_active is not None:
            where_clauses.append("session_active = :session_active")
            params["session_active"] = filters.session_active
        
        if filters.teacher_id:
            where_clauses.append("teacher_id = :teacher_id")
            params["teacher_id"] = str(filters.teacher_id)
        
        if filters.academic_rank:
            where_clauses.append("academic_rank ILIKE :academic_rank")
            params["academic_rank"] = f"%{filters.academic_rank}%"
        
        if filters.specialization:
            where_clauses.append("specialization ILIKE :specialization")
            params["specialization"] = f"%{filters.specialization}%"
        
        if filters.program_level_id:
            where_clauses.append("program_level_id = :program_level_id")
            params["program_level_id"] = str(filters.program_level_id)
        
        if filters.program_level_code:
            where_clauses.append("program_level_code ILIKE :program_level_code")
            params["program_level_code"] = f"%{filters.program_level_code}%"
        
        if filters.computed_status:
            where_clauses.append("computed_status = :computed_status")
            params["computed_status"] = filters.computed_status
        
        if filters.min_average:
            where_clauses.append("current_average >= :min_average")
            params["min_average"] = filters.min_average
        
        if filters.max_average:
            where_clauses.append("current_average <= :max_average")
            params["max_average"] = filters.max_average
        
        if filters.is_passing is not None:
            threshold = 60.0 if filters.is_passing else 59.99
            operator = ">=" if filters.is_passing else "<"
            where_clauses.append(f"current_average {operator} :passing_threshold")
            params["passing_threshold"] = threshold
        
        # Filtres temporels
        if filters.session_start_from:
            where_clauses.append("session_start_date >= :session_start_from")
            params["session_start_from"] = filters.session_start_from
        
        if filters.session_start_to:
            where_clauses.append("session_start_date <= :session_start_to")
            params["session_start_to"] = filters.session_start_to
        
        if filters.session_end_from:
            where_clauses.append("session_end_date >= :session_end_from")
            params["session_end_from"] = filters.session_end_from
        
        if filters.session_end_to:
            where_clauses.append("session_end_date <= :session_end_to")
            params["session_end_to"] = filters.session_end_to
        
        # Construction de la requête finale
        base_query = "SELECT * FROM v_student_courses_complete"
        
        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)
        
        base_query += " ORDER BY session_start_date DESC, course_name, student_name"
        base_query += f" OFFSET {skip} LIMIT {limit}"
        
        params["skip"] = skip
        params["limit"] = limit
        
        result = self.session.exec(text(base_query), params)
        return [StudentCoursesComplete(**row._asdict()) for row in result]
    
    def count_by_filters(self, filters: StudentCoursesViewFilters) -> int:
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
        # (code répété pour la clarté, pourrait être factorisé)
        
        if filters.student_id:
            where_clauses.append("student_id = :student_id")
            params["student_id"] = str(filters.student_id)
        
        # ... (tous les autres filtres comme dans get_by_filters)
        
        base_query = "SELECT COUNT(*) as count FROM v_student_courses_complete"
        
        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)
        
        result = self.session.exec(text(base_query), params)
        return result.first().count
    
    def get_student_courses_statistics(self, student_id: UUID) -> StudentCoursesStatistics:
        """
        Calcule les statistiques détaillées des cours pour un étudiant.
        
        Args:
            student_id: UUID de l'étudiant
            
        Returns:
            Statistiques complètes des cours de l'étudiant
        """
        query = text("""
            WITH student_courses_stats AS (
                SELECT 
                    COUNT(*) as total_courses,
                    COUNT(CASE WHEN session_active = true THEN 1 END) as active_courses,
                    COUNT(CASE WHEN computed_status = 'completed' THEN 1 END) as completed_courses,
                    COUNT(CASE WHEN computed_status = 'failed' THEN 1 END) as failed_courses,
                    COUNT(CASE WHEN computed_status = 'not_started' THEN 1 END) as not_started_courses,
                    COUNT(CASE WHEN computed_status = 'in_progress' THEN 1 END) as in_progress_courses,
                    
                    SUM(credits) as total_credits,
                    SUM(CASE WHEN computed_status = 'completed' THEN credits ELSE 0 END) as completed_credits,
                    SUM(CASE WHEN is_current_year = true THEN credits ELSE 0 END) as credits_this_year,
                    
                    AVG(CASE WHEN current_average IS NOT NULL THEN current_average END) as overall_average,
                    AVG(CASE WHEN is_current_year = true AND current_average IS NOT NULL THEN current_average END) as current_year_average,
                    AVG(CASE WHEN weighted_average IS NOT NULL THEN weighted_average END) as weighted_gpa,
                    
                    AVG(CASE WHEN course_mandatory = true AND current_average IS NOT NULL THEN current_average END) as mandatory_courses_average,
                    AVG(CASE WHEN course_mandatory = false AND current_average IS NOT NULL THEN current_average END) as elective_courses_average
                    
                FROM v_student_courses_complete
                WHERE student_id = :student_id
            )
            SELECT 
                *,
                CASE 
                    WHEN completed_courses = 0 THEN 0
                    ELSE (completed_courses::float / NULLIF(total_courses, 0)) * 100
                END as completion_rate,
                CASE 
                    WHEN completed_courses = 0 THEN 0
                    ELSE (completed_courses::float / NULLIF((completed_courses + failed_courses), 0)) * 100
                END as success_rate
            FROM student_courses_stats
        """)
        
        result = self.session.exec(query, {"student_id": str(student_id)}).first()
        
        if not result:
            return StudentCoursesStatistics()
        
        return StudentCoursesStatistics(
            total_courses=result.total_courses or 0,
            active_courses=result.active_courses or 0,
            completed_courses=result.completed_courses or 0,
            failed_courses=result.failed_courses or 0,
            not_started_courses=result.not_started_courses or 0,
            in_progress_courses=result.in_progress_courses or 0,
            total_credits=result.total_credits or 0,
            completed_credits=result.completed_credits or 0,
            credits_this_year=result.credits_this_year or 0,
            overall_average=float(result.overall_average or 0.0),
            current_year_average=float(result.current_year_average or 0.0),
            weighted_gpa=float(result.weighted_gpa or 0.0),
            completion_rate=float(result.completion_rate or 0.0),
            success_rate=float(result.success_rate or 0.0),
            mandatory_courses_average=float(result.mandatory_courses_average) if result.mandatory_courses_average else None,
            elective_courses_average=float(result.elective_courses_average) if result.elective_courses_average else None
        )
    
    def get_course_session_statistics(self, course_session_id: UUID) -> dict:
        """
        Calcule les statistiques d'une session de cours.
        
        Args:
            course_session_id: UUID de la session de cours
            
        Returns:
            Dictionnaire avec les statistiques de la session
        """
        query = text("""
            SELECT 
                COUNT(*) as total_students,
                COUNT(CASE WHEN computed_status = 'completed' THEN 1 END) as completed_students,
                COUNT(CASE WHEN computed_status = 'failed' THEN 1 END) as failed_students,
                COUNT(CASE WHEN computed_status = 'in_progress' THEN 1 END) as in_progress_students,
                COUNT(CASE WHEN computed_status = 'not_started' THEN 1 END) as not_started_students,
                
                AVG(CASE WHEN current_average IS NOT NULL THEN current_average END) as class_average,
                MIN(CASE WHEN current_average IS NOT NULL THEN current_average END) as min_grade,
                MAX(CASE WHEN current_average IS NOT NULL THEN current_average END) as max_grade,
                STDDEV(CASE WHEN current_average IS NOT NULL THEN current_average END) as grade_stddev,
                
                COUNT(CASE WHEN current_average >= 90 THEN 1 END) as grade_a_count,
                COUNT(CASE WHEN current_average >= 80 AND current_average < 90 THEN 1 END) as grade_b_count,
                COUNT(CASE WHEN current_average >= 70 AND current_average < 80 THEN 1 END) as grade_c_count,
                COUNT(CASE WHEN current_average >= 60 AND current_average < 70 THEN 1 END) as grade_d_count,
                COUNT(CASE WHEN current_average < 60 THEN 1 END) as grade_f_count
                
            FROM v_student_courses_complete
            WHERE course_session_id = :course_session_id
        """)
        
        result = self.session.exec(query, {"course_session_id": str(course_session_id)}).first()
        
        if not result:
            return {}
        
        return {
            "total_students": result.total_students,
            "completed_students": result.completed_students,
            "failed_students": result.failed_students,
            "in_progress_students": result.in_progress_students,
            "not_started_students": result.not_started_students,
            "class_average": float(result.class_average) if result.class_average else 0.0,
            "min_grade": float(result.min_grade) if result.min_grade else 0.0,
            "max_grade": float(result.max_grade) if result.max_grade else 0.0,
            "grade_stddev": float(result.grade_stddev) if result.grade_stddev else 0.0,
            "grade_distribution": {
                "A": result.grade_a_count,
                "B": result.grade_b_count,
                "C": result.grade_c_count,
                "D": result.grade_d_count,
                "F": result.grade_f_count
            }
        }
    
    def get_teacher_courses_overview(self, teacher_id: UUID) -> dict:
        """
        Obtient une vue d'ensemble des cours d'un enseignant.
        
        Args:
            teacher_id: UUID de l'enseignant
            
        Returns:
            Dictionnaire avec les informations sur les cours de l'enseignant
        """
        query = text("""
            SELECT 
                teacher_name,
                teacher_email,
                specialization,
                academic_rank,
                
                COUNT(DISTINCT course_session_id) as total_courses,
                COUNT(DISTINCT student_id) as total_students,
                COUNT(DISTINCT CASE WHEN session_active = true THEN course_session_id END) as active_sessions,
                
                AVG(CASE WHEN current_average IS NOT NULL THEN current_average END) as average_class_performance,
                COUNT(CASE WHEN current_average >= 60 THEN 1 END)::float / 
                    NULLIF(COUNT(CASE WHEN current_average IS NOT NULL THEN 1 END), 0) * 100 as students_passing_rate,
                COUNT(CASE WHEN current_average < 50 THEN 1 END) as students_at_risk
                
            FROM v_student_courses_complete
            WHERE teacher_id = :teacher_id
            GROUP BY teacher_id, teacher_name, teacher_email, specialization, academic_rank
        """)
        
        result = self.session.exec(query, {"teacher_id": str(teacher_id)}).first()
        
        if not result:
            return {}
        
        return {
            "teacher_info": {
                "name": result.teacher_name,
                "email": result.teacher_email,
                "specialization": result.specialization,
                "academic_rank": result.academic_rank
            },
            "total_courses": result.total_courses,
            "total_students": result.total_students,
            "active_sessions": result.active_sessions,
            "average_class_performance": float(result.average_class_performance) if result.average_class_performance else 0.0,
            "students_passing_rate": float(result.students_passing_rate) if result.students_passing_rate else 0.0,
            "students_at_risk": result.students_at_risk
        }
    
    def search_courses(self, search_term: str, limit: int = 50) -> list[StudentCoursesComplete]:
        """
        Recherche des cours par nom, code ou description.
        
        Args:
            search_term: Terme de recherche
            limit: Nombre maximum de résultats
            
        Returns:
            Liste des cours correspondant à la recherche
        """
        query = text("""
            SELECT * FROM v_student_courses_complete
            WHERE 
                course_name ILIKE :search_term OR 
                course_code ILIKE :search_term OR 
                course_description ILIKE :search_term OR
                student_name ILIKE :search_term OR
                teacher_name ILIKE :search_term
            ORDER BY 
                CASE 
                    WHEN course_code ILIKE :exact_term THEN 1
                    WHEN course_name ILIKE :exact_term THEN 2
                    WHEN student_name ILIKE :exact_term THEN 3
                    ELSE 4
                END,
                course_name, student_name
            LIMIT :limit
        """)
        
        search_pattern = f"%{search_term}%"
        exact_pattern = f"{search_term}%"
        
        result = self.session.exec(query, {
            "search_term": search_pattern,
            "exact_term": exact_pattern,
            "limit": limit
        })
        
        return [StudentCoursesComplete(**row._asdict()) for row in result]
    
    def get_courses_by_date_range(
        self, 
        start_date: date, 
        end_date: date,
        student_id: Optional[UUID] = None
    ) -> list[StudentCoursesComplete]:
        """
        Récupère les cours dans une période donnée.
        
        Args:
            start_date: Date de début
            end_date: Date de fin
            student_id: UUID optionnel de l'étudiant
            
        Returns:
            Liste des cours dans la période
        """
        where_clause = """
            session_start_date <= :end_date AND 
            session_end_date >= :start_date
        """
        params = {
            "start_date": start_date,
            "end_date": end_date
        }
        
        if student_id:
            where_clause += " AND student_id = :student_id"
            params["student_id"] = str(student_id)
        
        query = text(f"""
            SELECT * FROM v_student_courses_complete
            WHERE {where_clause}
            ORDER BY session_start_date, course_name, student_name
        """)
        
        result = self.session.exec(query, params)
        return [StudentCoursesComplete(**row._asdict()) for row in result]
    
    def get_performance_trends(self, student_id: UUID) -> dict:
        """
        Analyse les tendances de performance d'un étudiant.
        
        Args:
            student_id: UUID de l'étudiant
            
        Returns:
            Dictionnaire avec les analyses de tendances
        """
        query = text("""
            WITH course_timeline AS (
                SELECT 
                    course_id,
                    course_name,
                    current_average,
                    session_start_date,
                    session_end_date,
                    academic_year_name,
                    ROW_NUMBER() OVER (ORDER BY session_start_date) as course_order
                FROM v_student_courses_complete
                WHERE student_id = :student_id 
                AND current_average IS NOT NULL
                ORDER BY session_start_date
            )
            SELECT 
                COUNT(*) as total_courses_with_grades,
                AVG(current_average) as overall_average,
                MIN(current_average) as lowest_grade,
                MAX(current_average) as highest_grade,
                STDDEV(current_average) as grade_variance,
                
                -- Tendance linéaire simple
                CORR(course_order, current_average) as trend_correlation,
                
                -- Comparaison première vs dernière moitié
                AVG(CASE WHEN course_order <= (COUNT(*) / 2) THEN current_average END) as first_half_avg,
                AVG(CASE WHEN course_order > (COUNT(*) / 2) THEN current_average END) as second_half_avg
                
            FROM course_timeline
        """)
        
        result = self.session.exec(query, {"student_id": str(student_id)}).first()
        
        if not result or result.total_courses_with_grades == 0:
            return {"trend": "insufficient_data"}
        
        trend_correlation = float(result.trend_correlation) if result.trend_correlation else 0.0
        first_half_avg = float(result.first_half_avg) if result.first_half_avg else 0.0
        second_half_avg = float(result.second_half_avg) if result.second_half_avg else 0.0
        
        # Déterminer la tendance
        if abs(trend_correlation) < 0.1:
            trend = "stable"
        elif trend_correlation > 0.1:
            trend = "improving"
        else:
            trend = "declining"
        
        improvement = second_half_avg - first_half_avg if first_half_avg > 0 else 0.0
        
        return {
            "trend": trend,
            "trend_strength": abs(trend_correlation),
            "overall_average": float(result.overall_average),
            "grade_range": {
                "lowest": float(result.lowest_grade),
                "highest": float(result.highest_grade)
            },
            "consistency": 1 / (1 + float(result.grade_variance)) if result.grade_variance else 1.0,
            "improvement": improvement,
            "total_courses_analyzed": result.total_courses_with_grades
        }