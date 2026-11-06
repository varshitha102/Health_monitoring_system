from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(100), nullable=False)
    heart_rate_bpm = Column(Float, nullable=True)
    spo2_pct = Column(Float, nullable=True)
    skin_temp_c = Column(Float, nullable=True)
    steps = Column(Integer, nullable=True)
    age = Column(Integer, nullable=True)
    predicted_status = Column(String(20), nullable=False)  # NORMAL, WARNING, CRITICAL
    anomaly_score = Column(Float, nullable=True)
    is_anomaly = Column(Integer, nullable=True)  # 0 or 1
    model_version = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
