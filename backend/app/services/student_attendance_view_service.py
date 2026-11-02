"""
Service pour la gestion des vues complètes des présences étudiants.
Encapsule la logique métier pour les opérations sur v_student_attendance_complete.
"""

from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlmodel import Session

from app.models.student_attendance_view import (
    StudentAttendanceCompletePublic,
    StudentAttendanceCompleteWithCalculations,
    StudentAttendanceViewFilters,
    StudentAttendanceStatistics,
    StudentAttendanceViewSummary,
    AttendanceReport,
    AttendanceAlerts,
    CourseAttendanceSummary,
)
from app.repositories.student_attendance_view_repository import StudentAttendanceViewRepository


class StudentAttendanceViewService:
    """Service pour les opérations sur la vue complète des présences étudiants."""
    
    def __init__(self, session: Session):
        self.session = session
        self.repository = StudentAttendanceViewRepository(session)
    
    def get_student_attendance_with_analysis(
        self,
        student_id: UUID,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentAttendanceViewFilters] = None,
    ) -> tuple[List[StudentAttendanceCompleteWithCalculations], int]:
        """
        Récupère les présences d'un étudiant avec analyses enrichies.
        
        Args:
            student_id: ID de l'étudiant
            skip: Nombre d'enregistrements à ignorer
            limit: Nombre maximum d'enregistrements
            filters: Filtres optionnels
            
        Returns:
            Tuple contenant la liste des présences enrichies et le nombre total
        """
        if filters is None:
            filters = StudentAttendanceViewFilters(student_id=student_id)
        else:
            filters.student_id = student_id
        
        attendances = self.repository.get_by_student_id(
            student_id=student_id,
            skip=skip,
            limit=limit,
            filters=filters,
        )
        
        count = self.repository.count_by_filters(filters)
        
        # Enrichir avec les calculs et analyses
        enriched_attendances = self._enrich_attendances_with_calculations(
            attendances, 
            student_id
        )
        
        return enriched_attendances, count
    
    def get_student_attendance_report(
        self,
        student_id: UUID,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        course_id: Optional[UUID] = None,
    ) -> AttendanceReport:
        """
        Génère un rapport de présence détaillé pour un étudiant.
        
        Args:
            student_id: ID de l'étudiant
            date_from: Date de début de la période
            date_to: Date de fin de la période
            course_id: ID du cours (optionnel)
            
        Returns:
            Rapport de présence détaillé
        """
        # Définir la période par défaut (semestre actuel)
        if not date_from:
            date_from = datetime.now().date() - timedelta(days=90)
        if not date_to:
            date_to = datetime.now().date()
        
        # Récupérer les données de présence
        attendances = self.repository.get_by_date_range(
            start_date=date_from,
            end_date=date_to,
            student_id=student_id,
            course_id=course_id,
            skip=0,
            limit=1000,
        )
        
        # Enrichir avec les calculs
        enriched_attendances = self._enrich_attendances_with_calculations(
            attendances, 
            student_id
        )
        
        # Calculer les statistiques
        statistics = self.repository.get_student_attendance_statistics(
            student_id=student_id,
            date_from=date_from,
            date_to=date_to,
            course_id=course_id,
        )
        
        # Générer l'analyse et les recommandations
        analysis = self._generate_attendance_analysis(enriched_attendances, statistics)
        recommendations = self._generate_recommendations(statistics, analysis)
        
        # Préparer les données pour les graphiques
        charts_data = self._prepare_charts_data(enriched_attendances)
        
        return AttendanceReport(
            report_period=f"{date_from} to {date_to}",
            generated_at=datetime.now(),
            generated_for="student",
            student_info=self._get_student_info(enriched_attendances),
            course_info=self._get_course_info(enriched_attendances, course_id),
            statistics=statistics,
            attendance_records=enriched_attendances,
            analysis=analysis,
            recommendations=recommendations,
            charts_data=charts_data,
        )
    
    def get_course_session_attendance_with_statistics(
        self,
        course_session_id: UUID,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentAttendanceViewFilters] = None,
    ) -> tuple[List[StudentAttendanceCompleteWithCalculations], int, CourseAttendanceSummary]:
        """
        Récupère les présences d'une session de cours avec statistiques complètes.
        
        Args:
            course_session_id: ID de la session de cours
            skip: Nombre d'enregistrements à ignorer
            limit: Nombre maximum d'enregistrements
            filters: Filtres optionnels
            
        Returns:
            Tuple contenant les présences, le nombre total et les statistiques du cours
        """
        attendances = self.repository.get_by_course_session(
            course_session_id=course_session_id,
            skip=skip,
            limit=limit,
            filters=filters,
        )
        
        # Calculer le count total
        count_filters = StudentAttendanceViewFilters(course_session_id=course_session_id)
        if filters:
            # Combiner les filtres existants
            for field, value in filters.model_dump(exclude_none=True).items():
                if field != 'course_session_id':
                    setattr(count_filters, field, value)
        
        count = self.repository.count_by_filters(count_filters)
        
        # Enrichir avec les calculs
        enriched_attendances = self._enrich_attendances_with_calculations(attendances)
        
        # Obtenir le résumé du cours
        course_summary = self.repository.get_course_attendance_summary(course_session_id)
        
        # Enrichir le résumé avec des analyses supplémentaires
        course_summary.attendance_trends = self._analyze_course_trends(course_summary)
        
        return enriched_attendances, count, course_summary
    
    def get_teacher_attendance_overview(
        self,
        teacher_id: UUID,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Vue d'ensemble des présences pour un enseignant.
        
        Args:
            teacher_id: ID de l'enseignant
            date_from: Date de début
            date_to: Date de fin
            
        Returns:
            Dictionnaire avec la vue d'ensemble des présences
        """
        filters = StudentAttendanceViewFilters(
            teacher_id=teacher_id,
            session_date_from=date_from,
            session_date_to=date_to,
        )
        
        attendances = self.repository.get_by_teacher(
            teacher_id=teacher_id,
            skip=0,
            limit=1000,
            filters=filters,
        )
        
        # Grouper par cours
        courses_data = self._group_attendances_by_course(attendances)
        
        # Statistiques globales de l'enseignant
        overall_stats = self._calculate_teacher_overall_stats(attendances)
        
        # Identifier les problèmes et tendances
        alerts = self._identify_attendance_alerts(attendances)
        
        return {
            "teacher_id": str(teacher_id),
            "period": {
                "from": date_from.isoformat() if date_from else None,
                "to": date_to.isoformat() if date_to else None,
            },
            "overall_statistics": overall_stats,
            "courses_summary": courses_data,
            "alerts": alerts,
            "total_courses": len(courses_data),
            "total_students": len(set(a.student_id for a in attendances)),
        }
    
    def get_attendance_alerts(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        student_id: Optional[UUID] = None,
        course_id: Optional[UUID] = None,
    ) -> AttendanceAlerts:
        """
        Génère des alertes de présence basées sur des seuils.
        
        Args:
            date_from: Date de début
            date_to: Date de fin
            student_id: ID de l'étudiant (optionnel)
            course_id: ID du cours (optionnel)
            
        Returns:
            Alertes de présence
        """
        filters = StudentAttendanceViewFilters(
            session_date_from=date_from,
            session_date_to=date_to,
            student_id=student_id,
            course_id=course_id,
        )
        
        attendances = self.repository.search_attendance("", 0, 10000, filters)
        
        # Grouper par étudiant pour l'analyse
        student_data = self._group_attendances_by_student(attendances)
        
        alerts = AttendanceAlerts()
        
        for student_id_str, student_attendances in student_data.items():
            student_stats = self._calculate_student_stats(student_attendances)
            
            # Absentéisme chronique (< 75% de présence)
            if student_stats["attendance_rate"] < 75:
                alerts.chronic_absenteeism.append({
                    "student_id": student_id_str,
                    "student_name": student_attendances[0].student_name,
                    "attendance_rate": student_stats["attendance_rate"],
                    "total_sessions": student_stats["total_sessions"],
                    "absent_sessions": student_stats["absent_sessions"],
                })
            
            # Retards excessifs (> 20% de retards)
            if student_stats["tardiness_rate"] > 20:
                alerts.excessive_tardiness.append({
                    "student_id": student_id_str,
                    "student_name": student_attendances[0].student_name,
                    "tardiness_rate": student_stats["tardiness_rate"],
                    "average_delay": student_stats["average_delay"],
                    "late_sessions": student_stats["late_sessions"],
                })
            
            # Présence parfaite (100% de présence à l'heure)
            if student_stats["attendance_rate"] == 100 and student_stats["punctuality_rate"] == 100:
                alerts.perfect_attendance.append({
                    "student_id": student_id_str,
                    "student_name": student_attendances[0].student_name,
                    "total_sessions": student_stats["total_sessions"],
                    "streak": student_stats["attendance_streak"],
                })
        
        alerts.alert_threshold = {
            "chronic_absenteeism": 75.0,
            "excessive_tardiness": 20.0,
            "perfect_attendance": 100.0,
        }
        
        return alerts
    
    def get_year_level_attendance_analysis(
        self,
        year_level: int,
        session_id: Optional[UUID] = None,
        academic_year_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Analyse des présences par niveau d'année.
        
        Args:
            year_level: Niveau d'année
            session_id: ID de la session (optionnel)
            academic_year_id: ID de l'année académique (optionnel)
            
        Returns:
            Dictionnaire avec l'analyse des présences par niveau
        """
        filters = StudentAttendanceViewFilters(
            current_year_level=year_level,
            session_id=session_id,
            academic_year_id=academic_year_id,
        )
        
        attendances = self.repository.search_attendance("", 0, 10000, filters)
        
        # Analyser les performances
        performance_analysis = self._analyze_year_level_performance(attendances)
        
        # Analyser par cours
        course_analysis = self._analyze_attendance_by_course(attendances)
        
        # Identifier les tendances temporelles
        temporal_trends = self._analyze_temporal_trends(attendances)
        
        return {
            "year_level": year_level,
            "total_students": len(set(a.student_id for a in attendances)),
            "total_sessions": len(attendances),
            "performance_analysis": performance_analysis,
            "course_analysis": course_analysis,
            "temporal_trends": temporal_trends,
        }
    
    def search_attendance_with_context(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[StudentAttendanceViewFilters] = None,
    ) -> tuple[List[StudentAttendanceCompleteWithCalculations], int]:
        """
        Recherche dans les présences avec contexte enrichi.
        
        Args:
            search_term: Terme de recherche
            skip: Nombre d'enregistrements à ignorer
            limit: Nombre maximum d'enregistrements
            filters: Filtres optionnels
            
        Returns:
            Tuple contenant les résultats enrichis et le nombre total
        """
        attendances = self.repository.search_attendance(
            search_term=search_term,
            skip=skip,
            limit=limit,
            filters=filters,
        )
        
        # Pour le count, faire une recherche sans pagination
        all_results = self.repository.search_attendance(
            search_term=search_term,
            skip=0,
            limit=1000,
            filters=filters,
        )
        count = len(all_results)
        
        # Enrichir avec les calculs
        enriched_attendances = self._enrich_attendances_with_calculations(attendances)
        
        return enriched_attendances, count
    
    def _enrich_attendances_with_calculations(
        self,
        attendances: List[StudentAttendanceCompletePublic],
        specific_student_id: Optional[UUID] = None,
    ) -> List[StudentAttendanceCompleteWithCalculations]:
        """Enrichit les présences avec des calculs supplémentaires."""
        
        enriched_attendances = []
        
        # Si on analyse un étudiant spécifique, calculer des stats globales
        if specific_student_id:
            student_stats = self.repository.get_student_attendance_statistics(specific_student_id)
        
        for attendance in attendances:
            attendance_dict = attendance.model_dump()
            
            # Calculs de base
            now = datetime.now().date()
            session_date = attendance.session_date
            days_since = (now - session_date).days if session_date else 0
            
            attendance_dict["days_since_session"] = days_since
            attendance_dict["is_recent_session"] = days_since <= 7
            
            # Calcul du statut de ponctualité
            if attendance.minutes_late == 0:
                punctuality_status = "excellent"
            elif attendance.minutes_late <= 5:
                punctuality_status = "good"
            elif attendance.minutes_late <= 15:
                punctuality_status = "needs_improvement"
            else:
                punctuality_status = "poor"
            
            attendance_dict["punctuality_status"] = punctuality_status
            
            # Indicateur de retard chronique (simplifiée)
            attendance_dict["is_chronically_late"] = attendance.minutes_late > 10
            
            # Calculs pour étudiant spécifique
            if specific_student_id and attendance.student_id == specific_student_id:
                attendance_dict["attendance_rate_percentage"] = student_stats.attendance_rate
            
            enriched_attendances.append(StudentAttendanceCompleteWithCalculations(**attendance_dict))
        
        return enriched_attendances
    
    def _generate_attendance_analysis(
        self, 
        attendances: List[StudentAttendanceCompleteWithCalculations], 
        statistics: StudentAttendanceStatistics
    ) -> Dict[str, Any]:
        """Génère une analyse des présences."""
        
        if not attendances:
            return {"message": "Aucune donnée disponible pour l'analyse"}
        
        # Analyse par jour de la semaine
        day_analysis = {}
        for attendance in attendances:
            day = attendance.day_of_week
            if day not in day_analysis:
                day_analysis[day] = {"present": 0, "absent": 0, "late": 0, "total": 0}
            
            day_analysis[day]["total"] += 1
            if attendance.attendance_category in ["on_time", "late_arrival"]:
                day_analysis[day]["present"] += 1
            elif attendance.attendance_category == "late":
                day_analysis[day]["late"] += 1
            else:
                day_analysis[day]["absent"] += 1
        
        # Identifier les tendances temporelles
        temporal_trend = self._identify_temporal_trend(attendances)
        
        # Analyse des patterns
        patterns = self._identify_attendance_patterns(attendances)
        
        return {
            "temporal_trend": temporal_trend,
            "day_of_week_analysis": day_analysis,
            "attendance_patterns": patterns,
            "risk_level": self._calculate_risk_level(statistics),
        }
    
    def _generate_recommendations(
        self, 
        statistics: StudentAttendanceStatistics, 
        analysis: Dict[str, Any]
    ) -> List[str]:
        """Génère des recommandations basées sur les statistiques et l'analyse."""
        
        recommendations = []
        
        # Recommandations basées sur le taux de présence
        if statistics.attendance_rate < 75:
            recommendations.append("🚨 URGENT: Taux de présence critique. Rencontrer l'étudiant et les parents.")
        elif statistics.attendance_rate < 85:
            recommendations.append("⚠️ Amélioration nécessaire du taux de présence.")
        elif statistics.attendance_rate >= 95:
            recommendations.append("✅ Excellente assiduité ! Continuer ainsi.")
        
        # Recommandations sur la ponctualité
        if statistics.punctuality_rate < 80:
            recommendations.append("⏰ Travail nécessaire sur la ponctualité.")
        
        # Recommandations basées sur les tendances
        risk_level = analysis.get("risk_level", "low")
        if risk_level == "high":
            recommendations.append("📞 Contact immédiat avec l'étudiant recommandé.")
        elif risk_level == "medium":
            recommendations.append("📝 Suivi rapproché recommandé.")
        
        # Recommandations par jour de la semaine
        day_analysis = analysis.get("day_of_week_analysis", {})
        problematic_days = [
            day for day, data in day_analysis.items() 
            if data["total"] > 0 and (data["absent"] / data["total"]) > 0.3
        ]
        if problematic_days:
            day_names = {1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi", 7: "Dimanche"}
            days_str = ", ".join([day_names.get(day, str(day)) for day in problematic_days])
            recommendations.append(f"📅 Attention particulière les {days_str}.")
        
        return recommendations
    
    def _prepare_charts_data(
        self, 
        attendances: List[StudentAttendanceCompleteWithCalculations]
    ) -> Dict[str, Any]:
        """Prépare les données pour les graphiques."""
        
        # Données pour graphique temporel
        daily_data = {}
        for attendance in attendances:
            date_str = attendance.session_date.isoformat()
            if date_str not in daily_data:
                daily_data[date_str] = {"present": 0, "absent": 0, "late": 0}
            
            if attendance.attendance_category in ["on_time", "late_arrival"]:
                daily_data[date_str]["present"] += 1
            elif attendance.attendance_category == "late":
                daily_data[date_str]["late"] += 1
            else:
                daily_data[date_str]["absent"] += 1
        
        # Données pour graphique par cours
        course_data = {}
        for attendance in attendances:
            course = attendance.course_name
            if course not in course_data:
                course_data[course] = {"present": 0, "absent": 0, "total": 0}
            
            course_data[course]["total"] += 1
            if attendance.attendance_category in ["on_time", "late_arrival"]:
                course_data[course]["present"] += 1
            else:
                course_data[course]["absent"] += 1
        
        return {
            "daily_attendance": daily_data,
            "course_attendance": course_data,
            "status_distribution": self._calculate_status_distribution(attendances),
        }
    
    def _calculate_status_distribution(
        self, 
        attendances: List[StudentAttendanceCompleteWithCalculations]
    ) -> Dict[str, int]:
        """Calcule la distribution des statuts de présence."""
        
        distribution = {}
        for attendance in attendances:
            status = attendance.attendance_category
            distribution[status] = distribution.get(status, 0) + 1
        
        return distribution
    
    def _identify_temporal_trend(
        self, 
        attendances: List[StudentAttendanceCompleteWithCalculations]
    ) -> str:
        """Identifie la tendance temporelle des présences."""
        
        if len(attendances) < 4:
            return "insufficient_data"
        
        # Trier par date
        sorted_attendances = sorted(attendances, key=lambda x: x.session_date)
        
        # Diviser en deux périodes
        mid_point = len(sorted_attendances) // 2
        first_half = sorted_attendances[:mid_point]
        second_half = sorted_attendances[mid_point:]
        
        # Calculer les taux de présence
        first_rate = len([a for a in first_half if a.attendance_category in ["on_time", "late_arrival"]]) / len(first_half) * 100
        second_rate = len([a for a in second_half if a.attendance_category in ["on_time", "late_arrival"]]) / len(second_half) * 100
        
        if second_rate > first_rate + 5:
            return "improving"
        elif second_rate < first_rate - 5:
            return "declining"
        else:
            return "stable"
    
    def _identify_attendance_patterns(
        self, 
        attendances: List[StudentAttendanceCompleteWithCalculations]
    ) -> Dict[str, Any]:
        """Identifie les patterns dans les présences."""
        
        patterns = {
            "consecutive_absences": 0,
            "monday_problem": False,
            "friday_problem": False,
            "morning_vs_afternoon": {},
        }
        
        # Analyser les absences consécutives
        current_streak = 0
        max_streak = 0
        
        for attendance in sorted(attendances, key=lambda x: x.session_date):
            if attendance.attendance_category in ["unexcused_absence", "excused_absence"]:
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 0
        
        patterns["consecutive_absences"] = max_streak
        
        # Analyser les problèmes de début/fin de semaine
        monday_absences = len([a for a in attendances if a.day_of_week == 1 and a.attendance_category in ["unexcused_absence"]])
        friday_absences = len([a for a in attendances if a.day_of_week == 5 and a.attendance_category in ["unexcused_absence"]])
        total_mondays = len([a for a in attendances if a.day_of_week == 1])
        total_fridays = len([a for a in attendances if a.day_of_week == 5])
        
        patterns["monday_problem"] = (monday_absences / total_mondays) > 0.2 if total_mondays > 0 else False
        patterns["friday_problem"] = (friday_absences / total_fridays) > 0.2 if total_fridays > 0 else False
        
        return patterns
    
    def _calculate_risk_level(self, statistics: StudentAttendanceStatistics) -> str:
        """Calcule le niveau de risque basé sur les statistiques."""
        
        if statistics.attendance_rate < 70:
            return "high"
        elif statistics.attendance_rate < 85 or statistics.punctuality_rate < 70:
            return "medium"
        else:
            return "low"
    
    def _group_attendances_by_student(
        self, 
        attendances: List[StudentAttendanceCompletePublic]
    ) -> Dict[str, List[StudentAttendanceCompletePublic]]:
        """Groupe les présences par étudiant."""
        
        groups = {}
        for attendance in attendances:
            student_id = str(attendance.student_id)
            if student_id not in groups:
                groups[student_id] = []
            groups[student_id].append(attendance)
        
        return groups
    
    def _group_attendances_by_course(
        self, 
        attendances: List[StudentAttendanceCompletePublic]
    ) -> Dict[str, Dict[str, Any]]:
        """Groupe les présences par cours."""
        
        groups = {}
        for attendance in attendances:
            course_id = str(attendance.course_id)
            if course_id not in groups:
                groups[course_id] = {
                    "course_info": {
                        "id": course_id,
                        "name": attendance.course_name,
                        "code": attendance.course_code,
                    },
                    "attendances": [],
                    "statistics": {},
                }
            groups[course_id]["attendances"].append(attendance)
        
        # Calculer les statistiques par cours
        for course_id, data in groups.items():
            course_attendances = data["attendances"]
            total = len(course_attendances)
            present = len([a for a in course_attendances if a.attendance_category in ["on_time", "late_arrival"]])
            
            data["statistics"] = {
                "total_sessions": total,
                "present_sessions": present,
                "attendance_rate": round((present / total * 100) if total > 0 else 0, 2),
                "total_students": len(set(a.student_id for a in course_attendances)),
            }
        
        return groups
    
    def _calculate_student_stats(
        self, 
        attendances: List[StudentAttendanceCompletePublic]
    ) -> Dict[str, Any]:
        """Calcule les statistiques pour un étudiant."""
        
        total = len(attendances)
        present = len([a for a in attendances if a.attendance_category in ["on_time", "late_arrival"]])
        absent = len([a for a in attendances if a.attendance_category in ["unexcused_absence", "excused_absence"]])
        late = len([a for a in attendances if a.attendance_category == "late"])
        
        delays = [a.minutes_late for a in attendances if a.minutes_late > 0]
        avg_delay = sum(delays) / len(delays) if delays else 0
        
        return {
            "total_sessions": total,
            "present_sessions": present,
            "absent_sessions": absent,
            "late_sessions": late,
            "attendance_rate": round((present / total * 100) if total > 0 else 0, 2),
            "punctuality_rate": round(((present - late) / total * 100) if total > 0 else 0, 2),
            "tardiness_rate": round((late / total * 100) if total > 0 else 0, 2),
            "average_delay": round(avg_delay, 2),
            "attendance_streak": 0,  # Simplifié pour cet exemple
        }
    
    def _get_student_info(
        self, 
        attendances: List[StudentAttendanceCompleteWithCalculations]
    ) -> Optional[Dict[str, Any]]:
        """Extrait les informations de l'étudiant."""
        
        if not attendances:
            return None
        
        first_record = attendances[0]
        return {
            "student_id": str(first_record.student_id),
            "student_name": first_record.student_name,
            "student_number": first_record.student_number,
            "student_email": first_record.student_email,
            "current_year_level": first_record.current_year_level,
        }
    
    def _get_course_info(
        self, 
        attendances: List[StudentAttendanceCompleteWithCalculations],
        course_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Extrait les informations du cours si spécifique."""
        
        if not attendances or not course_id:
            return None
        
        course_records = [a for a in attendances if a.course_id == course_id]
        if not course_records:
            return None
        
        first_record = course_records[0]
        return {
            "course_id": str(first_record.course_id),
            "course_name": first_record.course_name,
            "course_code": first_record.course_code,
            "credits": first_record.credits,
            "teacher_name": first_record.teacher_name,
        }
    
    def _analyze_course_trends(self, course_summary: CourseAttendanceSummary) -> Dict[str, Any]:
        """Analyse les tendances pour un cours."""
        
        sessions = course_summary.attendance_by_session
        if len(sessions) < 3:
            return {"trend": "insufficient_data"}
        
        # Calculer la tendance des taux de présence
        rates = [session["attendance_rate"] for session in sessions[-5:]]  # 5 dernières sessions
        
        if len(rates) >= 2:
            first_half_avg = sum(rates[:len(rates)//2]) / len(rates[:len(rates)//2])
            second_half_avg = sum(rates[len(rates)//2:]) / len(rates[len(rates)//2:])
            
            if second_half_avg > first_half_avg + 5:
                trend = "improving"
            elif second_half_avg < first_half_avg - 5:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "stable"
        
        return {
            "trend": trend,
            "recent_average": round(sum(rates) / len(rates), 2) if rates else 0,
            "best_session": max(sessions, key=lambda x: x["attendance_rate"]) if sessions else None,
            "worst_session": min(sessions, key=lambda x: x["attendance_rate"]) if sessions else None,
        }
    
    def _calculate_teacher_overall_stats(
        self, 
        attendances: List[StudentAttendanceCompletePublic]
    ) -> Dict[str, Any]:
        """Calcule les statistiques globales pour un enseignant."""
        
        total = len(attendances)
        present = len([a for a in attendances if a.attendance_category in ["on_time", "late_arrival"]])
        
        return {
            "total_sessions": total,
            "overall_attendance_rate": round((present / total * 100) if total > 0 else 0, 2),
            "total_courses": len(set(a.course_id for a in attendances)),
            "total_students": len(set(a.student_id for a in attendances)),
        }
    
    def _identify_attendance_alerts(
        self, 
        attendances: List[StudentAttendanceCompletePublic]
    ) -> Dict[str, List[Dict]]:
        """Identifie les alertes de présence."""
        
        # Grouper par étudiant
        student_groups = self._group_attendances_by_student(attendances)
        
        alerts = {
            "low_attendance": [],
            "chronic_lateness": [],
            "perfect_attendance": [],
        }
        
        for student_id, student_attendances in student_groups.items():
            stats = self._calculate_student_stats(student_attendances)
            
            if stats["attendance_rate"] < 80:
                alerts["low_attendance"].append({
                    "student_id": student_id,
                    "student_name": student_attendances[0].student_name,
                    "attendance_rate": stats["attendance_rate"],
                })
            
            if stats["tardiness_rate"] > 25:
                alerts["chronic_lateness"].append({
                    "student_id": student_id,
                    "student_name": student_attendances[0].student_name,
                    "tardiness_rate": stats["tardiness_rate"],
                })
            
            if stats["attendance_rate"] == 100:
                alerts["perfect_attendance"].append({
                    "student_id": student_id,
                    "student_name": student_attendances[0].student_name,
                    "total_sessions": stats["total_sessions"],
                })
        
        return alerts
    
    def _analyze_year_level_performance(
        self, 
        attendances: List[StudentAttendanceCompletePublic]
    ) -> Dict[str, Any]:
        """Analyse les performances par niveau d'année."""
        
        total = len(attendances)
        present = len([a for a in attendances if a.attendance_category in ["on_time", "late_arrival"]])
        
        # Distribution des statuts
        status_dist = {}
        for attendance in attendances:
            status = attendance.attendance_category
            status_dist[status] = status_dist.get(status, 0) + 1
        
        return {
            "overall_attendance_rate": round((present / total * 100) if total > 0 else 0, 2),
            "total_sessions": total,
            "unique_students": len(set(a.student_id for a in attendances)),
            "status_distribution": status_dist,
        }
    
    def _analyze_attendance_by_course(
        self, 
        attendances: List[StudentAttendanceCompletePublic]
    ) -> Dict[str, Dict[str, Any]]:
        """Analyse les présences par cours."""
        
        course_groups = self._group_attendances_by_course(attendances)
        
        # Trier par taux de présence
        sorted_courses = sorted(
            course_groups.items(), 
            key=lambda x: x[1]["statistics"]["attendance_rate"], 
            reverse=True
        )
        
        return {
            "best_performing": sorted_courses[:3] if len(sorted_courses) >= 3 else sorted_courses,
            "needs_attention": sorted_courses[-3:] if len(sorted_courses) >= 3 else [],
            "course_statistics": {course_id: data["statistics"] for course_id, data in course_groups.items()},
        }
    
    def _analyze_temporal_trends(
        self, 
        attendances: List[StudentAttendanceCompletePublic]
    ) -> Dict[str, Any]:
        """Analyse les tendances temporelles."""
        
        # Analyse par jour de la semaine
        day_stats = {}
        for i in range(1, 8):  # Lundi (1) à Dimanche (7)
            day_attendances = [a for a in attendances if a.day_of_week == i]
            if day_attendances:
                present = len([a for a in day_attendances if a.attendance_category in ["on_time", "late_arrival"]])
                day_stats[i] = {
                    "total": len(day_attendances),
                    "present": present,
                    "attendance_rate": round((present / len(day_attendances) * 100), 2),
                }
        
        # Identifier le meilleur et pire jour
        best_day = max(day_stats.items(), key=lambda x: x[1]["attendance_rate"]) if day_stats else None
        worst_day = min(day_stats.items(), key=lambda x: x[1]["attendance_rate"]) if day_stats else None
        
        return {
            "daily_statistics": day_stats,
            "best_day": {"day": best_day[0], "rate": best_day[1]["attendance_rate"]} if best_day else None,
            "worst_day": {"day": worst_day[0], "rate": worst_day[1]["attendance_rate"]} if worst_day else None,
        }