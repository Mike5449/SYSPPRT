"""
Service pour la gestion de la logique métier des évaluations étudiants.
Fournit des analyses avancées, des alertes et des recommandations.
"""

from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from app.models.student_assessments_view import (
    StudentAssessmentsComplete,
    StudentAssessmentsCompleteWithAnalytics,
    StudentAssessmentsViewFilters,
    AssessmentStatistics,
    AssessmentPerformanceReport,
    TeacherAssessmentsOverview,
    AssessmentAlert,
    AssessmentAlerts,
    AssessmentProgressTracker,
    AssessmentComparison,
    CourseAssessmentAnalysis,
    AssessmentWorkloadAnalysis,
    AssessmentGradingEfficiency,
    AssessmentCalendar
)
from app.repositories.student_assessments_view_repository import StudentAssessmentsViewRepository


class StudentAssessmentsViewService:
    """Service pour la gestion des évaluations étudiants avec analyses avancées."""
    
    def __init__(self, repository: StudentAssessmentsViewRepository):
        self.repository = repository
    
    def get_student_assessments_with_analytics(
        self, 
        student_id: UUID
    ) -> list[StudentAssessmentsCompleteWithAnalytics]:
        """
        Récupère les évaluations d'un étudiant avec analyses et calculs enrichis.
        
        Args:
            student_id: UUID de l'étudiant
            
        Returns:
            Liste des évaluations avec analyses complètes
        """
        assessments = self.repository.get_by_student_id(student_id)
        if not assessments:
            return []
        
        # Obtenir les statistiques globales pour les comparaisons
        stats = self.repository.get_student_assessments_statistics(student_id)
        
        analytics_assessments = []
        current_date = date.today()
        
        for assessment in assessments:
            analytics = self._calculate_assessment_analytics(assessment, stats, current_date)
            analytics_assessments.append(analytics)
        
        return analytics_assessments
    
    def _calculate_assessment_analytics(
        self, 
        assessment: StudentAssessmentsComplete, 
        student_stats: AssessmentStatistics,
        current_date: date
    ) -> StudentAssessmentsCompleteWithAnalytics:
        """
        Calcule les analyses enrichies pour une évaluation spécifique.
        
        Args:
            assessment: Données de base de l'évaluation
            student_stats: Statistiques globales de l'étudiant
            current_date: Date actuelle pour les calculs temporels
            
        Returns:
            Évaluation avec analyses enrichies
        """
        # Calculs de base
        score_percentage = None
        if assessment.score is not None and assessment.max_score > 0:
            score_percentage = (assessment.score / assessment.max_score) * 100
        
        # Niveau de performance
        performance_level = self._determine_performance_level(score_percentage)
        grade_status = self._determine_grade_status(assessment)
        
        # Analyses temporelles
        submission_urgency = self._assess_submission_urgency(assessment, current_date)
        time_remaining = self._format_time_remaining(assessment, current_date)
        is_overdue = assessment.deadline_status == 'overdue'
        is_late_submission = self._check_late_submission(assessment)
        days_since_graded = self._calculate_days_since_graded(assessment, current_date)
        
        # Analyses de performance (simulées)
        class_stats = self._get_class_statistics_simulation(assessment.assessment_id)
        class_rank = self._calculate_class_rank_simulation(assessment, class_stats)
        percentile_rank = self._calculate_percentile_simulation(assessment, class_stats)
        deviation_from_average = self._calculate_deviation_simulation(assessment, class_stats)
        
        # Pondération et impact
        weighted_contribution = self._calculate_weighted_contribution(assessment)
        impact_on_final_grade = self._estimate_grade_impact(assessment, student_stats)
        
        # Difficultés et recommandations
        difficulty_level = self._assess_difficulty_level(assessment, class_stats)
        improvement_needed = self._calculate_improvement_needed(assessment)
        next_milestone = self._determine_next_milestone(assessment, student_stats)
        
        # Indicateurs visuels
        status_icon = self._get_status_icon(assessment)
        priority_level = self._calculate_priority_level(assessment, current_date)
        color_indicator = self._get_color_indicator(assessment, score_percentage)
        
        return StudentAssessmentsCompleteWithAnalytics(
            **assessment.model_dump(),
            score_percentage=score_percentage,
            performance_level=performance_level,
            grade_status=grade_status,
            is_late_submission=is_late_submission,
            submission_urgency=submission_urgency,
            time_remaining=time_remaining,
            is_overdue=is_overdue,
            days_since_graded=days_since_graded,
            class_rank=class_rank,
            percentile_rank=percentile_rank,
            deviation_from_average=deviation_from_average,
            class_average=class_stats.get("class_average"),
            class_median=class_stats.get("class_median"),
            weighted_contribution=weighted_contribution,
            impact_on_final_grade=impact_on_final_grade,
            difficulty_level=difficulty_level,
            improvement_needed=improvement_needed,
            next_milestone=next_milestone,
            status_icon=status_icon,
            priority_level=priority_level,
            color_indicator=color_indicator
        )
    
    def _determine_performance_level(self, score_percentage: Optional[float]) -> Optional[str]:
        """Détermine le niveau de performance basé sur le pourcentage."""
        if not score_percentage:
            return None
        
        if score_percentage >= 90:
            return "excellent"
        elif score_percentage >= 80:
            return "good"
        elif score_percentage >= 70:
            return "average"
        elif score_percentage >= 60:
            return "below_average"
        else:
            return "poor"
    
    def _determine_grade_status(self, assessment: StudentAssessmentsComplete) -> Optional[str]:
        """Détermine le statut détaillé de la note."""
        if assessment.grade_id is None:
            if assessment.due_date and assessment.due_date < date.today():
                return "overdue_not_graded"
            else:
                return "pending_submission"
        elif not assessment.grade_published:
            return "graded_pending_publication"
        elif assessment.is_passing:
            return "passed_published"
        else:
            return "failed_published"
    
    def _assess_submission_urgency(self, assessment: StudentAssessmentsComplete, current_date: date) -> Optional[str]:
        """Évalue l'urgence de soumission."""
        if assessment.grade_id is not None:
            return "completed"
        
        if not assessment.due_date:
            return "no_deadline"
        
        days_until_due = (assessment.due_date - current_date).days
        
        if days_until_due < 0:
            return "critical"  # En retard
        elif days_until_due <= 1:
            return "high"
        elif days_until_due <= 3:
            return "medium"
        else:
            return "low"
    
    def _format_time_remaining(self, assessment: StudentAssessmentsComplete, current_date: date) -> Optional[str]:
        """Formate le temps restant de manière lisible."""
        if not assessment.due_date or assessment.grade_id is not None:
            return None
        
        days_until_due = (assessment.due_date - current_date).days
        
        if days_until_due < 0:
            return f"En retard de {abs(days_until_due)} jour(s)"
        elif days_until_due == 0:
            return "À rendre aujourd'hui"
        elif days_until_due == 1:
            return "À rendre demain"
        else:
            return f"Dans {days_until_due} jour(s)"
    
    def _check_late_submission(self, assessment: StudentAssessmentsComplete) -> Optional[bool]:
        """Vérifie si la soumission a été faite en retard."""
        if not assessment.due_date or not assessment.graded_date:
            return None
        
        # Considère qu'une soumission faite le jour suivant la date limite est en retard
        return assessment.graded_date.date() > assessment.due_date
    
    def _calculate_days_since_graded(self, assessment: StudentAssessmentsComplete, current_date: date) -> Optional[int]:
        """Calcule le nombre de jours depuis la notation."""
        if not assessment.graded_date:
            return None
        
        return (current_date - assessment.graded_date.date()).days
    
    def _get_class_statistics_simulation(self, assessment_id: UUID) -> dict:
        """Simule les statistiques de classe (à remplacer par une vraie requête)."""
        # Dans un vrai système, ceci utiliserait le repository
        class_stats = self.repository.get_assessment_class_statistics(assessment_id)
        return class_stats.get("performance", {})
    
    def _calculate_class_rank_simulation(self, assessment: StudentAssessmentsComplete, class_stats: dict) -> Optional[int]:
        """Simule le calcul du rang dans la classe."""
        if not assessment.score or not class_stats.get("class_average"):
            return None
        
        class_average = class_stats["class_average"]
        
        # Simulation simple basée sur l'écart à la moyenne
        if assessment.score >= class_average + 15:
            return 1  # Top performer
        elif assessment.score >= class_average + 5:
            return 3  # Above average
        elif assessment.score >= class_average:
            return 5  # Slightly above
        elif assessment.score >= class_average - 5:
            return 7  # Slightly below
        else:
            return 10  # Below average
    
    def _calculate_percentile_simulation(self, assessment: StudentAssessmentsComplete, class_stats: dict) -> Optional[float]:
        """Simule le calcul du percentile."""
        if not assessment.score or not class_stats.get("class_average"):
            return None
        
        class_average = class_stats["class_average"]
        score_diff = assessment.score - class_average
        
        # Simulation basée sur l'écart à la moyenne
        if score_diff >= 20:
            return 95.0
        elif score_diff >= 10:
            return 80.0
        elif score_diff >= 0:
            return 60.0
        elif score_diff >= -10:
            return 30.0
        else:
            return 10.0
    
    def _calculate_deviation_simulation(self, assessment: StudentAssessmentsComplete, class_stats: dict) -> Optional[float]:
        """Calcule l'écart par rapport à la moyenne de classe."""
        if not assessment.score or not class_stats.get("class_average"):
            return None
        
        return assessment.score - class_stats["class_average"]
    
    def _calculate_weighted_contribution(self, assessment: StudentAssessmentsComplete) -> Optional[float]:
        """Calcule la contribution pondérée au cours."""
        if assessment.score is None or assessment.max_score == 0:
            return None
        
        percentage_score = (assessment.score / assessment.max_score) * 100
        return percentage_score * (assessment.weight / 100)
    
    def _estimate_grade_impact(self, assessment: StudentAssessmentsComplete, student_stats: AssessmentStatistics) -> Optional[float]:
        """Estime l'impact sur la note finale du cours."""
        if not assessment.score or assessment.max_score == 0:
            return None
        
        # Impact basé sur le poids et la performance
        performance_factor = (assessment.score / assessment.max_score) - 0.5  # -0.5 à +0.5
        return performance_factor * assessment.weight
    
    def _assess_difficulty_level(self, assessment: StudentAssessmentsComplete, class_stats: dict) -> Optional[str]:
        """Évalue le niveau de difficulté de l'évaluation."""
        if not class_stats.get("class_average") or not class_stats.get("pass_rate"):
            return None
        
        class_average = class_stats["class_average"]
        pass_rate = class_stats["pass_rate"]
        
        if class_average >= 85 and pass_rate >= 90:
            return "easy"
        elif class_average >= 75 and pass_rate >= 75:
            return "moderate"
        elif class_average >= 65 and pass_rate >= 60:
            return "challenging"
        else:
            return "difficult"
    
    def _calculate_improvement_needed(self, assessment: StudentAssessmentsComplete) -> Optional[float]:
        """Calcule les points nécessaires pour améliorer la note."""
        if not assessment.score or assessment.is_passing is True:
            return None
        
        # Points nécessaires pour atteindre le seuil de réussite (60% par défaut)
        passing_threshold = assessment.passing_score or (assessment.max_score * 0.6)
        if assessment.score >= passing_threshold:
            return 0.0
        
        return passing_threshold - assessment.score
    
    def _determine_next_milestone(self, assessment: StudentAssessmentsComplete, student_stats: AssessmentStatistics) -> Optional[str]:
        """Détermine le prochain objectif à atteindre."""
        if assessment.grade_id is None:
            return "Complete the assessment"
        
        if not assessment.is_passing:
            return "Improve to passing grade"
        
        if assessment.score and assessment.max_score:
            percentage = (assessment.score / assessment.max_score) * 100
            if percentage < 80:
                return "Reach 80% (B grade)"
            elif percentage < 90:
                return "Reach 90% (A grade)"
            else:
                return "Maintain excellence"
        
        return "Continue good performance"
    
    def _get_status_icon(self, assessment: StudentAssessmentsComplete) -> Optional[str]:
        """Retourne l'icône appropriée pour le statut."""
        if assessment.deadline_status == 'overdue':
            return "🚨"
        elif assessment.deadline_status == 'urgent':
            return "⚠️"
        elif assessment.grade_id is None:
            return "⏳"
        elif assessment.is_passing:
            return "✅"
        else:
            return "❌"
    
    def _calculate_priority_level(self, assessment: StudentAssessmentsComplete, current_date: date) -> Optional[int]:
        """Calcule le niveau de priorité (1-5, 5 étant le plus urgent)."""
        if assessment.grade_id is not None:
            return 1  # Déjà complété
        
        if assessment.deadline_status == 'overdue':
            return 5
        elif assessment.deadline_status == 'urgent':
            return 4
        elif assessment.deadline_status == 'upcoming':
            return 3
        elif assessment.is_mandatory:
            return 2
        else:
            return 1
    
    def _get_color_indicator(self, assessment: StudentAssessmentsComplete, score_percentage: Optional[float]) -> Optional[str]:
        """Retourne l'indicateur de couleur."""
        if assessment.deadline_status == 'overdue':
            return "red"
        elif assessment.deadline_status == 'urgent':
            return "orange"
        elif assessment.grade_id is None:
            return "blue"
        elif score_percentage and score_percentage >= 80:
            return "green"
        elif score_percentage and score_percentage >= 60:
            return "yellow"
        else:
            return "red"
    
    def generate_assessment_performance_report(self, student_id: UUID) -> AssessmentPerformanceReport:
        """
        Génère un rapport complet de performance des évaluations pour un étudiant.
        
        Args:
            student_id: UUID de l'étudiant
            
        Returns:
            Rapport détaillé de performance
        """
        assessments = self.get_student_assessments_with_analytics(student_id)
        stats = self.repository.get_student_assessments_statistics(student_id)
        
        # Informations de l'étudiant
        student_info = {}
        if assessments:
            first_assessment = assessments[0]
            student_info = {
                "student_id": first_assessment.student_id,
                "student_name": first_assessment.student_name,
                "student_number": first_assessment.student_number,
                "student_email": first_assessment.student_email,
                "current_year_level": first_assessment.current_year_level
            }
        
        # Analyses par type d'évaluation
        strengths_by_type = self._analyze_strengths_by_type(assessments)
        weaknesses_by_type = self._analyze_weaknesses_by_type(assessments)
        improvement_recommendations = self._generate_improvement_recommendations(assessments, stats)
        
        # Comparaisons temporelles
        monthly_performance = self._calculate_monthly_performance(assessments)
        semester_comparison = self._calculate_semester_comparison(assessments)
        
        # Prédictions
        projected_final_grades = self._project_final_grades(assessments)
        at_risk_assessments = self._identify_at_risk_assessments(assessments)
        
        # Planning
        upcoming_deadlines = self._get_upcoming_deadlines(assessments)
        recommended_study_schedule = self._generate_study_schedule(assessments)
        
        # Données pour graphiques
        charts_data = self._prepare_assessment_charts_data(assessments, stats)
        
        return AssessmentPerformanceReport(
            report_period=f"Jusqu'au {date.today().strftime('%d/%m/%Y')}",
            generated_at=datetime.now().isoformat(),
            student_info=student_info,
            assessments_summary=stats,
            assessment_details=assessments,
            strengths_by_type=strengths_by_type,
            weaknesses_by_type=weaknesses_by_type,
            improvement_recommendations=improvement_recommendations,
            monthly_performance=monthly_performance,
            semester_comparison=semester_comparison,
            projected_final_grades=projected_final_grades,
            at_risk_assessments=at_risk_assessments,
            upcoming_deadlines=upcoming_deadlines,
            recommended_study_schedule=recommended_study_schedule,
            charts_data=charts_data
        )
    
    def _analyze_strengths_by_type(self, assessments: list[StudentAssessmentsCompleteWithAnalytics]) -> dict[str, list[str]]:
        """Analyse les forces par type d'évaluation."""
        strengths = {}
        
        # Grouper par type d'évaluation
        by_type = {}
        for assessment in assessments:
            if assessment.assessment_type not in by_type:
                by_type[assessment.assessment_type] = []
            by_type[assessment.assessment_type].append(assessment)
        
        for assessment_type, type_assessments in by_type.items():
            type_strengths = []
            
            # Calculer la moyenne pour ce type
            scores = [a.score_percentage for a in type_assessments if a.score_percentage]
            if scores:
                avg_score = sum(scores) / len(scores)
                if avg_score >= 85:
                    type_strengths.append(f"Excellente performance en {assessment_type} (moyenne: {avg_score:.1f}%)")
                elif avg_score >= 75:
                    type_strengths.append(f"Bonne performance en {assessment_type}")
            
            # Vérifier la consistance
            excellent_count = len([a for a in type_assessments if a.performance_level == "excellent"])
            if excellent_count >= 2:
                type_strengths.append(f"Performance consistante excellente en {assessment_type}")
            
            strengths[assessment_type] = type_strengths
        
        return strengths
    
    def _analyze_weaknesses_by_type(self, assessments: list[StudentAssessmentsCompleteWithAnalytics]) -> dict[str, list[str]]:
        """Analyse les faiblesses par type d'évaluation."""
        weaknesses = {}
        
        # Grouper par type d'évaluation
        by_type = {}
        for assessment in assessments:
            if assessment.assessment_type not in by_type:
                by_type[assessment.assessment_type] = []
            by_type[assessment.assessment_type].append(assessment)
        
        for assessment_type, type_assessments in by_type.items():
            type_weaknesses = []
            
            # Identifier les problèmes de performance
            poor_assessments = [a for a in type_assessments if a.performance_level in ["poor", "below_average"]]
            if len(poor_assessments) >= 2:
                type_weaknesses.append(f"Difficultés récurrentes en {assessment_type}")
            
            # Identifier les retards
            overdue_count = len([a for a in type_assessments if a.is_overdue])
            if overdue_count >= 1:
                type_weaknesses.append(f"Problèmes de respect des délais en {assessment_type}")
            
            # Identifier les échecs
            failed_count = len([a for a in type_assessments if a.is_passing is False])
            if failed_count >= 1:
                type_weaknesses.append(f"Échecs en {assessment_type} nécessitant une attention particulière")
            
            weaknesses[assessment_type] = type_weaknesses
        
        return weaknesses
    
    def _generate_improvement_recommendations(self, assessments: list[StudentAssessmentsCompleteWithAnalytics], stats: AssessmentStatistics) -> list[str]:
        """Génère des recommandations d'amélioration."""
        recommendations = []
        
        # Recommandations basées sur les statistiques globales
        if stats.success_rate < 70:
            recommendations.append("Améliorer la stratégie d'étude pour augmenter le taux de réussite")
        
        if stats.on_time_submission_rate < 80:
            recommendations.append("Développer de meilleures habitudes de gestion du temps")
        
        if stats.consistency_score < 0.7:
            recommendations.append("Travailler sur la consistance des performances")
        
        # Recommandations basées sur les évaluations spécifiques
        urgent_assessments = [a for a in assessments if a.submission_urgency == "critical"]
        if urgent_assessments:
            recommendations.append(f"Attention immédiate requise pour {len(urgent_assessments)} évaluation(s) en retard")
        
        failing_assessments = [a for a in assessments if a.is_passing is False]
        if failing_assessments:
            recommendations.append("Réviser les matières des évaluations échouées pour comprendre les lacunes")
        
        return recommendations
    
    def _calculate_monthly_performance(self, assessments: list[StudentAssessmentsCompleteWithAnalytics]) -> dict[str, float]:
        """Calcule la performance mensuelle."""
        monthly_data = {}
        
        for assessment in assessments:
            if assessment.graded_date and assessment.score_percentage:
                month_key = assessment.graded_date.strftime("%Y-%m")
                if month_key not in monthly_data:
                    monthly_data[month_key] = []
                monthly_data[month_key].append(assessment.score_percentage)
        
        # Calculer les moyennes mensuelles
        monthly_averages = {}
        for month, scores in monthly_data.items():
            monthly_averages[month] = sum(scores) / len(scores)
        
        return monthly_averages
    
    def _calculate_semester_comparison(self, assessments: list[StudentAssessmentsCompleteWithAnalytics]) -> dict[str, dict]:
        """Compare les performances par semestre."""
        current_semester = []
        previous_semester = []
        
        current_date = date.today()
        semester_cutoff = current_date - timedelta(days=120)  # Approximation de 4 mois
        
        for assessment in assessments:
            if assessment.graded_date and assessment.score_percentage:
                if assessment.graded_date.date() >= semester_cutoff:
                    current_semester.append(assessment.score_percentage)
                else:
                    previous_semester.append(assessment.score_percentage)
        
        comparison = {}
        
        if current_semester:
            comparison["current"] = {
                "average": sum(current_semester) / len(current_semester),
                "count": len(current_semester)
            }
        
        if previous_semester:
            comparison["previous"] = {
                "average": sum(previous_semester) / len(previous_semester),
                "count": len(previous_semester)
            }
        
        return comparison
    
    def _project_final_grades(self, assessments: list[StudentAssessmentsCompleteWithAnalytics]) -> dict[str, float]:
        """Projette les notes finales par cours."""
        course_projections = {}
        
        # Grouper par cours
        by_course = {}
        for assessment in assessments:
            course_key = f"{assessment.course_code} - {assessment.course_name}"
            if course_key not in by_course:
                by_course[course_key] = []
            by_course[course_key].append(assessment)
        
        for course, course_assessments in by_course.items():
            # Calculer la moyenne pondérée actuelle
            total_weighted_score = 0
            total_weight = 0
            
            for assessment in course_assessments:
                if assessment.score is not None and assessment.weighted_contribution:
                    total_weighted_score += assessment.weighted_contribution
                    total_weight += assessment.weight
            
            if total_weight > 0:
                projected_grade = total_weighted_score / total_weight * 100
                course_projections[course] = projected_grade
        
        return course_projections
    
    def _identify_at_risk_assessments(self, assessments: list[StudentAssessmentsCompleteWithAnalytics]) -> list[dict]:
        """Identifie les évaluations à risque."""
        at_risk = []
        
        for assessment in assessments:
            risk_factors = []
            
            if assessment.submission_urgency in ["critical", "high"]:
                risk_factors.append("urgent_deadline")
            
            if assessment.performance_level == "poor":
                risk_factors.append("poor_performance")
            
            if assessment.is_overdue:
                risk_factors.append("overdue")
            
            if risk_factors:
                at_risk.append({
                    "assessment_name": assessment.assessment_name,
                    "course_name": assessment.course_name,
                    "risk_factors": risk_factors,
                    "priority_level": assessment.priority_level,
                    "recommended_action": assessment.next_milestone
                })
        
        return at_risk
    
    def _get_upcoming_deadlines(self, assessments: list[StudentAssessmentsCompleteWithAnalytics]) -> list[dict]:
        """Récupère les prochaines échéances."""
        upcoming = []
        
        for assessment in assessments:
            if (assessment.grade_id is None and 
                assessment.due_date and 
                assessment.due_date >= date.today()):
                
                upcoming.append({
                    "assessment_name": assessment.assessment_name,
                    "course_name": assessment.course_name,
                    "due_date": assessment.due_date.isoformat(),
                    "time_remaining": assessment.time_remaining,
                    "priority_level": assessment.priority_level,
                    "urgency": assessment.submission_urgency
                })
        
        # Trier par date d'échéance
        upcoming.sort(key=lambda x: x["due_date"])
        return upcoming
    
    def _generate_study_schedule(self, assessments: list[StudentAssessmentsCompleteWithAnalytics]) -> list[dict]:
        """Génère un planning d'étude recommandé."""
        schedule = []
        
        # Prendre les évaluations non complétées avec des échéances
        pending_assessments = [
            a for a in assessments 
            if a.grade_id is None and a.due_date and a.due_date >= date.today()
        ]
        
        # Trier par priorité et échéance
        pending_assessments.sort(key=lambda x: (x.priority_level, x.due_date), reverse=True)
        
        for assessment in pending_assessments[:5]:  # Top 5 priorités
            study_days = 1
            if assessment.due_date:
                days_until = (assessment.due_date - date.today()).days
                study_days = max(1, min(days_until - 1, 7))  # Entre 1 et 7 jours
            
            schedule.append({
                "assessment_name": assessment.assessment_name,
                "course_name": assessment.course_name,
                "recommended_study_days": study_days,
                "suggested_start_date": (date.today() + timedelta(days=1)).isoformat(),
                "difficulty_level": assessment.difficulty_level,
                "priority": assessment.priority_level
            })
        
        return schedule
    
    def _prepare_assessment_charts_data(self, assessments: list[StudentAssessmentsCompleteWithAnalytics], stats: AssessmentStatistics) -> dict:
        """Prépare les données pour les graphiques."""
        return {
            "performance_over_time": [
                {
                    "assessment": a.assessment_name,
                    "score": a.score_percentage,
                    "date": a.graded_date.isoformat() if a.graded_date else None,
                    "type": a.assessment_type
                }
                for a in sorted(assessments, key=lambda x: x.graded_date or datetime.min)
                if a.score_percentage and a.graded_date
            ],
            "performance_by_type": {
                assessment_type: {
                    "average": sum(a.score_percentage for a in assessments if a.assessment_type == assessment_type and a.score_percentage) / 
                              max(1, len([a for a in assessments if a.assessment_type == assessment_type and a.score_percentage])),
                    "count": len([a for a in assessments if a.assessment_type == assessment_type])
                }
                for assessment_type in set(a.assessment_type for a in assessments)
            },
            "completion_status": {
                "completed": stats.completed_assessments,
                "pending": stats.pending_assessments,
                "overdue": stats.overdue_assessments,
                "passed": stats.passed_assessments,
                "failed": stats.failed_assessments
            },
            "urgency_distribution": {
                "critical": len([a for a in assessments if a.submission_urgency == "critical"]),
                "high": len([a for a in assessments if a.submission_urgency == "high"]),
                "medium": len([a for a in assessments if a.submission_urgency == "medium"]),
                "low": len([a for a in assessments if a.submission_urgency == "low"])
            }
        }
    
    def generate_assessment_alerts(self, filters: Optional[StudentAssessmentsViewFilters] = None) -> AssessmentAlerts:
        """
        Génère des alertes d'évaluations basées sur les deadlines et performances.
        
        Args:
            filters: Filtres optionnels pour limiter l'analyse
            
        Returns:
            Collection d'alertes d'évaluations
        """
        # Obtenir les évaluations selon les filtres
        assessments = self.repository.get_by_filters(filters or StudentAssessmentsViewFilters(), limit=1000)
        
        critical_alerts = []
        urgent_alerts = []
        warning_alerts = []
        positive_alerts = []
        
        overdue_submissions = 0
        urgent_deadlines = 0
        poor_performances = 0
        
        for assessment in assessments:
            alerts = self._generate_assessment_specific_alerts(assessment)
            
            for alert in alerts:
                if alert.severity == "critical":
                    critical_alerts.append(alert)
                    if alert.alert_type == "overdue":
                        overdue_submissions += 1
                    elif alert.alert_type == "poor_performance":
                        poor_performances += 1
                elif alert.severity == "high":
                    urgent_alerts.append(alert)
                    if alert.alert_type == "urgent_deadline":
                        urgent_deadlines += 1
                elif alert.severity == "medium":
                    warning_alerts.append(alert)
                elif alert.severity == "positive":
                    positive_alerts.append(alert)
        
        return AssessmentAlerts(
            critical_alerts=critical_alerts,
            urgent_alerts=urgent_alerts,
            warning_alerts=warning_alerts,
            positive_alerts=positive_alerts,
            total_alerts=len(critical_alerts) + len(urgent_alerts) + len(warning_alerts) + len(positive_alerts),
            overdue_submissions=overdue_submissions,
            urgent_deadlines=urgent_deadlines,
            poor_performances=poor_performances,
            alert_thresholds={
                "overdue_days": 1,
                "urgent_days": 3,
                "poor_performance_threshold": 50.0,
                "excellent_threshold": 90.0
            },
            generated_at=datetime.now().isoformat()
        )
    
    def _generate_assessment_specific_alerts(self, assessment: StudentAssessmentsComplete) -> list[AssessmentAlert]:
        """Génère des alertes pour une évaluation spécifique."""
        alerts = []
        current_date = date.today()
        
        # Alerte évaluation en retard
        if assessment.deadline_status == 'overdue' and assessment.grade_id is None:
            days_overdue = (current_date - assessment.due_date).days if assessment.due_date else 0
            
            alerts.append(AssessmentAlert(
                alert_type="overdue",
                severity="critical",
                student_id=assessment.student_id,
                student_name=assessment.student_name,
                assessment_id=assessment.assessment_id,
                assessment_name=assessment.assessment_name,
                course_name=assessment.course_name,
                current_status=assessment.student_assessment_status,
                due_date=assessment.due_date,
                days_overdue=days_overdue,
                description=f"Évaluation en retard de {days_overdue} jour(s): {assessment.assessment_name}",
                recommended_actions=["Compléter immédiatement l'évaluation", "Contacter l'enseignant pour discuter des pénalités"],
                created_at=datetime.now().isoformat(),
                requires_immediate_action=True,
                escalation_level=3
            ))
        
        # Alerte échéance urgente
        elif assessment.deadline_status == 'urgent' and assessment.grade_id is None:
            alerts.append(AssessmentAlert(
                alert_type="urgent_deadline",
                severity="high",
                student_id=assessment.student_id,
                student_name=assessment.student_name,
                assessment_id=assessment.assessment_id,
                assessment_name=assessment.assessment_name,
                course_name=assessment.course_name,
                current_status=assessment.student_assessment_status,
                due_date=assessment.due_date,
                description=f"Échéance urgente dans {assessment.days_until_due} jour(s): {assessment.assessment_name}",
                recommended_actions=["Prioriser cette évaluation", "Planifier du temps d'étude dédié"],
                created_at=datetime.now().isoformat(),
                requires_immediate_action=True,
                escalation_level=2
            ))
        
        # Alerte performance faible
        if assessment.score is not None and assessment.is_passing is False:
            alerts.append(AssessmentAlert(
                alert_type="poor_performance",
                severity="critical",
                student_id=assessment.student_id,
                student_name=assessment.student_name,
                assessment_id=assessment.assessment_id,
                assessment_name=assessment.assessment_name,
                course_name=assessment.course_name,
                current_status=assessment.student_assessment_status,
                current_score=assessment.score,
                description=f"Échec à l'évaluation {assessment.assessment_name} (score: {assessment.score:.1f}%)",
                recommended_actions=["Réviser le matériel d'étude", "Demander de l'aide supplémentaire", "Analyser les erreurs commises"],
                created_at=datetime.now().isoformat(),
                requires_immediate_action=False,
                escalation_level=2
            ))
        
        # Alerte performance excellente
        elif assessment.score is not None and assessment.score >= 90:
            alerts.append(AssessmentAlert(
                alert_type="excellent_performance",
                severity="positive",
                student_id=assessment.student_id,
                student_name=assessment.student_name,
                assessment_id=assessment.assessment_id,
                assessment_name=assessment.assessment_name,
                course_name=assessment.course_name,
                current_status=assessment.student_assessment_status,
                current_score=assessment.score,
                description=f"Performance excellente dans {assessment.assessment_name} (score: {assessment.score:.1f}%)",
                recommended_actions=["Continuer sur cette lancée", "Partager les stratégies d'étude réussies", "Considérer du mentorat"],
                created_at=datetime.now().isoformat(),
                requires_immediate_action=False,
                escalation_level=0
            ))
        
        return alerts
    
    def get_teacher_assessments_overview(self, teacher_id: UUID) -> TeacherAssessmentsOverview:
        """
        Obtient une vue d'ensemble des évaluations pour un enseignant.
        
        Args:
            teacher_id: UUID de l'enseignant
            
        Returns:
            Vue d'ensemble complète des évaluations de l'enseignant
        """
        teacher_data = self.repository.get_teacher_grading_workload(teacher_id)
        assessments = self.repository.get_by_teacher_id(teacher_id)
        
        # Analyser les performances par évaluation
        assessment_performance = {}
        for assessment in assessments:
            if assessment.assessment_id not in assessment_performance:
                assessment_performance[assessment.assessment_id] = {
                    "name": assessment.assessment_name,
                    "type": assessment.assessment_type,
                    "course": assessment.course_name,
                    "scores": []
                }
            
            if assessment.score is not None:
                assessment_performance[assessment.assessment_id]["scores"].append(assessment.score)
        
        # Calculer les moyennes par évaluation
        class_averages = {}
        distribution_by_grade = {}
        completion_rates = {}
        
        for assess_id, data in assessment_performance.items():
            assess_name = f"{data['course']} - {data['name']}"
            scores = data["scores"]
            
            if scores:
                class_averages[assess_name] = sum(scores) / len(scores)
                
                # Distribution des notes
                distribution_by_grade[assess_name] = {
                    "A": len([s for s in scores if s >= 90]),
                    "B": len([s for s in scores if 80 <= s < 90]),
                    "C": len([s for s in scores if 70 <= s < 80]),
                    "D": len([s for s in scores if 60 <= s < 70]),
                    "F": len([s for s in scores if s < 60])
                }
            
            # Taux de completion
            total_students = len([a for a in assessments if a.assessment_id == assess_id])
            completed = len(scores)
            completion_rates[assess_name] = (completed / total_students * 100) if total_students > 0 else 0
        
        # Identifier les évaluations problématiques et performantes
        most_challenging = sorted(
            [(name, avg) for name, avg in class_averages.items()],
            key=lambda x: x[1]
        )[:3]
        
        best_performing = sorted(
            [(name, avg) for name, avg in class_averages.items()],
            key=lambda x: x[1], reverse=True
        )[:3]
        
        # Identifier les étudiants nécessitant une attention
        students_needing_attention = []
        student_performance = {}
        
        for assessment in assessments:
            if assessment.student_id not in student_performance:
                student_performance[assessment.student_id] = {
                    "name": assessment.student_name,
                    "scores": [],
                    "overdue_count": 0
                }
            
            if assessment.score is not None:
                student_performance[assessment.student_id]["scores"].append(assessment.score)
            
            if assessment.deadline_status == 'overdue':
                student_performance[assessment.student_id]["overdue_count"] += 1
        
        for student_id, data in student_performance.items():
            if data["scores"]:
                avg_score = sum(data["scores"]) / len(data["scores"])
                if avg_score < 60 or data["overdue_count"] >= 2:
                    students_needing_attention.append({
                        "student_name": data["name"],
                        "average_score": avg_score,
                        "overdue_assignments": data["overdue_count"],
                        "concern_level": "high" if avg_score < 50 or data["overdue_count"] >= 3 else "medium"
                    })
        
        return TeacherAssessmentsOverview(
            teacher_info=teacher_data.get("teacher_info", {}),
            total_assessments=teacher_data.get("workload", {}).get("total_assessments", 0),
            graded_assessments=teacher_data.get("workload", {}).get("graded_assessments", 0),
            pending_grading=teacher_data.get("workload", {}).get("pending_grading", 0),
            class_averages=class_averages,
            distribution_by_grade=distribution_by_grade,
            completion_rates=completion_rates,
            grading_workload={
                "pending": teacher_data.get("workload", {}).get("pending_grading", 0),
                "overdue": teacher_data.get("workload", {}).get("overdue_grading", 0),
                "urgent": teacher_data.get("workload", {}).get("urgent_grading", 0),
                "avg_delay": teacher_data.get("efficiency", {}).get("avg_grading_delay_days", 0.0)
            },
            upcoming_deadlines=[
                {
                    "assessment_name": a.assessment_name,
                    "course_name": a.course_name,
                    "due_date": a.due_date.isoformat() if a.due_date else None,
                    "pending_submissions": 1 if a.grade_id is None else 0
                }
                for a in assessments
                if a.due_date and a.due_date >= date.today() and a.grade_id is None
            ][:10],
            most_challenging_assessments=[{"name": name, "average": avg} for name, avg in most_challenging],
            best_performing_assessments=[{"name": name, "average": avg} for name, avg in best_performing],
            students_needing_attention=students_needing_attention[:10]
        )
    
    def search_assessments(self, search_term: str, limit: int = 50) -> list[StudentAssessmentsCompleteWithAnalytics]:
        """
        Recherche des évaluations avec analyses enrichies.
        
        Args:
            search_term: Terme de recherche
            limit: Nombre maximum de résultats
            
        Returns:
            Liste des évaluations trouvées avec analyses
        """
        assessments = self.repository.search_assessments(search_term.strip(), limit)
        
        # Enrichir avec les analyses
        enriched_assessments = []
        current_date = date.today()
        
        for assessment in assessments:
            # Obtenir les statistiques de l'étudiant pour les comparaisons
            student_stats = self.repository.get_student_assessments_statistics(assessment.student_id)
            analytics = self._calculate_assessment_analytics(assessment, student_stats, current_date)
            enriched_assessments.append(analytics)
        
        return enriched_assessments