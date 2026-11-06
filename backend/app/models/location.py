from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base


class PatientLocation(Base):
    __tablename__ = "patient_locations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=True)  # in meters
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    source = Column(String(50), default="BROWSER_GEOLOCATION")
