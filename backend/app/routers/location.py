from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.location import PatientLocation
from app.schemas.location import LocationUpdate, LocationResponse, LocationStatus

router = APIRouter(prefix="/api/location", tags=["location"])


@router.post("/update", response_model=LocationResponse)
def update_location(location: LocationUpdate, db: Session = Depends(get_db)):
    """
    Update patient location.
    """
    # Create new location record
    patient_location = PatientLocation(
        patient_id=location.patient_id,
        latitude=location.latitude,
        longitude=location.longitude,
        accuracy=location.accuracy,
        source=location.source
    )

    db.add(patient_location)
    db.commit()
    db.refresh(patient_location)

    return patient_location


@router.get("/latest/{patient_id}", response_model=LocationResponse)
def get_latest_location(patient_id: str, db: Session = Depends(get_db)):
    """
    Get the latest location for a patient.
    """
    location = db.query(PatientLocation).filter(
        PatientLocation.patient_id == patient_id
    ).order_by(PatientLocation.timestamp.desc()).first()

    if not location:
        raise HTTPException(status_code=404, detail="No location data found for this patient")

    return location


@router.get("/history/{patient_id}", response_model=List[LocationResponse])
def get_location_history(patient_id: str, limit: int = 50, db: Session = Depends(get_db)):
    """
    Get location history for a patient.
    """
    locations = db.query(PatientLocation).filter(
        PatientLocation.patient_id == patient_id
    ).order_by(PatientLocation.timestamp.desc()).limit(limit).all()

    return locations


@router.get("/status/{patient_id}", response_model=LocationStatus)
def get_location_status(patient_id: str, db: Session = Depends(get_db)):
    """
    Get location status for a patient.
    """
    location = db.query(PatientLocation).filter(
        PatientLocation.patient_id == patient_id
    ).order_by(PatientLocation.timestamp.desc()).first()

    if location:
        return LocationStatus(
            patient_id=patient_id,
            latitude=location.latitude,
            longitude=location.longitude,
            accuracy=location.accuracy,
            timestamp=location.timestamp,
            source=location.source,
            tracking_active=True
        )
    else:
        return LocationStatus(
            patient_id=patient_id,
            latitude=None,
            longitude=None,
            accuracy=None,
            timestamp=None,
            source=None,
            tracking_active=False
        )
