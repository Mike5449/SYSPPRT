"""
Service pour la gestion des vues complètes des notes étudiants.
Encapsule la logique métier pour les opérations sur v_student_grades_complete.
"""

from typing import List, Optional
from uuid import UUID

from sqlmodel import Session

from app.models.student_grade_view import (
    StudentGradeCompletePublic,
    StudentGradeCompleteWithCalculations,
    StudentGradeViewFilters,
    StudentGradeViewSummary,
)
from app.repositories.student_grade_view_repository import StudentGradeViewRepository


class StudentGradeViewService:
    """Service pour les opérations sur la vue complète des notes étudiants."""
    
    def __init__(self, session: Session):
        self.session = session
        self.repository = StudentGradeViewRepository(session)
    
    def get_student_grades_with_calculations(
        self,
        student_id: UUID,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentGradeViewFilters] = None,
    ) -> tuple[List[StudentGradeCompleteWithCalculations], int]:
        """
        Récupère les notes d'un étudiant avec calculs enrichis.
        
        Args:
            student_id: ID de l'étudiant
            skip: Nombre d'enregistrements à ignorer
            limit: Nombre maximum d'enregistrements
            filters: Filtres optionnels
            
        Returns:
            Tuple contenant la liste des notes enrichies et le nombre total
        """
        if filters is None:
            filters = StudentGradeViewFilters(student_id=student_id)
        else:
            filters.student_id = student_id
        
        grades = self.repository.get_by_student_id(
            student_id=student_id,
            skip=skip,
            limit=limit,
            filters=filters,
        )
        
        count = self.repository.count_by_filters(filters)
        
        # Enrichir avec les calculs
        enriched_grades = self._enrich_grades_with_calculations(grades)
        
        return enriched_grades, count
    
    def get_student_transcript(
        self,
        student_id: UUID,
        academic_year_id: Optional[UUID] = None,
        include_unpublished: bool = False,
    ) -> List[StudentGradeCompleteWithCalculations]:
        """
        Génère le relevé de notes complet d'un étudiant.
        
        Args:
            student_id: ID de l'étudiant
            academic_year_id: ID de l'année académique (optionnel)
            include_unpublished: Inclure les notes non publiées
            
        Returns:
            Liste des notes pour le relevé
        """
        filters = StudentGradeViewFilters(
            student_id=student_id,
            academic_year_id=academic_year_id,
            is_published=None if include_unpublished else True,
        )
        
        grades = self.repository.get_student_transcript(student_id, filters)
        
        # Enrichir avec les calculs et trier par session et cours
        enriched_grades = self._enrich_grades_with_calculations(grades)
        
        # Trier par session (date), puis par cours
        enriched_grades.sort(
            key=lambda g: (
                g.session_start_date or "",
                g.course_name or "",
                g.assessment_name or "",
            )
        )
        
        return enriched_grades
    
    def get_course_session_grades_with_statistics(
        self,
        course_session_id: UUID,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentGradeViewFilters] = None,
    ) -> tuple[List[StudentGradeCompleteWithCalculations], int, dict]:
        """
        Récupère les notes d'une session de cours avec statistiques.
        
        Args:
            course_session_id: ID de la session de cours
            skip: Nombre d'enregistrements à ignorer
            limit: Nombre maximum d'enregistrements
            filters: Filtres optionnels
            
        Returns:
            Tuple contenant les notes, le nombre total et les statistiques
        """
        grades = self.repository.get_by_course_session(
            course_session_id=course_session_id,
            skip=skip,
            limit=limit,
            filters=filters,
        )
        
        # Calculer le count pour la session complète
        session_filters = StudentGradeViewFilters()  # Pas de filtres pour le count total
        all_session_grades = self.repository.get_by_course_session(
            course_session_id=course_session_id,
            skip=0,
            limit=1000,  # Limite haute pour les statistiques
            filters=session_filters,
        )
        
        count = len(all_session_grades)
        
        # Enrichir avec les calculs
        enriched_grades = self._enrich_grades_with_calculations(grades)
        
        # Calculer les statistiques pour la session
        statistics = self._calculate_session_statistics(all_session_grades)
        
        return enriched_grades, count, statistics
    
    def get_academic_session_summary(
        self,
        session_id: UUID,
        student_id: Optional[UUID] = None,
        course_id: Optional[UUID] = None,
    ) -> dict:
        """
        Résumé des notes pour une session académique (semestre).
        
        Args:
            session_id: ID de la session académique
            student_id: ID de l'étudiant (optionnel)
            course_id: ID du cours (optionnel)
            
        Returns:
            Dictionnaire avec les résumés et statistiques
        """
        filters = StudentGradeViewFilters(
            session_id=session_id,
            student_id=student_id,
            course_id=course_id,
            is_published=True,
        )
        
        # Obtenir les statistiques générales
        summary_stats = self.repository.get_summary_statistics(filters)
        
        # Obtenir toutes les notes pour calculs détaillés
        all_grades = self.repository.get_by_academic_session(
            session_id=session_id,
            student_id=student_id,
            skip=0,
            limit=10000,  # Limite haute pour avoir toutes les données
            filters=filters,
        )
        
        # Calculs supplémentaires
        enriched_grades = self._enrich_grades_with_calculations(all_grades)
        
        # Grouper par étudiant si pas de student_id spécifique
        if student_id is None:
            student_summaries = self._group_grades_by_student(enriched_grades)
        else:
            student_summaries = {str(student_id): enriched_grades}
        
        # Grouper par cours si pas de course_id spécifique
        course_summaries = self._group_grades_by_course(enriched_grades)
        
        return {
            "session_id": str(session_id),
            "general_statistics": summary_stats.model_dump(),
            "student_summaries": student_summaries,
            "course_summaries": course_summaries,
            "total_students": len(student_summaries),
            "total_courses": len(course_summaries),
        }
    
    def get_year_level_performance_analysis(
        self,
        year_level: int,
        session_id: Optional[UUID] = None,
        academic_year_id: Optional[UUID] = None,
    ) -> dict:
        """
        Analyse des performances par niveau d'année.
        
        Args:
            year_level: Niveau d'année (1, 2, 3, etc.)
            session_id: ID de la session (optionnel)
            academic_year_id: ID de l'année académique (optionnel)
            
        Returns:
            Dictionnaire avec l'analyse des performances
        """
        filters = StudentGradeViewFilters(
            year_level=year_level,
            session_id=session_id,
            academic_year_id=academic_year_id,
            is_published=True,
        )
        
        # Obtenir toutes les notes du niveau
        grades = self.repository.get_by_year_level(
            year_level=year_level,
            student_id=None,
            skip=0,
            limit=10000,
            filters=filters,
        )
        
        enriched_grades = self._enrich_grades_with_calculations(grades)
        
        # Analyser les performances
        performance_analysis = self._analyze_performance(enriched_grades)
        
        # Statistiques par cours
        course_performance = self._analyze_course_performance(enriched_grades)
        
        # Tendances et recommandations
        trends = self._identify_trends(enriched_grades)
        
        return {
            "year_level": year_level,
            "total_students": len(set(g.student_id for g in enriched_grades)),
            "total_grades": len(enriched_grades),
            "performance_analysis": performance_analysis,
            "course_performance": course_performance,
            "trends": trends,
        }
    
    def search_grades_with_context(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentGradeViewFilters] = None,
    ) -> tuple[List[StudentGradeCompleteWithCalculations], int]:
        """
        Recherche dans les notes avec contexte enrichi.
        
        Args:
            search_term: Terme de recherche
            skip: Nombre d'enregistrements à ignorer
            limit: Nombre maximum d'enregistrements
            filters: Filtres optionnels
            
        Returns:
            Tuple contenant les résultats et le nombre total
        """
        grades = self.repository.search_grades(
            search_term=search_term,
            skip=skip,
            limit=limit,
            filters=filters,
        )
        
        # Pour le count, faire une recherche sans pagination
        all_results = self.repository.search_grades(
            search_term=search_term,
            skip=0,
            limit=1000,
            filters=filters,
        )
        count = len(all_results)
        
        # Enrichir avec les calculs
        enriched_grades = self._enrich_grades_with_calculations(grades)
        
        return enriched_grades, count
    
    def _enrich_grades_with_calculations(
        self,
        grades: List[StudentGradeCompletePublic],
    ) -> List[StudentGradeCompleteWithCalculations]:
        """Enrichit les notes avec des calculs supplémentaires."""
        enriched_grades = []
        
        for grade in grades:
            grade_dict = grade.model_dump()
            
            # Calcul du pourcentage
            if grade.score is not None and grade.assessment_max_score:
                grade_dict["percentage_score"] = (grade.score / grade.assessment_max_score) * 100
            else:
                grade_dict["percentage_score"] = None
            
            # Calcul du score pondéré
            if grade.score is not None and grade.assessment_weight:
                grade_dict["weighted_score"] = grade.score * (grade.assessment_weight / 100)
            else:
                grade_dict["weighted_score"] = None
            
            # Nom complet de l'étudiant
            if grade.student_first_name and grade.student_last_name:
                grade_dict["student_full_name"] = f"{grade.student_first_name} {grade.student_last_name}"
            else:
                grade_dict["student_full_name"] = grade.student_first_name or grade.student_last_name or ""
            
            # Statut de réussite basé sur le score
            if grade.score is not None and grade.assessment_max_score:
                percentage = (grade.score / grade.assessment_max_score) * 100
                grade_dict["is_passing_score"] = percentage >= 50.0  # Ajustable selon les règles
            else:
                grade_dict["is_passing_score"] = None
            
            # Rang/Grade lettre basé sur le pourcentage
            if grade_dict["percentage_score"] is not None:
                grade_dict["letter_grade"] = self._calculate_letter_grade(grade_dict["percentage_score"])
            else:
                grade_dict["letter_grade"] = None
            
            enriched_grades.append(StudentGradeCompleteWithCalculations(**grade_dict))
        
        return enriched_grades
    
    def _calculate_letter_grade(self, percentage: float) -> str:
        """Calcule la note lettre basée sur le pourcentage."""
        if percentage >= 90:
            return "A+"
        elif percentage >= 85:
            return "A"
        elif percentage >= 80:
            return "A-"
        elif percentage >= 75:
            return "B+"
        elif percentage >= 70:
            return "B"
        elif percentage >= 65:
            return "B-"
        elif percentage >= 60:
            return "C+"
        elif percentage >= 55:
            return "C"
        elif percentage >= 50:
            return "C-"
        elif percentage >= 45:
            return "D+"
        elif percentage >= 40:
            return "D"
        else:
            return "F"
    
    def _calculate_session_statistics(self, grades: List[StudentGradeCompletePublic]) -> dict:
        """Calcule les statistiques pour une session de cours."""
        if not grades:
            return {}
        
        scores = [g.score for g in grades if g.score is not None]
        if not scores:
            return {"message": "Aucune note disponible pour les statistiques"}
        
        # Statistiques de base
        avg_score = sum(scores) / len(scores)
        min_score = min(scores)
        max_score = max(scores)
        
        # Calculer les pourcentages si possible
        percentages = []
        for grade in grades:
            if grade.score is not None and grade.assessment_max_score:
                percentages.append((grade.score / grade.assessment_max_score) * 100)
        
        if percentages:
            avg_percentage = sum(percentages) / len(percentages)
            passing_count = sum(1 for p in percentages if p >= 50)
            passing_rate = (passing_count / len(percentages)) * 100
        else:
            avg_percentage = None
            passing_rate = None
        
        return {
            "total_grades": len(grades),
            "total_students": len(set(g.student_id for g in grades)),
            "average_score": round(avg_score, 2),
            "min_score": min_score,
            "max_score": max_score,
            "average_percentage": round(avg_percentage, 2) if avg_percentage else None,
            "passing_rate": round(passing_rate, 2) if passing_rate else None,
        }
    
    def _group_grades_by_student(self, grades: List[StudentGradeCompleteWithCalculations]) -> dict:
        """Groupe les notes par étudiant."""
        student_groups = {}
        
        for grade in grades:
            student_key = str(grade.student_id)
            if student_key not in student_groups:
                student_groups[student_key] = {
                    "student_info": {
                        "id": str(grade.student_id),
                        "name": grade.student_full_name,
                        "number": grade.student_number,
                    },
                    "grades": [],
                    "statistics": {},
                }
            
            student_groups[student_key]["grades"].append(grade)
        
        # Calculer les statistiques par étudiant
        for student_key, data in student_groups.items():
            scores = [g.percentage_score for g in data["grades"] if g.percentage_score is not None]
            if scores:
                data["statistics"] = {
                    "average_percentage": round(sum(scores) / len(scores), 2),
                    "total_assessments": len(data["grades"]),
                    "passing_assessments": sum(1 for s in scores if s >= 50),
                }
        
        return student_groups
    
    def _group_grades_by_course(self, grades: List[StudentGradeCompleteWithCalculations]) -> dict:
        """Groupe les notes par cours."""
        course_groups = {}
        
        for grade in grades:
            course_key = str(grade.course_id)
            if course_key not in course_groups:
                course_groups[course_key] = {
                    "course_info": {
                        "id": str(grade.course_id),
                        "name": grade.course_name,
                        "code": grade.course_code,
                    },
                    "grades": [],
                    "statistics": {},
                }
            
            course_groups[course_key]["grades"].append(grade)
        
        # Calculer les statistiques par cours
        for course_key, data in course_groups.items():
            scores = [g.percentage_score for g in data["grades"] if g.percentage_score is not None]
            if scores:
                data["statistics"] = {
                    "average_percentage": round(sum(scores) / len(scores), 2),
                    "total_students": len(set(g.student_id for g in data["grades"])),
                    "total_assessments": len(data["grades"]),
                    "passing_rate": round((sum(1 for s in scores if s >= 50) / len(scores)) * 100, 2),
                }
        
        return course_groups
    
    def _analyze_performance(self, grades: List[StudentGradeCompleteWithCalculations]) -> dict:
        """Analyse les performances générales."""
        if not grades:
            return {}
        
        percentages = [g.percentage_score for g in grades if g.percentage_score is not None]
        if not percentages:
            return {"message": "Pas assez de données pour l'analyse"}
        
        # Distribution des notes
        grade_distribution = {
            "A (90-100%)": sum(1 for p in percentages if p >= 90),
            "B (80-89%)": sum(1 for p in percentages if 80 <= p < 90),
            "C (70-79%)": sum(1 for p in percentages if 70 <= p < 80),
            "D (60-69%)": sum(1 for p in percentages if 60 <= p < 70),
            "E (50-59%)": sum(1 for p in percentages if 50 <= p < 60),
            "F (<50%)": sum(1 for p in percentages if p < 50),
        }
        
        return {
            "total_assessments": len(percentages),
            "average_performance": round(sum(percentages) / len(percentages), 2),
            "grade_distribution": grade_distribution,
            "excellence_rate": round((grade_distribution["A (90-100%)"] / len(percentages)) * 100, 2),
            "success_rate": round((sum(1 for p in percentages if p >= 50) / len(percentages)) * 100, 2),
        }
    
    def _analyze_course_performance(self, grades: List[StudentGradeCompleteWithCalculations]) -> dict:
        """Analyse les performances par cours."""
        course_performance = {}
        
        # Grouper par cours
        for grade in grades:
            course_key = grade.course_name or str(grade.course_id)
            if course_key not in course_performance:
                course_performance[course_key] = []
            
            if grade.percentage_score is not None:
                course_performance[course_key].append(grade.percentage_score)
        
        # Calculer les moyennes par cours
        course_averages = {}
        for course, scores in course_performance.items():
            if scores:
                course_averages[course] = round(sum(scores) / len(scores), 2)
        
        # Identifier les meilleurs et moins bons cours
        sorted_courses = sorted(course_averages.items(), key=lambda x: x[1], reverse=True)
        
        return {
            "course_averages": course_averages,
            "best_performing_courses": sorted_courses[:3],
            "challenging_courses": sorted_courses[-3:],
        }
    
    def _identify_trends(self, grades: List[StudentGradeCompleteWithCalculations]) -> dict:
        """Identifie les tendances dans les notes."""
        # Ceci est une version simplifiée - peut être étendue avec plus de logique
        percentages = [g.percentage_score for g in grades if g.percentage_score is not None]
        
        if len(percentages) < 2:
            return {"message": "Pas assez de données pour identifier des tendances"}
        
        # Tendance générale (très simplifiée)
        first_half = percentages[:len(percentages)//2]
        second_half = percentages[len(percentages)//2:]
        
        if first_half and second_half:
            first_avg = sum(first_half) / len(first_half)
            second_avg = sum(second_half) / len(second_half)
            
            if second_avg > first_avg + 2:
                trend = "Amélioration"
            elif second_avg < first_avg - 2:
                trend = "Déclin"
            else:
                trend = "Stable"
        else:
            trend = "Indéterminé"
        
        return {
            "general_trend": trend,
            "recommendation": self._get_recommendation(trend, sum(percentages) / len(percentages)),
        }
    
    def _get_recommendation(self, trend: str, average: float) -> str:
        """Génère des recommandations basées sur les tendances."""
        if trend == "Amélioration" and average >= 70:
            return "Excellente progression ! Continuez sur cette voie."
        elif trend == "Amélioration" and average < 70:
            return "Bonne amélioration observée. Maintenez l'effort pour atteindre l'excellence."
        elif trend == "Déclin":
            return "Attention : baisse des performances détectée. Révision des méthodes d'étude recommandée."
        elif trend == "Stable" and average >= 80:
            return "Performances stables et excellentes. Continuez !"
        elif trend == "Stable" and average >= 60:
            return "Performances stables mais améliorables. Ciblez les matières faibles."
        else:
            return "Performances nécessitant une attention particulière et un soutien supplémentaire."