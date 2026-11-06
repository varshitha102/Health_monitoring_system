from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PredictionRequest(BaseModel):
    patient_id: str = Field(..., description="Patient identifier")
    heart_rate_bpm: Optional[float] = Field(None, description="Heart rate in BPM")
    spo2_pct: Optional[float] = Field(None, description="Blood oxygen saturation percentage")
    skin_temp_c: Optional[float] = Field(None, description="Skin temperature in Celsius")
    steps: Optional[int] = Field(None, description="Step count")
    age: Optional[int] = Field(None, description="Patient age")


class PredictionResponse(BaseModel):
    id: int
    patient_id: str
    heart_rate_bpm: Optional[float]
    spo2_pct: Optional[float]
    skin_temp_c: Optional[float]
    steps: Optional[int]
    age: Optional[int]
    predicted_status: str
    anomaly_score: Optional[float]
    is_anomaly: Optional[int]
    model_version: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ModelInfoResponse(BaseModel):
    model_type: str
    contamination: float
    training_date: str
    n_train_samples: int
    n_test_samples: int
    features: list
    contamination_actual: float
