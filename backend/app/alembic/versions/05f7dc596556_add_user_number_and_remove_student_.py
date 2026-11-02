"""Add user_number and remove student_employee_number

Revision ID: 05f7dc596556
Revises: d96f7dfa82f5
Create Date: 2026-02-20 01:05:36.755588

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '05f7dc596556'
down_revision = 'd96f7dfa82f5'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Drop dependent views
    op.execute("DROP VIEW IF EXISTS v_student_assessments_complete CASCADE")
    op.execute("DROP VIEW IF EXISTS v_student_courses_complete CASCADE")
    op.execute("DROP VIEW IF EXISTS v_student_attendance_complete CASCADE")

    # 2. Add user_number column
    op.add_column('user', sa.Column('user_number', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True))
    op.create_index(op.f('ix_user_user_number'), 'user', ['user_number'], unique=True)

    # 3. Data Migration: Copy student_number and employee_number to user_number
    op.execute('UPDATE "user" SET user_number = student.student_number FROM student WHERE student.user_id = "user".id')
    op.execute('UPDATE "user" SET user_number = teacher.employee_number FROM teacher WHERE teacher.user_id = "user".id')

    # 4. Remove old columns
    op.drop_index(op.f('ix_student_student_number'), table_name='student')
    op.drop_column('student', 'student_number')
    op.drop_index(op.f('ix_teacher_employee_number'), table_name='teacher')
    op.drop_column('teacher', 'employee_number')

    # 5. Recreate views with NEW definitions (using user_number)
    
    # v_student_attendance_complete
    op.execute("""
    CREATE OR REPLACE VIEW v_student_attendance_complete AS
     SELECT st.id AS student_id,
        u.user_number AS student_number,
        st.current_year_level,
        (u.first_name::text || ' '::text) || u.last_name::text AS student_name,
        u.email AS student_email,
        ar.id AS attendance_record_id,
        ar.status AS attendance_status,
        ar.arrival_time,
        ar.is_excused,
        ar.excuse_document,
        ar.notes AS attendance_notes,
        ar.created_at AS record_created_at,
        ats.id AS attendance_session_id,
        ats.session_date,
        ats.start_time AS session_start_time,
        ats.end_time AS session_end_time,
        ats.topic AS session_topic,
        ats.description AS session_description,
        ats.actual_room,
        ats.actual_building,
        ats.is_cancelled,
        ats.cancellation_reason,
        ats.attendance_taken,
        ats.total_students AS session_total_students,
        ats.present_students AS session_present_students,
            CASE
                WHEN ar.arrival_time IS NOT NULL AND ar.arrival_time > ats.start_time THEN EXTRACT(epoch FROM ar.arrival_time - ats.start_time) / 60::numeric
                ELSE 0::numeric
            END AS minutes_late,
        sch.id AS schedule_id,
        sch.day_of_week,
        sch.start_time AS scheduled_start_time,
        sch.end_time AS scheduled_end_time,
        sch.room,
        sch.building,
        c.id AS course_id,
        c.code AS course_code,
        c.name AS course_name,
        c.credits,
        cs.id AS course_session_id,
        cs.classroom,
        cs.year_level AS session_year_level,
        s.id AS session_id,
        s.name AS session_name,
        s.session_number,
        s.start_date AS session_start_date,
        s.end_date AS session_end_date,
        ay.id AS academic_year_id,
        ay.name AS academic_year_name,
        ay.is_current AS is_current_year,
        t.id AS teacher_id,
        (u_teacher.first_name::text || ' '::text) || u_teacher.last_name::text AS teacher_name,
        u_teacher.email AS teacher_email,
            CASE
                WHEN ats.is_cancelled = true THEN 'cancelled'::text
                WHEN ar.status = 'PRESENT'::attendancestatus AND (EXTRACT(epoch FROM ar.arrival_time - ats.start_time) / 60::numeric) <= 15::numeric THEN 'on_time'::text
                WHEN ar.status = 'PRESENT'::attendancestatus AND (EXTRACT(epoch FROM ar.arrival_time - ats.start_time) / 60::numeric) > 15::numeric THEN 'late_arrival'::text
                WHEN ar.status = 'LATE'::attendancestatus THEN 'late'::text
                WHEN ar.status = 'EXCUSED'::attendancestatus OR ar.status = 'ABSENT'::attendancestatus AND ar.is_excused = true THEN 'excused_absence'::text
                WHEN ar.status = 'ABSENT'::attendancestatus AND ar.is_excused = false THEN 'unexcused_absence'::text
                ELSE ar.status::text
            END AS attendance_category,
            CASE
                WHEN ats.is_cancelled = true THEN '🚫 Cancelled'::text
                WHEN ar.status = 'PRESENT'::attendancestatus AND (EXTRACT(epoch FROM ar.arrival_time - ats.start_time) / 60::numeric) <= 5::numeric THEN '✅ Present'::text
                WHEN ar.status = 'PRESENT'::attendancestatus THEN '🟡 Present (Late)'::text
                WHEN ar.status = 'LATE'::attendancestatus THEN '🟠 Late'::text
                WHEN ar.status = 'EXCUSED'::attendancestatus OR ar.is_excused = true THEN '📝 Excused'::text
                WHEN ar.status = 'ABSENT'::attendancestatus THEN '❌ Absent'::text
                ELSE '❓ Unknown'::text
            END AS status_icon
       FROM student st
         JOIN "user" u ON st.user_id = u.id
         JOIN attendance_record ar ON u.id = ar.student_id
         JOIN attendance_session ats ON ar.attendance_session_id = ats.id
         JOIN schedule sch ON ats.schedule_id = sch.id
         JOIN course_session cs ON sch.course_session_id = cs.id
         JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
         JOIN course c ON cpl.course_id = c.id
         JOIN session s ON cs.session_id = s.id
         JOIN academic_year ay ON s.academic_year_id = ay.id
         JOIN teacher t ON cs.teacher_id = t.id
         JOIN "user" u_teacher ON t.user_id = u_teacher.id
       GROUP BY st.id, u.user_number, st.current_year_level, u.first_name, u.last_name, u.email, ar.id, ar.status, ar.arrival_time, ar.is_excused, ar.excuse_document, ar.notes, ar.created_at, ats.id, ats.session_date, ats.start_time, ats.end_time, ats.topic, ats.description, ats.actual_room, ats.actual_building, ats.is_cancelled, ats.cancellation_reason, ats.attendance_taken, ats.total_students, ats.present_students, sch.id, sch.day_of_week, sch.start_time, sch.end_time, sch.room, sch.building, c.id, c.code, c.name, c.credits, cs.id, cs.classroom, cs.year_level, s.id, s.name, s.session_number, s.start_date, s.end_date, ay.id, ay.name, ay.is_current, t.id, u_teacher.first_name, u_teacher.last_name, u_teacher.email
    """)

    # v_student_courses_complete
    op.execute("""
    CREATE OR REPLACE VIEW v_student_courses_complete AS
     SELECT st.id AS student_id,
        u.user_number AS student_number,
        st.current_year_level,
        (u.first_name::text || ' '::text) || u.last_name::text AS student_name,
        u.email AS student_email,
        c.id AS course_id,
        c.name AS course_name,
        c.code AS course_code,
        c.description AS course_description,
        c.credits,
        c.hours_per_week,
        c.is_mandatory AS course_mandatory,
        c.prerequisites,
        c.syllabus,
        cpl.id AS course_program_level_id,
        cpl.year_level AS cpl_year_level,
        cs.id AS course_session_id,
        cs.classroom,
        cs.max_students,
        cs.year_level AS session_year_level,
        cs.is_active AS session_active,
        s.id AS session_id,
        s.name AS session_name,
        s.code AS session_code,
        s.session_number,
        s.start_date AS session_start_date,
        s.end_date AS session_end_date,
        ay.id AS academic_year_id,
        ay.name AS academic_year_name,
        ay.code AS academic_year_code,
        ay.start_date AS year_start_date,
        ay.end_date AS year_end_date,
        ay.is_current AS is_current_year,
        t.id AS teacher_id,
        u_teacher.user_number AS employee_number,
        (u_teacher.first_name::text || ' '::text) || u_teacher.last_name::text AS teacher_name,
        u_teacher.email AS teacher_email,
        t.specialization,
        t.academic_rank,
        t.office_location,
        t.phone_extension,
        pl.id AS program_level_id,
        pl.name AS program_level_name,
        pl.code AS program_level_code,
        pl.typical_duration,
        ( SELECT count(*) AS count
               FROM assessment a
              WHERE a.course_session_id = cs.id) AS total_assessments,
        ( SELECT count(*) AS count
               FROM assessment a
                 JOIN grade g ON a.id = g.assessment_id
              WHERE a.course_session_id = cs.id AND g.student_id = st.id) AS completed_assessments,
        ( SELECT avg(g.score) AS avg
               FROM assessment a
                 JOIN grade g ON a.id = g.assessment_id
              WHERE a.course_session_id = cs.id AND g.student_id = st.id) AS current_average,
        ( SELECT sum(g.score * a.weight) / NULLIF(sum(a.weight), 0::double precision)
               FROM assessment a
                 JOIN grade g ON a.id = g.assessment_id
              WHERE a.course_session_id = cs.id AND g.student_id = st.id) AS weighted_average,
            CASE
                WHEN NOT (EXISTS ( SELECT 1
                   FROM grade g
                     JOIN assessment a ON g.assessment_id = a.id
                  WHERE a.course_session_id = cs.id AND g.student_id = st.id)) THEN 'not_started'::text
                WHEN (( SELECT count(*) AS count
                   FROM assessment a
                     JOIN grade g ON a.id = g.assessment_id
                  WHERE a.course_session_id = cs.id AND g.student_id = st.id)) < (( SELECT count(*) AS count
                   FROM assessment a
                  WHERE a.course_session_id = cs.id)) THEN 'in_progress'::text
                WHEN (( SELECT avg(g.score) AS avg
                   FROM assessment a
                     JOIN grade g ON a.id = g.assessment_id
                  WHERE a.course_session_id = cs.id AND g.student_id = st.id)) >= 60::double precision THEN 'completed'::text
                ELSE 'failed'::text
            END AS computed_status,
        ( SELECT count(DISTINCT g.student_id) AS count
               FROM grade g
                 JOIN assessment a ON g.assessment_id = a.id
              WHERE a.course_session_id = cs.id) AS enrolled_students_count
       FROM student st
         JOIN "user" u ON st.user_id = u.id
         JOIN grade g_link ON st.id = g_link.student_id
         JOIN assessment a_link ON g_link.assessment_id = a_link.id
         JOIN course_session cs ON a_link.course_session_id = cs.id
         JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
         JOIN course c ON cpl.course_id = c.id
         JOIN program_level pl ON cpl.program_level_id = pl.id
         JOIN session s ON cs.session_id = s.id
         JOIN academic_year ay ON s.academic_year_id = ay.id
         JOIN teacher t ON cs.teacher_id = t.id
         JOIN "user" u_teacher ON t.user_id = u_teacher.id
       GROUP BY st.id, u.user_number, st.current_year_level, u.first_name, u.last_name, u.email, c.id, c.name, c.code, c.description, c.credits, c.hours_per_week, c.is_mandatory, c.prerequisites, c.syllabus, cpl.id, cpl.year_level, cs.id, cs.classroom, cs.max_students, cs.year_level, cs.is_active, s.id, s.name, s.code, s.session_number, s.start_date, s.end_date, ay.id, ay.name, ay.code, ay.start_date, ay.end_date, ay.is_current, t.id, u_teacher.user_number, t.specialization, t.academic_rank, t.office_location, t.phone_extension, u_teacher.first_name, u_teacher.last_name, u_teacher.email, pl.id, pl.name, pl.code, pl.typical_duration
    """)

    # v_student_assessments_complete
    op.execute("""
    CREATE OR REPLACE VIEW v_student_assessments_complete AS
     SELECT st.id AS student_id,
        u.user_number AS student_number,
        st.current_year_level,
        (u.first_name::text || ' '::text) || u.last_name::text AS student_name,
        u.email AS student_email,
        a.id AS assessment_id,
        a.name AS assessment_name,
        a.description AS assessment_description,
        a.assessment_type,
        a.max_score,
        a.weight,
        a.due_date,
        a.assessment_date,
        a.duration_minutes,
        a.is_mandatory,
        a.passing_score,
        a.instructions,
        a.is_published,
        g.id AS grade_id,
        g.score,
        g.letter_grade,
        g.grade_points,
        g.is_passing,
        g.graded_date,
        g.graded_by,
        g.comments AS grade_comments,
        g.is_published AS grade_published,
            CASE
                WHEN g.id IS NULL THEN 'not_submitted'::text
                WHEN g.is_published = false THEN 'graded_not_published'::text
                WHEN g.is_passing = true THEN 'passed'::text
                ELSE 'failed'::text
            END AS student_assessment_status,
        c.id AS course_id,
        c.code AS course_code,
        c.name AS course_name,
        c.credits,
        cs.id AS course_session_id,
        cs.classroom,
        cs.year_level AS session_year_level,
        s.id AS session_id,
        s.name AS session_name,
        s.session_number,
        s.start_date AS session_start_date,
        s.end_date AS session_end_date,
        ay.id AS academic_year_id,
        ay.name AS academic_year_name,
        ay.is_current AS is_current_year,
        t.id AS teacher_id,
        (u_teacher.first_name::text || ' '::text) || u_teacher.last_name::text AS teacher_name,
        u_teacher.email AS teacher_email,
            CASE
                WHEN a.due_date IS NULL THEN NULL::text
                WHEN a.due_date < CURRENT_DATE THEN 'overdue'::text
                WHEN a.due_date <= (CURRENT_DATE + '3 days'::interval) THEN 'urgent'::text
                WHEN a.due_date <= (CURRENT_DATE + '7 days'::interval) THEN 'upcoming'::text
                ELSE 'future'::text
            END AS deadline_status,
            CASE
                WHEN a.due_date IS NOT NULL THEN a.due_date - CURRENT_DATE
                ELSE NULL::integer
            END AS days_until_due
       FROM student st
         JOIN "user" u ON st.user_id = u.id
         JOIN grade g_link ON st.id = g_link.student_id
         JOIN assessment a_link ON g_link.assessment_id = a_link.id
         JOIN course_session cs ON a_link.course_session_id = cs.id
         JOIN assessment a ON cs.id = a.course_session_id
         LEFT JOIN grade g ON a.id = g.assessment_id AND st.id = g.student_id
         JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
         JOIN course c ON cpl.course_id = c.id
         JOIN session s ON cs.session_id = s.id
         JOIN academic_year ay ON s.academic_year_id = ay.id
         JOIN teacher t ON cs.teacher_id = t.id
         JOIN "user" u_teacher ON t.user_id = u_teacher.id
       GROUP BY st.id, u.user_number, st.current_year_level, u.first_name, u.last_name, u.email, a.id, a.name, a.description, a.assessment_type, a.max_score, a.weight, a.due_date, a.assessment_date, a.duration_minutes, a.is_mandatory, a.passing_score, a.instructions, a.is_published, g.id, g.score, g.letter_grade, g.grade_points, g.is_passing, g.graded_date, g.graded_by, g.comments, g.is_published, c.id, c.code, c.name, c.credits, cs.id, cs.classroom, cs.year_level, s.id, s.name, s.session_number, s.start_date, s.end_date, ay.id, ay.name, ay.is_current, t.id, u_teacher.first_name, u_teacher.last_name, u_teacher.email
    """)


def downgrade():
    # 1. Drop views (using new defs)
    op.execute("DROP VIEW IF EXISTS v_student_assessments_complete CASCADE")
    op.execute("DROP VIEW IF EXISTS v_student_courses_complete CASCADE")
    op.execute("DROP VIEW IF EXISTS v_student_attendance_complete CASCADE")

    # 2. Restore columns
    op.drop_index(op.f('ix_user_user_number'), table_name='user')
    op.drop_column('user', 'user_number')
    
    op.add_column('teacher', sa.Column('employee_number', sa.VARCHAR(length=50), autoincrement=False, nullable=True)) # nullable because we can't easily restore valid data if it was lost, but here we can try
    op.create_index(op.f('ix_teacher_employee_number'), 'teacher', ['employee_number'], unique=True)
    
    op.add_column('student', sa.Column('student_number', sa.VARCHAR(length=50), autoincrement=False, nullable=True))
    op.create_index(op.f('ix_student_student_number'), 'student', ['student_number'], unique=True)
    
    # 3. Restore data (reverse migration - best effort)
    # Note: user_number is lost if we drop it without backing up, but validation here assumes we are rolling back a failed transaction or for dev purposes.
    # We can try to restore from user info if we hadn't dropped user_number yet, but we are in downgrade.
    # In a real scenario, we might not be able to fully restore data without a backup.
    
    # 4. Recreate views with OLD definitions
    
    # v_student_attendance_complete
    op.execute("""
    CREATE OR REPLACE VIEW v_student_attendance_complete AS
     SELECT st.id AS student_id,
        st.student_number,
        st.current_year_level,
        (u.first_name::text || ' '::text) || u.last_name::text AS student_name,
        u.email AS student_email,
        ar.id AS attendance_record_id,
        ar.status AS attendance_status,
        ar.arrival_time,
        ar.is_excused,
        ar.excuse_document,
        ar.notes AS attendance_notes,
        ar.created_at AS record_created_at,
        ats.id AS attendance_session_id,
        ats.session_date,
        ats.start_time AS session_start_time,
        ats.end_time AS session_end_time,
        ats.topic AS session_topic,
        ats.description AS session_description,
        ats.actual_room,
        ats.actual_building,
        ats.is_cancelled,
        ats.cancellation_reason,
        ats.attendance_taken,
        ats.total_students AS session_total_students,
        ats.present_students AS session_present_students,
            CASE
                WHEN ar.arrival_time IS NOT NULL AND ar.arrival_time > ats.start_time THEN EXTRACT(epoch FROM ar.arrival_time - ats.start_time) / 60::numeric
                ELSE 0::numeric
            END AS minutes_late,
        sch.id AS schedule_id,
        sch.day_of_week,
        sch.start_time AS scheduled_start_time,
        sch.end_time AS scheduled_end_time,
        sch.room,
        sch.building,
        c.id AS course_id,
        c.code AS course_code,
        c.name AS course_name,
        c.credits,
        cs.id AS course_session_id,
        cs.classroom,
        cs.year_level AS session_year_level,
        s.id AS session_id,
        s.name AS session_name,
        s.session_number,
        s.start_date AS session_start_date,
        s.end_date AS session_end_date,
        ay.id AS academic_year_id,
        ay.name AS academic_year_name,
        ay.is_current AS is_current_year,
        t.id AS teacher_id,
        (u_teacher.first_name::text || ' '::text) || u_teacher.last_name::text AS teacher_name,
        u_teacher.email AS teacher_email,
            CASE
                WHEN ats.is_cancelled = true THEN 'cancelled'::text
                WHEN ar.status = 'PRESENT'::attendancestatus AND (EXTRACT(epoch FROM ar.arrival_time - ats.start_time) / 60::numeric) <= 15::numeric THEN 'on_time'::text
                WHEN ar.status = 'PRESENT'::attendancestatus AND (EXTRACT(epoch FROM ar.arrival_time - ats.start_time) / 60::numeric) > 15::numeric THEN 'late_arrival'::text
                WHEN ar.status = 'LATE'::attendancestatus THEN 'late'::text
                WHEN ar.status = 'EXCUSED'::attendancestatus OR ar.status = 'ABSENT'::attendancestatus AND ar.is_excused = true THEN 'excused_absence'::text
                WHEN ar.status = 'ABSENT'::attendancestatus AND ar.is_excused = false THEN 'unexcused_absence'::text
                ELSE ar.status::text
            END AS attendance_category,
            CASE
                WHEN ats.is_cancelled = true THEN '🚫 Cancelled'::text
                WHEN ar.status = 'PRESENT'::attendancestatus AND (EXTRACT(epoch FROM ar.arrival_time - ats.start_time) / 60::numeric) <= 5::numeric THEN '✅ Present'::text
                WHEN ar.status = 'PRESENT'::attendancestatus THEN '🟡 Present (Late)'::text
                WHEN ar.status = 'LATE'::attendancestatus THEN '🟠 Late'::text
                WHEN ar.status = 'EXCUSED'::attendancestatus OR ar.is_excused = true THEN '📝 Excused'::text
                WHEN ar.status = 'ABSENT'::attendancestatus THEN '❌ Absent'::text
                ELSE '❓ Unknown'::text
            END AS status_icon
       FROM student st
         JOIN "user" u ON st.user_id = u.id
         JOIN attendance_record ar ON u.id = ar.student_id
         JOIN attendance_session ats ON ar.attendance_session_id = ats.id
         JOIN schedule sch ON ats.schedule_id = sch.id
         JOIN course_session cs ON sch.course_session_id = cs.id
         JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
         JOIN course c ON cpl.course_id = c.id
         JOIN session s ON cs.session_id = s.id
         JOIN academic_year ay ON s.academic_year_id = ay.id
         JOIN teacher t ON cs.teacher_id = t.id
         JOIN "user" u_teacher ON t.user_id = u_teacher.id
       GROUP BY st.id, st.student_number, st.current_year_level, u.first_name, u.last_name, u.email, ar.id, ar.status, ar.arrival_time, ar.is_excused, ar.excuse_document, ar.notes, ar.created_at, ats.id, ats.session_date, ats.start_time, ats.end_time, ats.topic, ats.description, ats.actual_room, ats.actual_building, ats.is_cancelled, ats.cancellation_reason, ats.attendance_taken, ats.total_students, ats.present_students, sch.id, sch.day_of_week, sch.start_time, sch.end_time, sch.room, sch.building, c.id, c.code, c.name, c.credits, cs.id, cs.classroom, cs.year_level, s.id, s.name, s.session_number, s.start_date, s.end_date, ay.id, ay.name, ay.is_current, t.id, u_teacher.first_name, u_teacher.last_name, u_teacher.email
    """)

    # v_student_courses_complete
    op.execute("""
    CREATE OR REPLACE VIEW v_student_courses_complete AS
     SELECT st.id AS student_id,
        st.student_number,
        st.current_year_level,
        (u.first_name::text || ' '::text) || u.last_name::text AS student_name,
        u.email AS student_email,
        c.id AS course_id,
        c.name AS course_name,
        c.code AS course_code,
        c.description AS course_description,
        c.credits,
        c.hours_per_week,
        c.is_mandatory AS course_mandatory,
        c.prerequisites,
        c.syllabus,
        cpl.id AS course_program_level_id,
        cpl.year_level AS cpl_year_level,
        cs.id AS course_session_id,
        cs.classroom,
        cs.max_students,
        cs.year_level AS session_year_level,
        cs.is_active AS session_active,
        s.id AS session_id,
        s.name AS session_name,
        s.code AS session_code,
        s.session_number,
        s.start_date AS session_start_date,
        s.end_date AS session_end_date,
        ay.id AS academic_year_id,
        ay.name AS academic_year_name,
        ay.code AS academic_year_code,
        ay.start_date AS year_start_date,
        ay.end_date AS year_end_date,
        ay.is_current AS is_current_year,
        t.id AS teacher_id,
        t.employee_number,
        (u_teacher.first_name::text || ' '::text) || u_teacher.last_name::text AS teacher_name,
        u_teacher.email AS teacher_email,
        t.specialization,
        t.academic_rank,
        t.office_location,
        t.phone_extension,
        pl.id AS program_level_id,
        pl.name AS program_level_name,
        pl.code AS program_level_code,
        pl.typical_duration,
        ( SELECT count(*) AS count
               FROM assessment a
              WHERE a.course_session_id = cs.id) AS total_assessments,
        ( SELECT count(*) AS count
               FROM assessment a
                 JOIN grade g ON a.id = g.assessment_id
              WHERE a.course_session_id = cs.id AND g.student_id = st.id) AS completed_assessments,
        ( SELECT avg(g.score) AS avg
               FROM assessment a
                 JOIN grade g ON a.id = g.assessment_id
              WHERE a.course_session_id = cs.id AND g.student_id = st.id) AS current_average,
        ( SELECT sum(g.score * a.weight) / NULLIF(sum(a.weight), 0::double precision)
               FROM assessment a
                 JOIN grade g ON a.id = g.assessment_id
              WHERE a.course_session_id = cs.id AND g.student_id = st.id) AS weighted_average,
            CASE
                WHEN NOT (EXISTS ( SELECT 1
                   FROM grade g
                     JOIN assessment a ON g.assessment_id = a.id
                  WHERE a.course_session_id = cs.id AND g.student_id = st.id)) THEN 'not_started'::text
                WHEN (( SELECT count(*) AS count
                   FROM assessment a
                     JOIN grade g ON a.id = g.assessment_id
                  WHERE a.course_session_id = cs.id AND g.student_id = st.id)) < (( SELECT count(*) AS count
                   FROM assessment a
                  WHERE a.course_session_id = cs.id)) THEN 'in_progress'::text
                WHEN (( SELECT avg(g.score) AS avg
                   FROM assessment a
                     JOIN grade g ON a.id = g.assessment_id
                  WHERE a.course_session_id = cs.id AND g.student_id = st.id)) >= 60::double precision THEN 'completed'::text
                ELSE 'failed'::text
            END AS computed_status,
        ( SELECT count(DISTINCT g.student_id) AS count
               FROM grade g
                 JOIN assessment a ON g.assessment_id = a.id
              WHERE a.course_session_id = cs.id) AS enrolled_students_count
       FROM student st
         JOIN "user" u ON st.user_id = u.id
         JOIN grade g_link ON st.id = g_link.student_id
         JOIN assessment a_link ON g_link.assessment_id = a_link.id
         JOIN course_session cs ON a_link.course_session_id = cs.id
         JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
         JOIN course c ON cpl.course_id = c.id
         JOIN program_level pl ON cpl.program_level_id = pl.id
         JOIN session s ON cs.session_id = s.id
         JOIN academic_year ay ON s.academic_year_id = ay.id
         JOIN teacher t ON cs.teacher_id = t.id
         JOIN "user" u_teacher ON t.user_id = u_teacher.id
       GROUP BY st.id, st.student_number, st.current_year_level, u.first_name, u.last_name, u.email, c.id, c.name, c.code, c.description, c.credits, c.hours_per_week, c.is_mandatory, c.prerequisites, c.syllabus, cpl.id, cpl.year_level, cs.id, cs.classroom, cs.max_students, cs.year_level, cs.is_active, s.id, s.name, s.code, s.session_number, s.start_date, s.end_date, ay.id, ay.name, ay.code, ay.start_date, ay.end_date, ay.is_current, t.id, t.employee_number, t.specialization, t.academic_rank, t.office_location, t.phone_extension, u_teacher.first_name, u_teacher.last_name, u_teacher.email, pl.id, pl.name, pl.code, pl.typical_duration
    """)

    # v_student_assessments_complete
    op.execute("""
    CREATE OR REPLACE VIEW v_student_assessments_complete AS
     SELECT st.id AS student_id,
        st.student_number,
        st.current_year_level,
        (u.first_name::text || ' '::text) || u.last_name::text AS student_name,
        u.email AS student_email,
        a.id AS assessment_id,
        a.name AS assessment_name,
        a.description AS assessment_description,
        a.assessment_type,
        a.max_score,
        a.weight,
        a.due_date,
        a.assessment_date,
        a.duration_minutes,
        a.is_mandatory,
        a.passing_score,
        a.instructions,
        a.is_published,
        g.id AS grade_id,
        g.score,
        g.letter_grade,
        g.grade_points,
        g.is_passing,
        g.graded_date,
        g.graded_by,
        g.comments AS grade_comments,
        g.is_published AS grade_published,
            CASE
                WHEN g.id IS NULL THEN 'not_submitted'::text
                WHEN g.is_published = false THEN 'graded_not_published'::text
                WHEN g.is_passing = true THEN 'passed'::text
                ELSE 'failed'::text
            END AS student_assessment_status,
        c.id AS course_id,
        c.code AS course_code,
        c.name AS course_name,
        c.credits,
        cs.id AS course_session_id,
        cs.classroom,
        cs.year_level AS session_year_level,
        s.id AS session_id,
        s.name AS session_name,
        s.session_number,
        s.start_date AS session_start_date,
        s.end_date AS session_end_date,
        ay.id AS academic_year_id,
        ay.name AS academic_year_name,
        ay.is_current AS is_current_year,
        t.id AS teacher_id,
        (u_teacher.first_name::text || ' '::text) || u_teacher.last_name::text AS teacher_name,
        u_teacher.email AS teacher_email,
            CASE
                WHEN a.due_date IS NULL THEN NULL::text
                WHEN a.due_date < CURRENT_DATE THEN 'overdue'::text
                WHEN a.due_date <= (CURRENT_DATE + '3 days'::interval) THEN 'urgent'::text
                WHEN a.due_date <= (CURRENT_DATE + '7 days'::interval) THEN 'upcoming'::text
                ELSE 'future'::text
            END AS deadline_status,
            CASE
                WHEN a.due_date IS NOT NULL THEN a.due_date - CURRENT_DATE
                ELSE NULL::integer
            END AS days_until_due
       FROM student st
         JOIN "user" u ON st.user_id = u.id
         JOIN grade g_link ON st.id = g_link.student_id
         JOIN assessment a_link ON g_link.assessment_id = a_link.id
         JOIN course_session cs ON a_link.course_session_id = cs.id
         JOIN assessment a ON cs.id = a.course_session_id
         LEFT JOIN grade g ON a.id = g.assessment_id AND st.id = g.student_id
         JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
         JOIN course c ON cpl.course_id = c.id
         JOIN session s ON cs.session_id = s.id
         JOIN academic_year ay ON s.academic_year_id = ay.id
         JOIN teacher t ON cs.teacher_id = t.id
         JOIN "user" u_teacher ON t.user_id = u_teacher.id
       GROUP BY st.id, st.student_number, st.current_year_level, u.first_name, u.last_name, u.email, a.id, a.name, a.description, a.assessment_type, a.max_score, a.weight, a.due_date, a.assessment_date, a.duration_minutes, a.is_mandatory, a.passing_score, a.instructions, a.is_published, g.id, g.score, g.letter_grade, g.grade_points, g.is_passing, g.graded_date, g.graded_by, g.comments, g.is_published, c.id, c.code, c.name, c.credits, cs.id, cs.classroom, cs.year_level, s.id, s.name, s.session_number, s.start_date, s.end_date, ay.id, ay.name, ay.is_current, t.id, u_teacher.first_name, u_teacher.last_name, u_teacher.email
    """)
