"""
Service pour générer les bulletins académiques.
"""
import uuid
from datetime import date
from typing import Optional

from sqlmodel import Session, select, func

from app.models.grade import Grade, ExamType
from app.models.assessment import Assessment
from app.models.course_session import CourseSession
from app.models.course_program_level import CourseProgramLevel
from app.models.course import Course
from app.models.session import Session as AcademicSession
from app.models.student import Student
from app.models.user import User
from app.models.teacher import Teacher
from app.models.transcript import (
    GradeDetail,
    CourseGrade,
    SessionTranscript,
    YearTranscript,
)


class TranscriptService:
    """Service pour générer les bulletins."""
    
    def __init__(self, session: Session):
        self.session = session
    
    def generate_year_transcript(
        self,
        student_number: str,
        year_level: int,
        session_number: Optional[int] = None,
    ) -> YearTranscript:
        """
        Génère le bulletin complet pour une année donnée.
        
        Args:
            student_number: Numéro d'étudiant
            year_level: Niveau d'année (1, 2, 3, etc.)
            session_number: Filtre optionnel par session (1 ou 2)
        
        Returns:
            YearTranscript avec toutes les notes, moyennes et statistiques
        """
        # 1. Récupérer l'étudiant
        student_query = (
            select(Student, User)
            .join(User, Student.user_id == User.id)
            .where(User.user_number == student_number)
        )
        result = self.session.exec(student_query).first()
        
        if not result:
            raise ValueError(f"Student {student_number} not found")
        
        student, user = result
        student_name = f"{user.first_name} {user.last_name}"
        
        # 2. Récupérer toutes les sessions académiques filtrées
        sessions_query = select(AcademicSession).where(AcademicSession.is_active == True)
        if session_number:
            sessions_query = sessions_query.where(AcademicSession.session_number == session_number)
        sessions_query = sessions_query.order_by(AcademicSession.session_number)
        
        academic_sessions = list(self.session.exec(sessions_query).all())
        
        # 3. Générer le transcript pour chaque session
        session_transcripts = []
        total_credits_year = 0
        earned_credits_year = 0
        weighted_sum_year = 0
        
        for academic_session in academic_sessions:
            session_transcript = self._generate_session_transcript(
                student.id,
                year_level,
                academic_session,
            )
            
            if session_transcript.courses:  # Only add if there are courses
                session_transcripts.append(session_transcript)
                total_credits_year += session_transcript.total_credits
                earned_credits_year += session_transcript.earned_credits
                
                if session_transcript.session_average:
                    weighted_sum_year += session_transcript.session_average * session_transcript.total_credits
        
        # 4. Calculer la moyenne annuelle
        year_average = weighted_sum_year / total_credits_year if total_credits_year > 0 else None
        is_passing_year = earned_credits_year >= (total_credits_year * 0.5) if total_credits_year > 0 else False
        
        # 5. Récupérer le programme (optionnel - pas critique)
        program_name = None
        
        return YearTranscript(
            student_id=student.id,
            student_number=student_number,
            student_name=student_name,
            year_level=year_level,
            program_name=program_name,
            sessions=session_transcripts,
            total_credits=total_credits_year,
            earned_credits=earned_credits_year,
            year_average=year_average,
            year_gpa=self._calculate_gpa(year_average) if year_average else None,
            is_passing_year=is_passing_year,
            generated_at=date.today(),
        )
    
    def _generate_session_transcript(
        self,
        student_id: uuid.UUID,
        year_level: int,
        academic_session: AcademicSession,
    ) -> SessionTranscript:
        """Génère le transcript pour une session spécifique."""
        
        # Récupérer tous les course_sessions pour cette session et année
        course_sessions_query = (
            select(CourseSession, CourseProgramLevel, Course, Teacher, User)
            .join(CourseProgramLevel, CourseSession.course_program_level_id == CourseProgramLevel.id)
            .join(Course, CourseProgramLevel.course_id == Course.id)
            .join(Teacher, CourseSession.teacher_id == Teacher.id)
            .join(User, Teacher.user_id == User.id)
            .where(
                CourseSession.session_id == academic_session.id,
                CourseSession.year_level == year_level,
                CourseSession.is_active == True
            )
        )
        
        course_sessions_data = list(self.session.exec(course_sessions_query).all())
        
        # Générer les notes pour chaque cours
        course_grades = []
        total_credits = 0
        earned_credits = 0
        weighted_sum = 0
        
        for cs, cpl, course, teacher, teacher_user in course_sessions_data:
            # Récupérer toutes les notes pour ce cours
            grades_query = (
                select(Grade, Assessment)
                .join(Assessment, Grade.assessment_id == Assessment.id)
                .where(
                    Grade.student_id == student_id,
                    Assessment.course_session_id == cs.id,
                    Grade.is_published == True  # IMPORTANT: Seulement les notes publiées
                )
            )
            grades_data = list(self.session.exec(grades_query).all())
            
            # Debug logging
            print(f"📚 Course: {course.name} (session_id: {cs.id})")
            print(f"   Found {len(grades_data)} grades")
            for grade, assessment in grades_data:
                print(f"   - {assessment.name} (type: {assessment.assessment_type}, exam_type: {grade.exam_type}): {grade.score}")
            
            if not grades_data:
                continue  # Skip courses with no grades
            
            # Organiser les notes par exam_type (intra ou final)
            intra_exam = None
            final_exam = None
            intra_participations = []
            final_participations = []
            
            for grade, assessment in grades_data:
                grade_detail = GradeDetail(
                    exam_type=grade.exam_type,
                    score=grade.score,
                    max_score=assessment.max_score,
                    assessment_name=assessment.name,
                    graded_date=grade.graded_date,
                )
                
                print(f"   🔍 Processing: {assessment.name}")
                print(f"      assessment_type: '{assessment.assessment_type}'")
                print(f"      exam_type: '{grade.exam_type}'")
                
                # Classifier selon le TYPE d'assessment ET exam_type
                # EXAM type: examen principal (intra ou final)
                # Autres types (ASSIGNMENT, PRACTICAL, etc.): participations
                if assessment.assessment_type and assessment.assessment_type.upper() == "EXAM":
                    # C'est un examen principal
                    if grade.exam_type == ExamType.INTRA:
                        intra_exam = grade_detail
                        print(f"      ✅ Classified as INTRA EXAM")
                    elif grade.exam_type == ExamType.FINAL:
                        final_exam = grade_detail
                        print(f"      ✅ Classified as FINAL EXAM")
                    elif grade.exam_type == ExamType.REGULAR:
                        # REGULAR: traiter comme INTRA par défaut
                        intra_exam = grade_detail
                        print(f"      ✅ Classified as INTRA EXAM (was REGULAR)")
                    else:
                        print(f"      ⚠️ EXAM but unknown exam_type: {grade.exam_type}")
                else:
                    # C'est une participation (ASSIGNMENT, PRACTICAL, etc.)
                    if grade.exam_type == ExamType.INTRA:
                        intra_participations.append(grade_detail)
                        print(f"      ✅ Classified as INTRA PARTICIPATION")
                    elif grade.exam_type == ExamType.FINAL:
                        final_participations.append(grade_detail)
                        print(f"      ✅ Classified as FINAL PARTICIPATION")
                    elif grade.exam_type == ExamType.REGULAR:
                        # REGULAR: traiter comme participation INTRA par défaut
                        intra_participations.append(grade_detail)
                        print(f"      ✅ Classified as INTRA PARTICIPATION (was REGULAR)")
                    else:
                        print(f"      ⚠️ PARTICIPATION but unknown exam_type: {grade.exam_type}")
            
            print(f"   📊 Summary: intra_exam={intra_exam is not None}, final_exam={final_exam is not None}")
            print(f"              intra_participations={len(intra_participations)}, final_participations={len(final_participations)}")
            
            # Calculer les scores composites (examen + participations)
            intra_composite_score = None
            intra_composite_max = None
            if intra_exam or intra_participations:
                total_score = 0
                total_max = 0
                if intra_exam:
                    total_score += intra_exam.score
                    total_max += intra_exam.max_score
                for part in intra_participations:
                    total_score += part.score
                    total_max += part.max_score
                intra_composite_score = total_score
                intra_composite_max = total_max
            
            final_composite_score = None
            final_composite_max = None
            if final_exam or final_participations:
                total_score = 0
                total_max = 0
                if final_exam:
                    total_score += final_exam.score
                    total_max += final_exam.max_score
                for part in final_participations:
                    total_score += part.score
                    total_max += part.max_score
                final_composite_score = total_score
                final_composite_max = total_max
            
            # Créer les GradeDetail composites
            intra_grade = None
            if intra_composite_score is not None:
                parts = []
                if intra_exam:
                    parts.append("Examen")
                if intra_participations:
                    parts.append(f"{len(intra_participations)} participation(s)")
                intra_grade = GradeDetail(
                    exam_type="intra",
                    score=intra_composite_score,
                    max_score=intra_composite_max,
                    assessment_name=" + ".join(parts),
                    graded_date=intra_exam.graded_date if intra_exam else None,
                )
            
            final_grade = None
            if final_composite_score is not None:
                parts = []
                if final_exam:
                    parts.append("Examen")
                if final_participations:
                    parts.append(f"{len(final_participations)} participation(s)")
                final_grade = GradeDetail(
                    exam_type="final",
                    score=final_composite_score,
                    max_score=final_composite_max,
                    assessment_name=" + ".join(parts),
                    graded_date=final_exam.graded_date if final_exam else None,
                )
            
            # Calculer la note pondérée finale
            weighted_score = self._calculate_weighted_score_simple(
                intra_grade,
                final_grade,
                cs.intra_percentage,
                cs.final_percentage,
            )
            
            # Déterminer si le cours est réussi (>= 50%)
            is_passing = weighted_score >= 50 if weighted_score is not None else False
            
            course_grade = CourseGrade(
                course_id=course.id,
                course_code=course.code,
                course_name=course.name,
                course_credits=course.credits,
                intra_grade=intra_grade,
                final_grade=final_grade,
                participation_grades=[],  # Vide car intégré dans intra/final
                intra_percentage=cs.intra_percentage,
                final_percentage=cs.final_percentage,
                participation_percentage=None,  # Plus utilisé
                participation_average=None,  # Plus utilisé
                weighted_score=weighted_score,
                letter_grade=self._score_to_letter(weighted_score) if weighted_score else None,
                is_passing=is_passing,
                teacher_name=f"{teacher_user.first_name} {teacher_user.last_name}",
                classroom=cs.classroom,
            )
            
            course_grades.append(course_grade)
            total_credits += course.credits
            
            if is_passing:
                earned_credits += course.credits
            
            if weighted_score:
                weighted_sum += weighted_score * course.credits
        
        # Calculer la moyenne de session
        session_average = weighted_sum / total_credits if total_credits > 0 else None
        
        return SessionTranscript(
            session_id=academic_session.id,
            session_name=academic_session.name,
            session_number=academic_session.session_number,
            session_start_date=academic_session.start_date,
            session_end_date=academic_session.end_date,
            courses=course_grades,
            total_credits=total_credits,
            earned_credits=earned_credits,
            session_average=session_average,
            session_gpa=self._calculate_gpa(session_average) if session_average else None,
        )
    
    def _calculate_weighted_score(
        self,
        intra_grade: Optional[GradeDetail],
        final_grade: Optional[GradeDetail],
        participation_avg: Optional[float],
        intra_pct: Optional[float],
        final_pct: Optional[float],
        participation_pct: Optional[float],
    ) -> Optional[float]:
        """
        Calcule la note pondérée finale basée sur les pourcentages configurés.
        
        Si les pourcentages ne sont pas configurés, utilise une moyenne simple.
        """
        scores = []
        weights = []
        
        # Intra
        if intra_grade and intra_pct:
            normalized_score = (intra_grade.score / intra_grade.max_score) * 100
            scores.append(normalized_score * (intra_pct / 100))
            weights.append(intra_pct)
        
        # Final
        if final_grade and final_pct:
            normalized_score = (final_grade.score / final_grade.max_score) * 100
            scores.append(normalized_score * (final_pct / 100))
            weights.append(final_pct)
        
        # Participation
        if participation_avg and participation_pct:
            scores.append(participation_avg * (participation_pct / 100))
            weights.append(participation_pct)
        
        if not scores:
            return None
        
        # Si des pourcentages sont configurés, retourner la somme pondérée
        if weights:
            return sum(scores)
        
        # Sinon, moyenne simple
        all_scores = []
        if intra_grade:
            all_scores.append((intra_grade.score / intra_grade.max_score) * 100)
        if final_grade:
            all_scores.append((final_grade.score / final_grade.max_score) * 100)
        if participation_avg:
            all_scores.append(participation_avg)
        
        return sum(all_scores) / len(all_scores) if all_scores else None
    
    def _calculate_weighted_score_simple(
        self,
        intra_grade: Optional[GradeDetail],
        final_grade: Optional[GradeDetail],
        intra_pct: Optional[float],
        final_pct: Optional[float],
    ) -> Optional[float]:
        """
        Calcule la note pondérée finale basée sur intra et final (participations déjà incluses).
        
        Si les pourcentages ne sont pas configurés, utilise une moyenne simple 50/50.
        """
        scores = []
        weights = []
        
        # Intra (avec participations déjà incluses)
        if intra_grade:
            normalized_score = (intra_grade.score / intra_grade.max_score) * 100
            if intra_pct:
                scores.append(normalized_score * (intra_pct / 100))
                weights.append(intra_pct)
            else:
                scores.append(normalized_score * 0.5)  # 50% par défaut
                weights.append(50)
        
        # Final (avec participations déjà incluses)
        if final_grade:
            normalized_score = (final_grade.score / final_grade.max_score) * 100
            if final_pct:
                scores.append(normalized_score * (final_pct / 100))
                weights.append(final_pct)
            else:
                scores.append(normalized_score * 0.5)  # 50% par défaut
                weights.append(50)
        
        if not scores:
            return None
        
        return sum(scores)
    
    def _score_to_letter(self, score: float) -> str:
        """Convertit un score en lettre."""
        if score >= 90:
            return "A+"
        elif score >= 85:
            return "A"
        elif score >= 80:
            return "A-"
        elif score >= 77:
            return "B+"
        elif score >= 73:
            return "B"
        elif score >= 70:
            return "B-"
        elif score >= 67:
            return "C+"
        elif score >= 63:
            return "C"
        elif score >= 60:
            return "C-"
        elif score >= 57:
            return "D+"
        elif score >= 53:
            return "D"
        elif score >= 50:
            return "D-"
        else:
            return "F"
    
    def _calculate_gpa(self, average: float) -> float:
        """Convertit une moyenne en GPA (0-4.0)."""
        if average >= 90:
            return 4.0
        elif average >= 85:
            return 3.7
        elif average >= 80:
            return 3.3
        elif average >= 77:
            return 3.0
        elif average >= 73:
            return 2.7
        elif average >= 70:
            return 2.3
        elif average >= 67:
            return 2.0
        elif average >= 63:
            return 1.7
        elif average >= 60:
            return 1.3
        elif average >= 50:
            return 1.0
        else:
            return 0.0
