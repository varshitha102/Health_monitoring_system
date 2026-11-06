from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class NotificationStatus(str, enum.Enum):
    CREATING = "CREATING"
    SENDING = "SENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class AlertLevel(str, enum.Enum):
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(100), nullable=False)
    recipient_phone = Column(String(20), nullable=False)
    alert_level = Column(Enum(AlertLevel), nullable=False)
    message_content = Column(Text, nullable=False)
    twilio_message_sid = Column(String(100), unique=True, nullable=True)
    delivery_status = Column(Enum(NotificationStatus), default=NotificationStatus.CREATING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Location snapshot at time of notification
    location_latitude = Column(Float, nullable=True)
    location_longitude = Column(Float, nullable=True)
    location_accuracy = Column(Float, nullable=True)
    location_timestamp = Column(DateTime(timezone=True), nullable=True)
    location_available = Column(Integer, default=0)  # 0 = no, 1 = yes

    # Relationship with contact (optional, for tracking which contact was used)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
