import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class StudySession(Base):
    __tablename__ = "study_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=15)
    subject: Mapped[str] = mapped_column(String(100), default="General")
    activity_type: Mapped[str] = mapped_column(String(50), default="chat")  # chat, quiz, flashcard, summary
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="study_sessions")

class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)
    theme: Mapped[str] = mapped_column(String(20), default="dark")  # dark, light
    default_difficulty: Mapped[str] = mapped_column(String(20), default="Medium")
    auto_citation_jump: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
