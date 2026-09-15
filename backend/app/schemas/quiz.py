from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class QuizGenerateRequest(BaseModel):
    document_ids: List[str] = Field(..., min_length=1)
    difficulty: str = "Medium"  # Easy, Medium, Hard
    question_count: int = Field(5, ge=1, le=30)
    question_types: List[str] = ["MCQ"]  # MCQ, True/False, Short Answer
    topic_focus: Optional[str] = None

class QuizQuestionSubmit(BaseModel):
    question_id: str
    user_answer: str

class QuizSubmitRequest(BaseModel):
    answers: List[QuizQuestionSubmit]

class QuizQuestionResponse(BaseModel):
    id: str
    question_text: str
    question_type: str
    options: List[str] = []
    user_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    explanation: Optional[str] = None
    source_page: int
    topic: str

    model_config = ConfigDict(from_attributes=True)

class QuizSessionResponse(BaseModel):
    id: str
    title: str
    difficulty: str
    total_questions: int
    score: int
    percentage: float
    completed: bool
    created_at: Optional[datetime] = None
    questions: List[QuizQuestionResponse] = []
    weak_topics: List[str] = []
    grade: Optional[str] = None
    grade_description: Optional[str] = None
    incorrect_count: Optional[int] = None
    unanswered_count: Optional[int] = None

    model_config = ConfigDict(from_attributes=True, extra="ignore")
