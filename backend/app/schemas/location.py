from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class LocationUpdate(BaseModel):
    patient_id: str = Field(..., description="Patient identifier")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude (-90 to 90)")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude (-180 to 180)")
    accuracy: float = Field(..., ge=0, description="Location accuracy in meters")
    source: str = Field(default="BROWSER_GEOLOCATION", description="Location source")


class LocationResponse(BaseModel):
    id: int
    patient_id: str
    latitude: float
    longitude: float
    accuracy: float
    timestamp: datetime
    source: str

    class Config:
        from_attributes = True


class LocationStatus(BaseModel):
    patient_id: str
    latitude: Optional[float]
    longitude: Optional[float]
    accuracy: Optional[float]
    timestamp: Optional[datetime]
    source: Optional[str]
    tracking_active: bool
