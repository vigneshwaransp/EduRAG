from typing import List, Dict, Any
from pydantic import BaseModel

class ActivityDay(BaseModel):
    day: str           # "Mon", "Tue", etc.
    date: str          # "2025-09-10"
    minutes: int
    questions_count: int

class SubjectMastery(BaseModel):
    subject: str
    accuracy_percentage: float
    documents_count: int
    questions_answered: int
    status: str        # "Strong", "Moderate", "Needs Attention"

class TopicPerformance(BaseModel):
    topic: str
    subject: str
    accuracy: float
    is_weak: bool

class DashboardMetricsResponse(BaseModel):
    total_documents: int
    total_questions: int
    study_sessions_count: int
    quizzes_completed: int
    total_study_minutes: int
    overall_accuracy: float
    weekly_activity: List[ActivityDay]
    subject_mastery: List[SubjectMastery]
    weak_areas: List[TopicPerformance]
    strong_areas: List[TopicPerformance]
    recent_activity: List[Dict[str, Any]]
