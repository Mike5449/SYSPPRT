import uuid
from typing import Optional
from sqlalchemy import text
from sqlmodel import Session
from app.models.student import Student
from app.models.student_analytics import StudentDashboardMetrics, SessionCount, StudentCourseProgress


class StudentAnalyticsRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_dashboard_metrics(
        self,
        student_id: uuid.UUID,
        year_level: Optional[int] = None,
        academic_year_id: Optional[uuid.UUID] = None  # kept for API compat, not used in query
    ) -> StudentDashboardMetrics:
        student = self.session.get(Student, student_id)
        if not student:
            raise ValueError("Student not found")

        program_level_id = student.program_level_id
        current_year = year_level or student.current_year_level

        params = {
            "program_level_id": str(program_level_id),
            "student_id": str(student_id),
            # attendance_record.student_id is a FK to user.id, not student.id —
            # attendance joins must use the user id, unlike grades/assessments.
            "user_id": str(student.user_id),
            "year_level": current_year,
        }

        query = text("""
            WITH relevant_course_sessions AS (
                SELECT DISTINCT cs.id,
                                COALESCE(sess.session_number, 1) AS session_number
                FROM course_program_level cpl
                JOIN course_session cs ON cs.course_program_level_id = cpl.id
                LEFT JOIN session sess ON cs.session_id = sess.id
                WHERE cpl.program_level_id = :program_level_id
                  AND (
                      :year_level IS NULL
                      OR cs.year_level  = :year_level
                      OR cpl.year_level = :year_level
                  )
            ),
            curriculum_stats AS (
                SELECT COUNT(DISTINCT cpl.course_id) AS total
                FROM course_program_level cpl
                WHERE cpl.program_level_id = :program_level_id
                  AND (:year_level IS NULL OR cpl.year_level = :year_level)
            ),
            session_breakdown AS (
                SELECT session_number, COUNT(id) AS cnt
                FROM relevant_course_sessions
                GROUP BY session_number
            ),
            course_metrics AS (
                SELECT
                    (SELECT total FROM curriculum_stats) AS total_courses,
                    COALESCE(
                        json_agg(json_build_object(
                            'session_number', session_number,
                            'count', cnt
                        )),
                        '[]'::json
                    ) AS session_data
                FROM session_breakdown
            ),
            attendance_metrics AS (
                SELECT
                    COUNT(DISTINCT ats.id) AS total_attendance_sessions,
                    COUNT(ar.id)           AS total_attendance_records,
                    COUNT(CASE WHEN lower(ar.status::text) = 'present'
                                AND ar.created_at::time <= ats.start_time + INTERVAL '10 minutes'
                               THEN 1 END) AS present_count,
                    COUNT(CASE WHEN lower(ar.status::text) = 'late'
                                OR (lower(ar.status::text) = 'present'
                                    AND ar.created_at::time > ats.start_time + INTERVAL '10 minutes')
                               THEN 1 END) AS late_count,
                    COUNT(CASE WHEN lower(ar.status::text) = 'excused'
                               THEN 1 END) AS excused_count
                FROM relevant_course_sessions rcs
                JOIN schedule           sch ON sch.course_session_id = rcs.id
                JOIN attendance_session ats ON ats.schedule_id       = sch.id
                LEFT JOIN attendance_record ar
                       ON ar.attendance_session_id = ats.id
                      AND ar.student_id = :user_id
            ),
            assessment_metrics AS (
                SELECT
                    COUNT(DISTINCT a.id) AS total_assessments,
                    COUNT(CASE WHEN trim(lower(a.assessment_type))
                                   IN ('exam','test','midterm','final')
                               THEN 1 END) AS exam_count,
                    COUNT(CASE WHEN a.assessment_type IS NULL
                                 OR trim(lower(a.assessment_type))
                                    NOT IN ('exam','test','midterm','final')
                               THEN 1 END) AS participation_count,
                    AVG(g.score)           AS average_score
                FROM relevant_course_sessions rcs
                JOIN assessment a ON a.course_session_id = rcs.id
                LEFT JOIN grade g ON g.assessment_id = a.id
                                 AND g.student_id = :student_id
            ),
            course_progress_metrics AS (
                SELECT
                    c.id   AS course_id,
                    c.name AS course_name,
                    c.code AS course_code,
                    COALESCE(SUM(g.score),     0) AS score_sum,
                    COALESCE(SUM(a.max_score), 0) AS max_score_sum,
                    COALESCE(SUM(CASE WHEN trim(lower(a.assessment_type))
                                          IN ('exam','test','midterm','final')
                                     THEN g.score ELSE 0 END), 0) AS exam_score_sum,
                    COALESCE(SUM(CASE WHEN trim(lower(a.assessment_type))
                                          IN ('exam','test','midterm','final')
                                     THEN a.max_score ELSE 0 END), 0) AS exam_max_score_sum,
                    COALESCE(SUM(CASE WHEN a.assessment_type IS NOT NULL
                                       AND trim(lower(a.assessment_type))
                                           NOT IN ('exam','test','midterm','final')
                                     THEN g.score ELSE 0 END), 0) AS participation_score_sum,
                    COALESCE(SUM(CASE WHEN a.assessment_type IS NOT NULL
                                       AND trim(lower(a.assessment_type))
                                           NOT IN ('exam','test','midterm','final')
                                     THEN a.max_score ELSE 0 END), 0) AS participation_max_score_sum,
                    CASE WHEN SUM(a.max_score) > 0
                         THEN (SUM(g.score) / SUM(a.max_score)) * 100
                         ELSE 0
                    END AS progress_percentage,
                    COALESCE(u.first_name || ' ' || u.last_name, u.email) AS teacher_name,
                    u.email AS teacher_email
                FROM relevant_course_sessions rcs
                JOIN course_session       cs  ON cs.id  = rcs.id
                JOIN course_program_level cpl ON cpl.id = cs.course_program_level_id
                JOIN course               c   ON c.id   = cpl.course_id
                LEFT JOIN teacher         tch ON tch.id  = cs.teacher_id
                LEFT JOIN "user"          u   ON u.id    = tch.user_id
                LEFT JOIN assessment      a   ON a.course_session_id = cs.id
                LEFT JOIN grade           g   ON g.assessment_id = a.id
                                             AND g.student_id = :student_id
                GROUP BY c.id, c.name, c.code, u.first_name, u.last_name, u.email
            )
            SELECT
                COALESCE(cm.total_courses, (SELECT total FROM curriculum_stats)) AS total_courses,
                COALESCE(cm.session_data, '[]'::json)         AS session_data,
                COALESCE(am.total_attendance_sessions, 0)     AS total_attendance_sessions,
                COALESCE(am.total_attendance_records,  0)     AS total_attendance_records,
                COALESCE(am.present_count,  0)                AS present_count,
                COALESCE(am.late_count,     0)                AS late_count,
                COALESCE(am.excused_count,  0)                AS excused_count,
                COALESCE(asm.total_assessments,   0)          AS total_assessments,
                COALESCE(asm.exam_count,          0)          AS exam_count,
                COALESCE(asm.participation_count, 0)          AS participation_count,
                COALESCE(asm.average_score,       0)          AS average_score,
                COALESCE(
                    (SELECT json_agg(row_to_json(cp)) FROM course_progress_metrics cp),
                    '[]'::json
                )                                             AS course_progress
            FROM (SELECT 1) dummy
            LEFT JOIN course_metrics     cm  ON true
            LEFT JOIN attendance_metrics am  ON true
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
            courses_per_session = [
                SessionCount(**d)
                for d in data
                if d.get("session_number") is not None
            ]

        # Parse course progress data
        course_progress = []
        if result and result.course_progress:
            cp_data = result.course_progress
            if isinstance(cp_data, str):
                import json
                cp_data = json.loads(cp_data)
            course_progress = [StudentCourseProgress(**d) for d in cp_data]

        total_sessions = result.total_attendance_sessions if result else 0
        present_count  = result.present_count             if result else 0
        late_count     = result.late_count                if result else 0
        excused_count  = result.excused_count             if result else 0

        calculated_absent = max(0, total_sessions - (present_count + late_count + excused_count))
        attendance_rate   = (present_count / total_sessions * 100) if total_sessions > 0 else 0.0

        return StudentDashboardMetrics(
            total_courses=result.total_courses if result else 0,
            courses_per_session=courses_per_session,
            course_progress=course_progress,
            total_attendance_sessions=total_sessions,
            total_attendance_records=total_sessions,
            present_count=present_count,
            absent_count=calculated_absent,
            late_count=late_count,
            excused_count=excused_count,
            attendance_rate=round(float(attendance_rate), 2),
            total_assessments=result.total_assessments     if result else 0,
            exam_count=result.exam_count                   if result else 0,
            participation_count=result.participation_count  if result else 0,
            average_score=round(float(result.average_score if result else 0), 2),
            student_id=student_id,
            year_level=current_year,
        )
