from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, Base
from app.routers import contacts, notifications, twilio, predictions, location
from app.websockets.monitoring_ws import monitor_patient_stream
from app.models import PatientLocation

# Initialize settings
settings = get_settings()

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Health Monitoring SMS Service with ML Prediction and Real-time Monitoring"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(contacts.router)
app.include_router(notifications.router)
app.include_router(twilio.router)
app.include_router(predictions.router)
app.include_router(location.router)


@app.get("/")
def root():
    return {
        "message": "Health Monitoring SMS Service API",
        "version": settings.app_version,
        "docs": "/docs",
        "mock_mode": settings.mock_mode,
        "features": [
            "Twilio SMS Integration",
            "ML-based Health Prediction",
            "Real-time Scenario Monitoring",
            "Emergency Contact Management"
        ]
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.websocket("/ws/monitor/{patient_id}")
async def websocket_monitor(
    websocket: WebSocket,
    patient_id: str,
    patient_name: str = Query("John Doe", description="Patient's name"),
    scenario: str = Query(..., description="Scenario type: NORMAL, WARNING, or CRITICAL"),
    steps: int = Query(60, description="Number of readings to generate"),
    interval: float = Query(1.0, description="Interval between readings in seconds"),
    notifications: bool = Query(True, description="Enable Twilio notifications")
):
    """
    WebSocket endpoint for real-time patient monitoring.

    Stream synthetic health readings for demonstration.
    """
    await monitor_patient_stream(
        websocket=websocket,
        patient_id=patient_id,
        patient_name=patient_name,
        scenario_type=scenario,
        total_steps=steps,
        interval=interval,
        enable_notifications=notifications
    )
