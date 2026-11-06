from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionRequest, PredictionResponse, ModelInfoResponse
from app.services.prediction_service import prediction_service

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.post("/", response_model=PredictionResponse)
def create_prediction(request: PredictionRequest, db: Session = Depends(get_db)):
    """
    Generate a health prediction using the ML model.
    """
    # Generate prediction
    result = prediction_service.predict({
        'heart_rate_bpm': request.heart_rate_bpm,
        'spo2_pct': request.spo2_pct,
        'skin_temp_c': request.skin_temp_c,
        'steps': request.steps,
        'age': request.age,
        'temperature': request.skin_temp_c  # Use skin temp as body temp for rule-based
    })

    # Save prediction to database
    prediction = Prediction(
        patient_id=request.patient_id,
        heart_rate_bpm=request.heart_rate_bpm,
        spo2_pct=request.spo2_pct,
        skin_temp_c=request.skin_temp_c,
        steps=request.steps,
        age=request.age,
        predicted_status=result['predicted_status'],
        anomaly_score=result.get('anomaly_score'),
        is_anomaly=result.get('is_anomaly'),
        model_version=result.get('model_version')
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return prediction


@router.get("/", response_model=List[PredictionResponse])
def get_predictions(
    patient_id: str = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get prediction history. Optionally filter by patient ID.
    """
    query = db.query(Prediction)

    if patient_id:
        query = query.filter(Prediction.patient_id == patient_id)

    predictions = query.order_by(Prediction.created_at.desc()).limit(limit).all()

    return predictions


@router.get("/model/info", response_model=ModelInfoResponse)
def get_model_info():
    """
    Get information about the loaded ML model.
    """
    info = prediction_service.get_model_info()

    if not info.get('model_loaded'):
        raise HTTPException(status_code=503, detail="ML model not loaded")

    return ModelInfoResponse(**info)


@router.get("/{prediction_id}", response_model=PredictionResponse)
def get_prediction(prediction_id: int, db: Session = Depends(get_db)):
    """
    Get a specific prediction by ID.
    """
    prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    return prediction
