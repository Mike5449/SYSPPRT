import uuid
from typing import List, Optional
from sqlalchemy import text, func
from sqlmodel import Session, select
from app.models.student import Student
from app.models.course_session import CourseSession
from app.models.course_program_level import CourseProgramLevel
from app.models.session import Session as AcademicSession
from app.models.attendance_record import AttendanceRecord
from app.models.attendance_session import AttendanceSession
from app.models.grade import Grade
from app.models.assessment import Assessment
from app.models.student_analytics import StudentDashboardMetrics, SessionCount, StudentCourseProgress

class StudentAnalyticsRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_dashboard_metrics(
        self, 
        student_id: uuid.UUID, 
        year_level: Optional[int] = None
    ) -> StudentDashboardMetrics:
        # 1. Fetch student info
        student = self.session.get(Student, student_id)
        if not student:
            raise ValueError("Student not found")
        
        program_level_id = student.program_level_id
        current_year = year_level or student.current_year_level
        
        # Parameters for SQL
        params = {
            "program_level_id": str(program_level_id),
            "student_id": str(student_id),
            "year_level": current_year
        }
        
        # Build dynamic WHERE clause if needed (placeholder for future use)
        session_filter = ""

        # Unified Query for all metrics
        # total_courses comes from the curriculum (course_program_level)
        # session data comes from course_session
        query = text(f"""
            WITH curriculum_stats AS (
                SELECT count(DISTINCT course_id) as total
                FROM course_program_level
                WHERE program_level_id = :program_level_id AND year_level = :year_level
            ),
            relevant_course_sessions AS (
                SELECT cs.id, sess.session_number
                FROM course_session cs
                JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
                JOIN session sess ON cs.session_id = sess.id
                WHERE cpl.program_level_id = :program_level_id
                AND cs.is_active = true
                AND (cs.year_level = :year_level OR :year_level IS NULL)
                {session_filter}
            ),
            session_breakdown AS (
                SELECT session_number, count(id) as count
                FROM relevant_course_sessions
                GROUP BY session_number
            ),
            course_metrics AS (
                SELECT 
                    (SELECT total FROM curriculum_stats) as total_courses,
                    COALESCE(json_agg(json_build_object('session_number', session_number, 'count', count)), '[]'::json) as session_data
                FROM session_breakdown
            ),
            attendance_metrics AS (
                SELECT 
                    count(DISTINCT ats.id) as total_attendance_sessions,
                    count(ar.id) as total_attendance_records,
                    count(CASE WHEN lower(ar.status::text) = 'present' 
                               AND (ar.created_at::time <= ats.start_time + interval '10 minutes') THEN 1 END) as present_count,
                    count(CASE WHEN (lower(ar.status::text) = 'late') 
                               OR (lower(ar.status::text) = 'present' AND ar.created_at::time > ats.start_time + interval '10 minutes') THEN 1 END) as late_count,
                    count(CASE WHEN lower(ar.status::text) = 'excused' THEN 1 END) as excused_count
                FROM relevant_course_sessions rcs
                JOIN schedule sch ON rcs.id = sch.course_session_id
                JOIN attendance_session ats ON ats.schedule_id = sch.id
                LEFT JOIN attendance_record ar ON ar.attendance_session_id = ats.id AND ar.student_id = :student_id
            ),
            assessment_metrics AS (
                SELECT 
                    count(DISTINCT a.id) as total_assessments,
                    count(CASE WHEN trim(lower(a.assessment_type)) IN ('exam', 'test', 'midterm', 'final') THEN 1 END) as exam_count,
                    count(CASE WHEN a.assessment_type IS NULL OR trim(lower(a.assessment_type)) NOT IN ('exam', 'test', 'midterm', 'final') THEN 1 END) as participation_count,
                    avg(g.score) as average_score
                FROM relevant_course_sessions rcs
                JOIN assessment a ON rcs.id = a.course_session_id
                LEFT JOIN grade g ON g.assessment_id = a.id AND g.student_id = :student_id
            ),
            course_progress_metrics AS (
                SELECT 
                    c.id as course_id,
                    c.name as course_name,
                    c.code as course_code,
                    COALESCE(SUM(g.score), 0) as score_sum,
                    COALESCE(SUM(a.max_score), 0) as max_score_sum,
                    COALESCE(SUM(CASE WHEN trim(lower(a.assessment_type)) IN ('exam', 'test', 'midterm', 'final') THEN g.score ELSE 0 END), 0) as exam_score_sum,
                    COALESCE(SUM(CASE WHEN trim(lower(a.assessment_type)) IN ('exam', 'test', 'midterm', 'final') THEN a.max_score ELSE 0 END), 0) as exam_max_score_sum,
                    COALESCE(SUM(CASE WHEN a.assessment_type IS NOT NULL AND trim(lower(a.assessment_type)) NOT IN ('exam', 'test', 'midterm', 'final') THEN g.score ELSE 0 END), 0) as participation_score_sum,
                    COALESCE(SUM(CASE WHEN a.assessment_type IS NOT NULL AND trim(lower(a.assessment_type)) NOT IN ('exam', 'test', 'midterm', 'final') THEN a.max_score ELSE 0 END), 0) as participation_max_score_sum,
                    CASE 
                        WHEN SUM(a.max_score) > 0 THEN (SUM(g.score) / SUM(a.max_score)) * 100 
                        ELSE 0 
                    END as progress_percentage,
                    COALESCE(u.first_name || ' ' || u.last_name, u.email) as teacher_name,
                    u.email as teacher_email
                FROM relevant_course_sessions rcs
                JOIN course_session cs ON rcs.id = cs.id
                JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
                JOIN course c ON cpl.course_id = c.id
                LEFT JOIN teacher t ON cs.teacher_id = t.id
                LEFT JOIN "user" u ON t.user_id = u.id
                LEFT JOIN assessment a ON cs.id = a.course_session_id
                LEFT JOIN grade g ON a.id = g.assessment_id AND g.student_id = :student_id
                GROUP BY c.id, c.name, c.code, u.first_name, u.last_name, u.email
            )
            SELECT 
                COALESCE(cm.total_courses, (SELECT total FROM curriculum_stats)) as total_courses,
                COALESCE(cm.session_data, '[]'::json) as session_data,
                COALESCE(am.total_attendance_sessions, 0) as total_attendance_sessions,
                COALESCE(am.total_attendance_records, 0) as total_attendance_records,
                COALESCE(am.present_count, 0) as present_count,
                COALESCE(am.late_count, 0) as late_count,
                COALESCE(am.excused_count, 0) as excused_count,
                COALESCE(asm.total_assessments, 0) as total_assessments,
                COALESCE(asm.exam_count, 0) as exam_count,
                COALESCE(asm.participation_count, 0) as participation_count,
                COALESCE(asm.average_score, 0) as average_score,
                COALESCE((SELECT json_agg(t) FROM course_progress_metrics t), '[]'::json) as course_progress
            FROM (SELECT 1) dummy
            LEFT JOIN course_metrics cm ON true
            LEFT JOIN attendance_metrics am ON true
            LEFT JOIN assessment_metrics asm ON true
        """)
        
        result = self.session.execute(query, params=params).first()
        
        # Parse session data
        courses_per_session = []
        if result and result.session_data:
            data = result.session_data
            if isinstance(data, str):
                import json
                data = json.loads(data)
            courses_per_session = [SessionCount(**d) for d in data if d.get('session_number') is not None]

        # Parse course progress data
        course_progress = []
        if result and result.course_progress:
            cp_data = result.course_progress
            if isinstance(cp_data, str):
                import json
                cp_data = json.loads(cp_data)
            course_progress = [StudentCourseProgress(**d) for d in cp_data]

        total_sessions = result.total_attendance_sessions if result else 0
        present_count = result.present_count if result else 0
        late_count = result.late_count if result else 0
        excused_count = result.excused_count if result else 0
        
        # Absent = Total Sessions - (Present + Late + Excused)
        # This handles both explicit 'absent' records and missing records
        calculated_absent_count = max(0, total_sessions - (present_count + late_count + excused_count))
        
        attendance_rate = (present_count / total_sessions * 100) if total_sessions > 0 else 0.0
        
        return StudentDashboardMetrics(
            total_courses=result.total_courses if result else 0,
            courses_per_session=courses_per_session,
            course_progress=course_progress,
            total_attendance_sessions=total_sessions,
            total_attendance_records=total_sessions, # Now reflecting the "logical" total
            present_count=present_count,
            absent_count=calculated_absent_count,
            late_count=late_count,
            excused_count=excused_count,
            attendance_rate=round(float(attendance_rate), 2),
            total_assessments=result.total_assessments if result else 0,
            exam_count=result.exam_count if result else 0,
            participation_count=result.participation_count if result else 0,
            average_score=round(float(result.average_score if result else 0), 2),
            student_id=student_id,
            year_level=current_year
        )
