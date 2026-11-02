"""
Service pour la gestion de la logique métier des cours étudiants.
Fournit des analyses avancées, des recommandations et des rapports.
"""

from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from app.models.student_courses_view import (
    StudentCoursesComplete,
    StudentCoursesCompleteWithAnalytics,
    StudentCoursesViewFilters,
    StudentCoursesStatistics,
    CoursePerformanceReport,
    TeacherCoursesOverview,
    AcademicAlert,
    AcademicAlerts,
    StudentProgressTracker,
    CourseComparisonAnalysis,
    AcademicYearSummary,
    ProgramPerformanceAnalysis
)
from app.repositories.student_courses_view_repository import StudentCoursesViewRepository


class StudentCoursesViewService:
    """Service pour la gestion des cours étudiants avec analyses avancées."""
    
    def __init__(self, repository: StudentCoursesViewRepository):
        self.repository = repository
    
    def get_student_courses_with_analytics(
        self, 
        student_id: UUID
    ) -> list[StudentCoursesCompleteWithAnalytics]:
        """
        Récupère les cours d'un étudiant avec analyses et calculs enrichis.
        
        Args:
            student_id: UUID de l'étudiant
            
        Returns:
            Liste des cours avec analyses complètes
        """
        courses = self.repository.get_by_student_id(student_id)
        if not courses:
            return []
        
        # Obtenir les statistiques globales pour les comparaisons
        stats = self.repository.get_student_courses_statistics(student_id)
        
        analytics_courses = []
        current_date = date.today()
        
        for course in courses:
            analytics = self._calculate_course_analytics(course, stats, current_date)
            analytics_courses.append(analytics)
        
        return analytics_courses
    
    def _calculate_course_analytics(
        self, 
        course: StudentCoursesComplete, 
        student_stats: StudentCoursesStatistics,
        current_date: date
    ) -> StudentCoursesCompleteWithAnalytics:
        """
        Calcule les analyses enrichies pour un cours spécifique.
        
        Args:
            course: Données de base du cours
            student_stats: Statistiques globales de l'étudiant
            current_date: Date actuelle pour les calculs temporels
            
        Returns:
            Cours avec analyses enrichies
        """
        # Calculs de base
        completion_percentage = None
        if course.total_assessments > 0:
            completion_percentage = (course.completed_assessments / course.total_assessments) * 100
        
        # Niveau de performance
        performance_level = self._determine_performance_level(course.current_average)
        grade_letter = self._calculate_grade_letter(course.current_average)
        is_passing = course.current_average >= 60 if course.current_average else None
        
        # Analyses temporelles
        days_remaining = None
        weeks_elapsed = None
        progress_rate = None
        
        if course.session_start_date and course.session_end_date:
            if current_date <= course.session_end_date:
                days_remaining = (course.session_end_date - current_date).days
            
            session_duration = (course.session_end_date - course.session_start_date).days
            elapsed_days = (current_date - course.session_start_date).days
            
            if elapsed_days > 0:
                weeks_elapsed = elapsed_days // 7
                if weeks_elapsed > 0:
                    progress_rate = course.completed_assessments / weeks_elapsed
        
        # Analyses comparatives (simulées pour cet exemple)
        class_average = self._get_class_average_simulation(course.course_session_id)
        rank_in_class = self._calculate_class_rank_simulation(course, class_average)
        percentile = self._calculate_percentile_simulation(course.current_average, class_average)
        above_class_average = course.current_average > class_average if course.current_average and class_average else None
        
        # Prédictions
        predicted_final_grade = self._predict_final_grade(course)
        risk_level = self._assess_risk_level(course, completion_percentage)
        recommendation_type = self._generate_recommendation_type(course, risk_level, performance_level)
        
        # Indicateurs visuels
        status_icon = self._get_status_icon(course.computed_status, risk_level)
        progress_bar_percentage = completion_percentage or 0
        
        return StudentCoursesCompleteWithAnalytics(
            **course.model_dump(),
            completion_percentage=completion_percentage,
            performance_level=performance_level,
            grade_letter=grade_letter,
            is_passing=is_passing,
            days_remaining=days_remaining,
            weeks_elapsed=weeks_elapsed,
            progress_rate=progress_rate,
            rank_in_class=rank_in_class,
            percentile=percentile,
            class_average=class_average,
            above_class_average=above_class_average,
            predicted_final_grade=predicted_final_grade,
            risk_level=risk_level,
            recommendation_type=recommendation_type,
            status_icon=status_icon,
            progress_bar_percentage=progress_bar_percentage
        )
    
    def _determine_performance_level(self, average: Optional[float]) -> Optional[str]:
        """Détermine le niveau de performance basé sur la moyenne."""
        if not average:
            return None
        
        if average >= 90:
            return "excellent"
        elif average >= 80:
            return "good"
        elif average >= 70:
            return "average"
        elif average >= 60:
            return "below_average"
        else:
            return "poor"
    
    def _calculate_grade_letter(self, average: Optional[float]) -> Optional[str]:
        """Calcule la note lettre basée sur la moyenne."""
        if not average:
            return None
        
        if average >= 90:
            return "A"
        elif average >= 80:
            return "B"
        elif average >= 70:
            return "C"
        elif average >= 60:
            return "D"
        else:
            return "F"
    
    def _get_class_average_simulation(self, course_session_id: UUID) -> Optional[float]:
        """Simule le calcul de la moyenne de classe (à remplacer par une vraie requête)."""
        # Dans un vrai système, ceci ferait appel au repository
        # pour calculer la moyenne réelle de la classe
        session_stats = self.repository.get_course_session_statistics(course_session_id)
        return session_stats.get("class_average")
    
    def _calculate_class_rank_simulation(self, course: StudentCoursesComplete, class_average: Optional[float]) -> Optional[int]:
        """Simule le calcul du rang dans la classe."""
        if not course.current_average or not class_average:
            return None
        
        # Simulation simple - dans un vrai système, ce serait calculé avec toutes les notes
        if course.current_average >= class_average + 10:
            return 1  # Top performer
        elif course.current_average >= class_average:
            return 5  # Above average
        else:
            return 10  # Below average
    
    def _calculate_percentile_simulation(self, student_average: Optional[float], class_average: Optional[float]) -> Optional[float]:
        """Simule le calcul du percentile."""
        if not student_average or not class_average:
            return None
        
        # Simulation simple
        if student_average >= class_average + 15:
            return 95.0
        elif student_average >= class_average + 5:
            return 75.0
        elif student_average >= class_average:
            return 60.0
        else:
            return 25.0
    
    def _predict_final_grade(self, course: StudentCoursesComplete) -> Optional[float]:
        """Prédit la note finale basée sur les performances actuelles."""
        if not course.current_average or course.completed_assessments == 0:
            return None
        
        # Simulation d'une prédiction simple
        # Dans un vrai système, ceci utiliserait un modèle plus sophistiqué
        completion_factor = course.completed_assessments / max(course.total_assessments, 1)
        
        if completion_factor < 0.3:
            # Trop tôt pour prédire précisément
            return course.current_average * 0.95  # Légère baisse anticipée
        elif completion_factor >= 0.7:
            # Bonne base pour prédiction
            return course.current_average * 1.02  # Légère amélioration possible
        else:
            # Prédiction modérée
            return course.current_average
    
    def _assess_risk_level(self, course: StudentCoursesComplete, completion_percentage: Optional[float]) -> Optional[str]:
        """Évalue le niveau de risque pour un cours."""
        if not course.current_average:
            return "medium"  # Manque de données = risque modéré
        
        risk_factors = []
        
        # Facteur de performance
        if course.current_average < 50:
            risk_factors.append("critical_performance")
        elif course.current_average < 60:
            risk_factors.append("poor_performance")
        
        # Facteur de progression
        if completion_percentage and completion_percentage < 30:
            risk_factors.append("low_completion")
        
        # Facteur temporel
        current_date = date.today()
        if course.session_end_date and course.session_start_date:
            session_progress = (current_date - course.session_start_date).days / (course.session_end_date - course.session_start_date).days
            if completion_percentage and session_progress > 0.5 and completion_percentage < session_progress * 70:
                risk_factors.append("behind_schedule")
        
        # Évaluation finale du risque
        if any("critical" in factor for factor in risk_factors):
            return "high"
        elif len(risk_factors) >= 2:
            return "medium"
        elif len(risk_factors) == 1:
            return "low"
        else:
            return "low"
    
    def _generate_recommendation_type(self, course: StudentCoursesComplete, risk_level: str, performance_level: Optional[str]) -> Optional[str]:
        """Génère le type de recommandation approprié."""
        if risk_level == "high":
            return "urgent_intervention"
        elif risk_level == "medium":
            return "academic_support"
        elif performance_level == "excellent":
            return "advanced_opportunities"
        elif performance_level == "good":
            return "maintain_performance"
        else:
            return "study_improvement"
    
    def _get_status_icon(self, computed_status: str, risk_level: str) -> Optional[str]:
        """Retourne l'icône appropriée pour le statut."""
        status_icons = {
            "completed": "✅" if risk_level == "low" else "⚠️",
            "in_progress": "🔄" if risk_level == "low" else "⚠️",
            "failed": "❌",
            "not_started": "⏳"
        }
        return status_icons.get(computed_status, "❓")
    
    def generate_student_performance_report(self, student_id: UUID) -> CoursePerformanceReport:
        """
        Génère un rapport complet de performance pour un étudiant.
        
        Args:
            student_id: UUID de l'étudiant
            
        Returns:
            Rapport détaillé de performance
        """
        courses = self.get_student_courses_with_analytics(student_id)
        stats = self.repository.get_student_courses_statistics(student_id)
        trends = self.repository.get_performance_trends(student_id)
        
        # Informations de l'étudiant (premier cours pour les détails)
        student_info = {}
        if courses:
            first_course = courses[0]
            student_info = {
                "student_id": first_course.student_id,
                "student_name": first_course.student_name,
                "student_number": first_course.student_number,
                "student_email": first_course.student_email,
                "current_year_level": first_course.current_year_level
            }
        
        # Analyses détaillées
        strengths = self._identify_strengths(courses, stats)
        areas_for_improvement = self._identify_improvement_areas(courses, stats)
        recommendations = self._generate_recommendations(courses, stats, trends)
        
        # Comparaisons
        peer_comparison = self._calculate_peer_comparison(student_id, stats)
        historical_comparison = trends
        
        # Prédictions
        graduation_prediction = self._calculate_graduation_prediction(courses, stats)
        at_risk_courses = self._identify_at_risk_courses(courses)
        
        # Données pour graphiques
        charts_data = self._prepare_charts_data(courses, stats)
        
        return CoursePerformanceReport(
            report_period=f"Jusqu'au {date.today().strftime('%d/%m/%Y')}",
            generated_at=datetime.now().isoformat(),
            student_info=student_info,
            courses_summary=stats,
            course_details=courses,
            strengths=strengths,
            areas_for_improvement=areas_for_improvement,
            recommendations=recommendations,
            peer_comparison=peer_comparison,
            historical_comparison=historical_comparison,
            graduation_prediction=graduation_prediction,
            at_risk_courses=at_risk_courses,
            charts_data=charts_data
        )
    
    def _identify_strengths(self, courses: list[StudentCoursesCompleteWithAnalytics], stats: StudentCoursesStatistics) -> list[str]:
        """Identifie les forces de l'étudiant."""
        strengths = []
        
        if stats.overall_average >= 85:
            strengths.append("Performance académique excellente avec une moyenne générale élevée")
        
        if stats.completion_rate >= 90:
            strengths.append("Excellent taux de complétion des cours")
        
        excellent_courses = [c for c in courses if c.performance_level == "excellent"]
        if len(excellent_courses) >= 3:
            strengths.append(f"Performance excellente dans {len(excellent_courses)} cours")
        
        consistent_performer = all(c.current_average and c.current_average >= 70 for c in courses if c.current_average)
        if consistent_performer and len(courses) >= 3:
            strengths.append("Performance consistante dans tous les cours")
        
        return strengths
    
    def _identify_improvement_areas(self, courses: list[StudentCoursesCompleteWithAnalytics], stats: StudentCoursesStatistics) -> list[str]:
        """Identifie les domaines d'amélioration."""
        areas = []
        
        if stats.overall_average < 70:
            areas.append("Améliorer la performance académique générale")
        
        failed_courses = [c for c in courses if c.computed_status == "failed"]
        if failed_courses:
            areas.append(f"Rattraper {len(failed_courses)} cours échoués")
        
        low_completion = [c for c in courses if c.completion_percentage and c.completion_percentage < 50]
        if low_completion:
            areas.append("Améliorer le rythme de complétion des évaluations")
        
        high_risk_courses = [c for c in courses if c.risk_level == "high"]
        if high_risk_courses:
            areas.append(f"Intervention urgente requise pour {len(high_risk_courses)} cours à risque")
        
        return areas
    
    def _generate_recommendations(self, courses: list[StudentCoursesCompleteWithAnalytics], stats: StudentCoursesStatistics, trends: dict) -> list[str]:
        """Génère des recommandations personnalisées."""
        recommendations = []
        
        if trends.get("trend") == "declining":
            recommendations.append("Consulter un conseiller académique pour identifier les causes de la baisse de performance")
        
        urgent_courses = [c for c in courses if c.recommendation_type == "urgent_intervention"]
        if urgent_courses:
            recommendations.append(f"Obtenir un soutien académique immédiat pour: {', '.join(c.course_name for c in urgent_courses)}")
        
        if stats.completion_rate < 80:
            recommendations.append("Améliorer l'organisation et la planification des études")
        
        excellent_courses = [c for c in courses if c.performance_level == "excellent"]
        if excellent_courses:
            recommendations.append("Considérer des projets avancés ou des cours optionnels dans vos domaines forts")
        
        return recommendations
    
    def _calculate_peer_comparison(self, student_id: UUID, stats: StudentCoursesStatistics) -> dict:
        """Calcule les comparaisons avec les pairs (simulation)."""
        # Dans un vrai système, ceci comparerait avec des étudiants similaires
        return {
            "average_compared_to_peers": "above_average" if stats.overall_average >= 75 else "below_average",
            "percentile_rank": min(95, max(5, stats.overall_average - 20)),
            "peer_group_size": 150  # Simulation
        }
    
    def _calculate_graduation_prediction(self, courses: list[StudentCoursesCompleteWithAnalytics], stats: StudentCoursesStatistics) -> dict:
        """Calcule les prédictions de graduation."""
        if not courses:
            return {"status": "insufficient_data"}
        
        # Simulation de prédiction basée sur la performance actuelle
        success_probability = min(95, max(10, stats.success_rate))
        
        return {
            "probability": success_probability,
            "status": "on_track" if success_probability >= 80 else "at_risk",
            "estimated_completion": "normal" if success_probability >= 70 else "delayed",
            "required_improvements": [] if success_probability >= 80 else ["Améliorer la moyenne générale", "Compléter plus d'évaluations"]
        }
    
    def _identify_at_risk_courses(self, courses: list[StudentCoursesCompleteWithAnalytics]) -> list[dict]:
        """Identifie les cours à risque."""
        at_risk = []
        
        for course in courses:
            if course.risk_level in ["medium", "high"]:
                at_risk.append({
                    "course_name": course.course_name,
                    "course_code": course.course_code,
                    "risk_level": course.risk_level,
                    "current_average": course.current_average,
                    "completion_percentage": course.completion_percentage,
                    "recommendation": course.recommendation_type
                })
        
        return at_risk
    
    def _prepare_charts_data(self, courses: list[StudentCoursesCompleteWithAnalytics], stats: StudentCoursesStatistics) -> dict:
        """Prépare les données pour les graphiques."""
        return {
            "performance_timeline": [
                {
                    "course": c.course_name,
                    "average": c.current_average,
                    "date": c.session_start_date.isoformat() if c.session_start_date else None
                }
                for c in sorted(courses, key=lambda x: x.session_start_date or date.min)
                if c.current_average
            ],
            "grade_distribution": {
                "A": len([c for c in courses if c.grade_letter == "A"]),
                "B": len([c for c in courses if c.grade_letter == "B"]),
                "C": len([c for c in courses if c.grade_letter == "C"]),
                "D": len([c for c in courses if c.grade_letter == "D"]),
                "F": len([c for c in courses if c.grade_letter == "F"])
            },
            "completion_progress": {
                "completed": stats.completed_courses,
                "in_progress": stats.in_progress_courses,
                "not_started": stats.not_started_courses,
                "failed": stats.failed_courses
            }
        }
    
    def generate_academic_alerts(self, filters: Optional[StudentCoursesViewFilters] = None) -> AcademicAlerts:
        """
        Génère des alertes académiques basées sur les performances.
        
        Args:
            filters: Filtres optionnels pour limiter l'analyse
            
        Returns:
            Collection d'alertes académiques
        """
        # Obtenir les cours selon les filtres
        courses = self.repository.get_by_filters(filters or StudentCoursesViewFilters(), limit=1000)
        
        critical_alerts = []
        warning_alerts = []
        positive_alerts = []
        
        students_at_risk = set()
        courses_with_issues = set()
        
        for course in courses:
            alerts = self._generate_course_alerts(course)
            
            for alert in alerts:
                if alert.severity == "critical":
                    critical_alerts.append(alert)
                    students_at_risk.add(alert.student_id)
                    courses_with_issues.add(alert.course_id)
                elif alert.severity in ["high", "medium"]:
                    warning_alerts.append(alert)
                    if alert.severity == "high":
                        students_at_risk.add(alert.student_id)
                        courses_with_issues.add(alert.course_id)
                elif alert.severity == "positive":
                    positive_alerts.append(alert)
        
        return AcademicAlerts(
            critical_alerts=critical_alerts,
            warning_alerts=warning_alerts,
            positive_alerts=positive_alerts,
            total_alerts=len(critical_alerts) + len(warning_alerts) + len(positive_alerts),
            students_at_risk=len(students_at_risk),
            courses_with_issues=len(courses_with_issues),
            alert_thresholds={
                "critical_threshold": 50.0,
                "warning_threshold": 60.0,
                "excellent_threshold": 90.0
            },
            generated_at=datetime.now().isoformat()
        )
    
    def _generate_course_alerts(self, course: StudentCoursesComplete) -> list[AcademicAlert]:
        """Génère des alertes pour un cours spécifique."""
        alerts = []
        current_date = date.today()
        
        # Alerte performance critique
        if course.current_average and course.current_average < 50:
            alerts.append(AcademicAlert(
                alert_type="critical_performance",
                severity="critical",
                student_id=course.student_id,
                student_name=course.student_name,
                course_id=course.course_id,
                course_name=course.course_name,
                current_average=course.current_average,
                threshold_value=50.0,
                description=f"Performance critique dans {course.course_name} (moyenne: {course.current_average:.1f}%)",
                recommendations=["Intervention immédiate requise", "Soutien académique intensif", "Plan de rattrapage urgent"],
                created_at=datetime.now().isoformat(),
                requires_action=True,
                action_deadline=current_date + timedelta(days=7)
            ))
        
        # Alerte performance faible
        elif course.current_average and 50 <= course.current_average < 60:
            alerts.append(AcademicAlert(
                alert_type="low_performance",
                severity="high",
                student_id=course.student_id,
                student_name=course.student_name,
                course_id=course.course_id,
                course_name=course.course_name,
                current_average=course.current_average,
                threshold_value=60.0,
                description=f"Performance sous le seuil de réussite dans {course.course_name}",
                recommendations=["Soutien académique", "Révision des méthodes d'étude", "Suivi hebdomadaire"],
                created_at=datetime.now().isoformat(),
                requires_action=True,
                action_deadline=current_date + timedelta(days=14)
            ))
        
        # Alerte progression lente
        completion_percentage = 0
        if course.total_assessments > 0:
            completion_percentage = (course.completed_assessments / course.total_assessments) * 100
        
        if completion_percentage < 30 and course.session_active:
            alerts.append(AcademicAlert(
                alert_type="slow_progress",
                severity="medium",
                student_id=course.student_id,
                student_name=course.student_name,
                course_id=course.course_id,
                course_name=course.course_name,
                current_average=completion_percentage,
                threshold_value=30.0,
                description=f"Progression lente dans {course.course_name} (seulement {completion_percentage:.1f}% complété)",
                recommendations=["Planification des études", "Rattrapage des évaluations", "Suivi de progression"],
                created_at=datetime.now().isoformat(),
                requires_action=False
            ))
        
        # Alerte performance excellente
        if course.current_average and course.current_average >= 90:
            alerts.append(AcademicAlert(
                alert_type="excellent_performance",
                severity="positive",
                student_id=course.student_id,
                student_name=course.student_name,
                course_id=course.course_id,
                course_name=course.course_name,
                current_average=course.current_average,
                threshold_value=90.0,
                description=f"Performance excellente dans {course.course_name} (moyenne: {course.current_average:.1f}%)",
                recommendations=["Considérer des défis supplémentaires", "Opportunités d'approfondissement", "Mentorat d'autres étudiants"],
                created_at=datetime.now().isoformat(),
                requires_action=False
            ))
        
        return alerts
    
    def get_teacher_courses_overview(self, teacher_id: UUID) -> TeacherCoursesOverview:
        """
        Obtient une vue d'ensemble des cours pour un enseignant.
        
        Args:
            teacher_id: UUID de l'enseignant
            
        Returns:
            Vue d'ensemble complète des cours de l'enseignant
        """
        teacher_data = self.repository.get_teacher_courses_overview(teacher_id)
        courses = self.repository.get_by_teacher_id(teacher_id)
        
        # Regrouper les cours par session
        courses_by_session = {}
        for course in courses:
            session_key = course.course_session_id
            if session_key not in courses_by_session:
                courses_by_session[session_key] = {
                    "course_info": {
                        "name": course.course_name,
                        "code": course.course_code,
                        "session_id": course.course_session_id,
                        "classroom": course.classroom,
                        "session_active": course.session_active
                    },
                    "students": []
                }
            courses_by_session[session_key]["students"].append(course)
        
        # Analyser les performances par classe
        courses_details = []
        best_performing_classes = []
        classes_needing_attention = []
        
        for session_id, session_data in courses_by_session.items():
            students = session_data["students"]
            course_info = session_data["course_info"]
            
            # Calculer les statistiques de la classe
            averages = [s.current_average for s in students if s.current_average]
            class_average = sum(averages) / len(averages) if averages else 0
            
            passing_students = len([s for s in students if s.current_average and s.current_average >= 60])
            total_with_grades = len([s for s in students if s.current_average])
            passing_rate = (passing_students / total_with_grades * 100) if total_with_grades > 0 else 0
            
            class_detail = {
                "course_name": course_info["name"],
                "course_code": course_info["code"],
                "session_id": session_id,
                "classroom": course_info["classroom"],
                "total_students": len(students),
                "class_average": class_average,
                "passing_rate": passing_rate,
                "students_at_risk": len([s for s in students if s.current_average and s.current_average < 50])
            }
            
            courses_details.append(class_detail)
            
            # Classer les performances
            if class_average >= 80 and passing_rate >= 90:
                best_performing_classes.append(class_detail)
            elif class_average < 65 or passing_rate < 70:
                classes_needing_attention.append(class_detail)
        
        # Calculer les tendances (simulation simple)
        performance_trends = {
            "overall_trend": "stable",
            "best_performing_subject": max(courses_details, key=lambda x: x["class_average"])["course_name"] if courses_details else None,
            "most_challenging_subject": min(courses_details, key=lambda x: x["class_average"])["course_name"] if courses_details else None
        }
        
        return TeacherCoursesOverview(
            teacher_info=teacher_data.get("teacher_info", {}),
            total_courses=teacher_data.get("total_courses", 0),
            total_students=teacher_data.get("total_students", 0),
            active_sessions=teacher_data.get("active_sessions", 0),
            average_class_performance=teacher_data.get("average_class_performance", 0.0),
            students_passing_rate=teacher_data.get("students_passing_rate", 0.0),
            students_at_risk=teacher_data.get("students_at_risk", 0),
            courses_details=courses_details,
            best_performing_classes=best_performing_classes,
            classes_needing_attention=classes_needing_attention,
            performance_trends=performance_trends
        )
    
    def search_courses(self, search_term: str, limit: int = 50) -> list[StudentCoursesCompleteWithAnalytics]:
        """
        Recherche des cours avec analyses enrichies.
        
        Args:
            search_term: Terme de recherche
            limit: Nombre maximum de résultats
            
        Returns:
            Liste des cours trouvés avec analyses
        """
        courses = self.repository.search_courses(search_term, limit)
        
        # Enrichir avec les analyses
        enriched_courses = []
        current_date = date.today()
        
        for course in courses:
            # Obtenir les statistiques de l'étudiant pour les comparaisons
            student_stats = self.repository.get_student_courses_statistics(course.student_id)
            analytics = self._calculate_course_analytics(course, student_stats, current_date)
            enriched_courses.append(analytics)
        
        return enriched_courses