from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class InterviewType(str, Enum):
    TECHNICAL = "technical"
    HR = "hr"
    DSA = "dsa"
    SYSTEM_DESIGN = "system_design"
    FULL = "full"


class InterviewStatus(str, Enum):
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class QuestionDifficulty(str, Enum):
    LEVEL_1 = "resume_based"
    LEVEL_2 = "deep_dive"
    LEVEL_3 = "cross_question"
    LEVEL_4 = "contradiction_test"


class QuestionAnswer(BaseModel):
    question: str
    difficulty: QuestionDifficulty
    answer: str = ""
    evaluation: dict = {}
    response_time_seconds: float = 0
    timestamp: Optional[datetime] = None


class InterviewScores(BaseModel):
    technical: float = 0
    communication: float = 0
    confidence: float = 0
    depth: float = 0
    authenticity: float = 0
    overall: float = 0


class MalpracticeSignals(BaseModel):
    tab_switches: int = 0
    paste_events: int = 0
    window_blurs: int = 0
    avg_response_delay: float = 0
    keystroke_anomalies: int = 0
    suspicion_score: float = 0


class InterviewCreate(BaseModel):
    candidate_id: str
    interview_type: InterviewType = InterviewType.TECHNICAL


class InterviewResponse(BaseModel):
    id: str
    candidate_id: str
    interview_type: InterviewType
    status: InterviewStatus
    questions_answers: list[QuestionAnswer] = []
    scores: InterviewScores = InterviewScores()
    malpractice: MalpracticeSignals = MalpracticeSignals()
    created_at: datetime
    completed_at: Optional[datetime] = None
