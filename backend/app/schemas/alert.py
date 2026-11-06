from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.models.notification import NotificationStatus, AlertLevel


class AlertRequest(BaseModel):
    patient_id: str = Field(..., description="Patient identifier")
    patient_name: Optional[str] = Field(None, description="Patient name")
    temperature: float = Field(..., description="Body temperature in Celsius")
    heart_rate: int = Field(..., description="Heart rate in BPM")
    spo2: int = Field(..., description="Blood oxygen saturation percentage")
    alert_level: AlertLevel = Field(..., description="Alert level: WARNING or CRITICAL")
    contact_ids: List[int] = Field(..., description="List of emergency contact IDs to notify")


class AlertResponse(BaseModel):
    notification_id: int
    recipient_phone: str
    alert_level: AlertLevel
    message_content: str
    twilio_message_sid: Optional[str] = None
    delivery_status: NotificationStatus
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: int
    patient_id: str
    recipient_phone: str
    alert_level: AlertLevel
    message_content: str
    twilio_message_sid: Optional[str]
    delivery_status: NotificationStatus
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class StatusCallbackRequest(BaseModel):
    MessageSid: str
    MessageStatus: str
    To: str
    From: str
