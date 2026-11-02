import uuid
from typing import List, Optional
from sqlalchemy import text
from sqlmodel import Session
from app.models.teacher_analytics import TeacherDashboardMetrics, TeacherCourseMetrics

class TeacherAnalyticsRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_assigned_program_levels(
        self,
        teacher_id: uuid.UUID,
        academic_year_id: Optional[uuid.UUID] = None
    ) -> List[dict]:
        params = {
            "teacher_id": str(teacher_id),
            "academic_year_id": str(academic_year_id) if academic_year_id else None
        }
        
        # Build dynamic filters to avoid AmbiguousParameter error with :academic_year_id IS NULL
        filters = ["cs.teacher_id = :teacher_id", "cs.is_active = true"]
        if academic_year_id:
            filters.append("sess.academic_year_id = :academic_year_id")
            
        where_clause = " AND ".join(filters)
        
        query = text(f"""
            SELECT DISTINCT pl.id, pl.name, pl.code
            FROM program_level pl
            JOIN course_program_level cpl ON pl.id = cpl.program_level_id
            JOIN course_session cs ON cpl.id = cs.course_program_level_id
            JOIN session sess ON cs.session_id = sess.id
            WHERE {where_clause}
            ORDER BY pl.name
        """)
        
        result = self.session.execute(query, params=params).all()
        return [{"id": r.id, "name": r.name, "code": r.code} for r in result]

    def get_assigned_teachers(
        self,
        program_level_id: Optional[uuid.UUID] = None,
        academic_year_id: Optional[uuid.UUID] = None
    ) -> List[dict]:
        params = {
            "program_level_id": str(program_level_id) if program_level_id else None,
            "academic_year_id": str(academic_year_id) if academic_year_id else None
        }
        
        filters = ["cs.is_active = true"]
        if program_level_id:
            filters.append("cpl.program_level_id = :program_level_id")
        if academic_year_id:
            filters.append("sess.academic_year_id = :academic_year_id")
            
        where_clause = " AND ".join(filters)
        
        query = text(f"""
            SELECT DISTINCT t.id, u.first_name, u.last_name, u.email
            FROM teacher t
            JOIN "user" u ON t.user_id = u.id
            JOIN course_session cs ON t.id = cs.teacher_id
            JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
            JOIN session sess ON cs.session_id = sess.id
            WHERE {where_clause}
            ORDER BY u.last_name, u.first_name
        """)
        
        result = self.session.execute(query, params=params).all()
        return [
            {
                "id": r.id, 
                "full_name": f"{r.first_name} {r.last_name}".strip() if r.first_name or r.last_name else r.email, 
                "email": r.email
            } 
            for r in result
        ]

    def get_dashboard_metrics(
        self,
        teacher_id: uuid.UUID,
        academic_year_id: Optional[uuid.UUID] = None,
        program_level_id: Optional[uuid.UUID] = None,
        year_level: Optional[int] = None
    ) -> TeacherDashboardMetrics:
        
        params = {
            "teacher_id": str(teacher_id),
            "academic_year_id": str(academic_year_id) if academic_year_id else None,
            "program_level_id": str(program_level_id) if program_level_id else None,
            "year_level": year_level
        }

        # Build dynamic filters
        filters = ["cs.teacher_id = :teacher_id"]
        if academic_year_id:
            filters.append("sess.academic_year_id = :academic_year_id")
        if program_level_id:
            filters.append("cpl.program_level_id = :program_level_id")
        if year_level:
            filters.append("cs.year_level = :year_level")
        
        where_clause = " AND ".join(filters)

        query = text(f"""
            WITH relevant_sessions AS (
                SELECT cs.id, cs.year_level, c.name as course_name, c.code as course_code, c.id as course_id, cpl.program_level_id
                FROM course_session cs
                JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
                JOIN course c ON cpl.course_id = c.id
                JOIN session sess ON cs.session_id = sess.id
                WHERE {where_clause}
                AND cs.is_active = true
            ),
            session_student_counts AS (
                SELECT rs.id as session_id, count(DISTINCT s.id) as student_count
                FROM relevant_sessions rs
                JOIN student s ON rs.program_level_id = s.program_level_id
                GROUP BY rs.id
            ),
            attendance_stats AS (
                SELECT 
                    count(DISTINCT ats.id) as total_attendance_sessions,
                    count(CASE WHEN lower(ar.status::text) = 'present' 
                               AND (ar.created_at::time <= ats.start_time + interval '10 minutes') THEN 1 END) as present_count,
                    count(CASE WHEN (lower(ar.status::text) = 'late') 
                               OR (lower(ar.status::text) = 'present' AND ar.created_at::time > ats.start_time + interval '10 minutes') THEN 1 END) as late_count,
                    count(CASE WHEN lower(ar.status::text) = 'excused' THEN 1 END) as excused_count,
                    count(CASE WHEN lower(ar.status::text) = 'absent' THEN 1 END) as explicit_absent_count
                FROM relevant_sessions rs
                JOIN schedule sch ON rs.id = sch.course_session_id
                JOIN attendance_session ats ON ats.schedule_id = sch.id
                LEFT JOIN attendance_record ar ON ar.attendance_session_id = ats.id
            ),
            course_performance AS (
                SELECT 
                    rs.course_id,
                    rs.course_name,
                    rs.course_code,
                    rs.year_level,
                    COALESCE(ssc.student_count, 0) as student_count,
                    COALESCE(AVG(CASE WHEN a.max_score > 0 THEN (g.score / a.max_score) * 100 END), 0) as average_progress,
                    COALESCE(AVG(CASE WHEN trim(lower(a.assessment_type)) IN ('exam', 'test', 'midterm', 'final') THEN g.score END), 0) as exam_average,
                    COALESCE(AVG(CASE WHEN a.assessment_type IS NOT NULL AND trim(lower(a.assessment_type)) NOT IN ('exam', 'test', 'midterm', 'final') THEN g.score END), 0) as participation_average
                FROM relevant_sessions rs
                LEFT JOIN session_student_counts ssc ON rs.id = ssc.session_id
                LEFT JOIN assessment a ON rs.id = a.course_session_id
                LEFT JOIN grade g ON a.id = g.assessment_id
                GROUP BY rs.course_id, rs.course_name, rs.course_code, rs.year_level, ssc.student_count
            ),
            course_attendance AS (
                SELECT 
                    rs.course_id,
                    CASE 
                        WHEN count(DISTINCT s.id) * count(DISTINCT ats.id) > 0 
                        THEN (count(CASE WHEN lower(ar.status::text) = 'present' THEN 1 END)::float / (count(DISTINCT s.id) * count(DISTINCT ats.id))) * 100
                        ELSE 0 
                    END as attendance_rate
                FROM relevant_sessions rs
                JOIN student s ON rs.program_level_id = s.program_level_id
                LEFT JOIN schedule sch ON rs.id = sch.course_session_id
                LEFT JOIN attendance_session ats ON ats.schedule_id = sch.id
                LEFT JOIN attendance_record ar ON ar.attendance_session_id = ats.id AND ar.student_id = s.id
                GROUP BY rs.course_id
            )
            SELECT 
                (SELECT count(*) FROM relevant_sessions) as total_courses,
                COALESCE((SELECT count(DISTINCT s.id) FROM relevant_sessions rs JOIN student s ON rs.program_level_id = s.program_level_id), 0) as total_students,
                COALESCE(att.total_attendance_sessions, 0) as total_attendance_sessions,
                COALESCE(att.present_count, 0) as present_count,
                COALESCE(att.late_count, 0) as late_count,
                COALESCE(att.excused_count, 0) as excused_count,
                COALESCE(att.explicit_absent_count, 0) as explicit_absent_count,
                COALESCE((SELECT json_agg(json_build_object(
                    'course_id', cp.course_id,
                    'course_name', cp.course_name,
                    'course_code', cp.course_code,
                    'student_count', cp.student_count,
                    'average_progress', cp.average_progress,
                    'exam_average', cp.exam_average,
                    'participation_average', cp.participation_average,
                    'year_level', cp.year_level,
                    'attendance_rate', COALESCE(ca.attendance_rate, 0)
                )) FROM course_performance cp LEFT JOIN course_attendance ca ON cp.course_id = ca.course_id), '[]'::json) as course_metrics
            FROM (SELECT 1) dummy
            LEFT JOIN attendance_stats att ON true
        """)

        result = self.session.execute(query, params=params).first()

        course_metrics = []
        if result and result.course_metrics:
            cm_data = result.course_metrics
            if isinstance(cm_data, str):
                import json
                cm_data = json.loads(cm_data)
            course_metrics = [TeacherCourseMetrics(**d) for d in cm_data]

        total_sessions = result.total_attendance_sessions if result else 0
        total_students = result.total_students if result else 0
        # Logical aggregate attendance sessions = total sessions * students
        logical_total = total_sessions * total_students
        
        present_count = result.present_count if result else 0
        late_count = result.late_count if result else 0
        excused_count = result.excused_count if result else 0
        
        # Absent = Logical Total - (Present + Late + Excused)
        calculated_absent_count = max(0, logical_total - (present_count + late_count + excused_count))
        
        attendance_rate = (present_count / logical_total * 100) if logical_total > 0 else 0.0
        avg_progress = sum(m.average_progress for m in course_metrics) / len(course_metrics) if course_metrics else 0.0

        return TeacherDashboardMetrics(
            total_courses=result.total_courses if result else 0,
            total_students=total_students,
            total_attendance_sessions=total_sessions,
            present_count=present_count,
            absent_count=calculated_absent_count,
            late_count=late_count,
            attendance_rate=round(float(attendance_rate), 2),
            average_student_progress=round(float(avg_progress), 2),
            course_metrics=course_metrics,
            teacher_id=teacher_id,
            academic_year_id=academic_year_id,
            program_level_id=program_level_id,
            year_level=year_level
        )
