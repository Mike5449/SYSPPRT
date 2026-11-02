from uuid import UUID
from pydantic import BaseModel
from typing import List, Optional

class SessionCount(BaseModel):
    session_number: int
    count: int

class StudentCourseProgress(BaseModel):
    course_id: UUID
    course_name: str
    course_code: str
    score_sum: float
    max_score_sum: float
    exam_score_sum: float = 0
    exam_max_score_sum: float = 0
    participation_score_sum: float = 0
    participation_max_score_sum: float = 0
    progress_percentage: float
    teacher_name: Optional[str] = None
    teacher_email: Optional[str] = None

class StudentDashboardMetrics(BaseModel):
    total_courses: int
    courses_per_session: List[SessionCount]
    course_progress: List[StudentCourseProgress] = []
    total_attendance_sessions: int
    total_attendance_records: int
    present_count: int
    absent_count: int
    late_count: int
    excused_count: int
    attendance_rate: float
    total_assessments: int
    exam_count: int
    participation_count: int
    average_score: float
    student_id: UUID
    academic_year_id: Optional[UUID] = None
    year_level: int
