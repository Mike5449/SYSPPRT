from uuid import UUID
from pydantic import BaseModel
from typing import List, Optional

class TeacherCourseMetrics(BaseModel):
    course_id: UUID
    course_name: str
    course_code: str
    student_count: int
    average_progress: float
    attendance_rate: float
    exam_average: float
    participation_average: float
    year_level: int

class TeacherDashboardMetrics(BaseModel):
    total_courses: int
    total_students: int
    total_attendance_sessions: int
    present_count: int
    absent_count: int
    late_count: int
    attendance_rate: float
    average_student_progress: float
    course_metrics: List[TeacherCourseMetrics] = []
    teacher_id: UUID
    academic_year_id: Optional[UUID] = None
    program_level_id: Optional[UUID] = None
    year_level: Optional[int] = None
