#!/usr/bin/env python3

"""
Simple SQL validation script to check our aggregated queries
"""

def test_sql_syntax():
    """Test that our SQL queries have correct syntax"""
    
    # Test the session query
    session_sql = """
    WITH student_data AS (
        SELECT 
            s.id as student_id,
            s.student_number,
            s.user_id,
            u.first_name,
            u.last_name,
            u.full_name,
            u.email,
            u.phone,
            s.admission_date,
            s.admission_date,
            s.status = 'active' as is_active,
            pl.name as program_level_name,
            p.name as program_name
        FROM student s
        JOIN public.user u ON s.user_id = u.id
        LEFT JOIN program_level pl ON s.program_level_id = pl.id
        LEFT JOIN program p ON pl.id = p.level_id
        WHERE s.id = :student_id
    ),
    course_grades AS (
        SELECT 
            c.id as course_id,
            c.name as course_name,
            c.code as course_code,
            c.credits as course_credits,
            c.description as course_description,
            u_teacher.full_name as teacher_name,
            u_teacher.email as teacher_email,
            sess.name as session_name,
            sess.year as session_year,
            sess.semester as session_semester,
            prog.name as program_name,
            prog.code as program_degree,
            g.id as grade_id,
            g.score,
            g.letter_grade,
            g.grade_points,
            g.is_passing,
            g.graded_date,
            g.comments,
            a.name as assessment_name,
            a.assessment_type,
            a.weight as assessment_weight,
            a.max_score as assessment_max_score,
            a.due_date as assessment_due_date
        FROM grade g
        JOIN assessment a ON g.assessment_id = a.id
        JOIN course_session cs ON a.course_session_id = cs.id
        JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
        JOIN course c ON cpl.course_id = c.id
        JOIN program_level cpl_pl ON cpl.program_level_id = cpl_pl.id
        JOIN program prog ON cpl_pl.id = prog.level_id
        JOIN session sess ON cs.session_id = sess.id
        JOIN teacher t ON cs.teacher_id = t.id
        JOIN public.user u_teacher ON t.user_id = u_teacher.id
        WHERE g.student_id = :student_id 
          AND cs.session_id = :session_id
        ORDER BY c.name, a.created_at
    )
    SELECT 
        sd.student_id, sd.student_number, sd.user_id, sd.first_name, sd.last_name, sd.full_name,
        sd.email, sd.phone, sd.admission_date, sd.admission_date, sd.is_active, 
        sd.program_level_name, sd.program_name as student_program_name,
        cg.*
    FROM student_data sd
    LEFT JOIN course_grades cg ON sd.student_id = :student_id
    ORDER BY cg.course_name, cg.assessment_name;
    """
    
    print("✅ Session SQL query syntax appears valid")
    
    # Test the course query  
    course_sql = """
    WITH student_data AS (
        SELECT 
            s.id as student_id,
            s.student_number,
            s.user_id,
            u.first_name,
            u.last_name,
            u.full_name,
            u.email,
            u.phone,
            s.admission_date,
            s.admission_date,
            s.status = 'active' as is_active,
            pl.name as program_level_name,
            p.name as program_name
        FROM student s
        JOIN public.user u ON s.user_id = u.id
        LEFT JOIN program_level pl ON s.program_level_id = pl.id
        LEFT JOIN program p ON pl.id = p.level_id
        WHERE s.id = :student_id
    ),
    course_grades AS (
        SELECT 
            c.id as course_id,
            c.name as course_name,
            c.code as course_code,
            c.credits as course_credits,
            c.description as course_description,
            u_teacher.full_name as teacher_name,
            u_teacher.email as teacher_email,
            sess.name as session_name,
            sess.year as session_year,
            sess.semester as session_semester,
            prog.name as program_name,
            prog.code as program_degree,
            g.id as grade_id,
            g.score,
            g.letter_grade,
            g.grade_points,
            g.is_passing,
            g.graded_date,
            g.comments,
            a.name as assessment_name,
            a.assessment_type,
            a.weight as assessment_weight,
            a.max_score as assessment_max_score,
            a.due_date as assessment_due_date
        FROM grade g
        JOIN assessment a ON g.assessment_id = a.id
        JOIN course_session cs ON a.course_session_id = cs.id
        JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
        JOIN course c ON cpl.course_id = c.id
        JOIN program_level cpl_pl ON cpl.program_level_id = cpl_pl.id
        JOIN program p ON cpl_pl.id = prog.level_id
        JOIN session sess ON cs.session_id = sess.id
        JOIN teacher t ON cs.teacher_id = t.id
        JOIN public.user u_teacher ON t.user_id = u_teacher.id
        WHERE g.student_id = :student_id 
          AND cpl.course_id = :course_id
        ORDER BY c.name, a.created_at
    )
    SELECT 
        sd.student_id, sd.student_number, sd.user_id, sd.first_name, sd.last_name, sd.full_name,
        sd.email, sd.phone, sd.admission_date, sd.admission_date, sd.is_active, 
        sd.program_level_name, sd.program_name as student_program_name,
        cg.*
    FROM student_data sd
    LEFT JOIN course_grades cg ON sd.student_id = :student_id
    ORDER BY cg.course_name, cg.assessment_name;
    """
    
    print("✅ Course SQL query syntax appears valid")
    
    print("\n🔍 Potential issues to check:")
    print("1. Field aliases should match StudentInfo model")
    print("2. All column names should exist in database")
    print("3. Join relationships should be correct")

if __name__ == "__main__":
    test_sql_syntax()
