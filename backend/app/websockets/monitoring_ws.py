from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict
import json
import asyncio
from app.services.synthetic_generator import synthetic_generator
from app.services.twilio_service import twilio_service
from app.services.notification_service import NotificationService
from app.database import SessionLocal


class ConnectionManager:
    """Manage WebSocket connections for patient monitoring."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, patient_id: str):
        """Accept a WebSocket connection."""
        await websocket.accept()
        self.active_connections[patient_id] = websocket
        print(f"WebSocket connected for patient {patient_id}")

    def disconnect(self, patient_id: str):
        """Remove a WebSocket connection."""
        if patient_id in self.active_connections:
            del self.active_connections[patient_id]
            print(f"WebSocket disconnected for patient {patient_id}")

    async def send_personal_message(self, message: dict, patient_id: str):
        """Send a message to a specific patient's WebSocket."""
        if patient_id in self.active_connections:
            await self.active_connections[patient_id].send_json(message)

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients."""
        for connection in self.active_connections.values():
            await connection.send_json(message)


manager = ConnectionManager()


async def monitor_patient_stream(
    websocket: WebSocket,
    patient_id: str,
    patient_name: str,
    scenario_type: str,
    total_steps: int = 60,
    interval: float = 1.0,
    enable_notifications: bool = True
):
    """
    Stream synthetic patient health readings via WebSocket.

    Args:
        websocket: WebSocket connection
        patient_id: Patient identifier
        patient_name: Patient's actual name
        scenario_type: NORMAL, WARNING, or CRITICAL
        total_steps: Number of readings to generate
        interval: Seconds between readings
        enable_notifications: Whether to send Twilio notifications
    """
    await manager.connect(websocket, patient_id)

    notification_service = NotificationService()
    alert_sent = False  # Track if alert has been sent for this scenario

    try:
        async for reading in synthetic_generator.generate_stream(
            patient_id=patient_id,
            patient_name=patient_name,
            scenario_type=scenario_type,
            total_steps=total_steps,
            interval=interval,
            enable_transition=True
        ):
            # Send reading to client
            await manager.send_personal_message(reading, patient_id)

            # Check for emergency conditions and send notifications (only ONCE per scenario)
            if enable_notifications and not alert_sent:
                if reading['health_status'] in ['WARNING', 'CRITICAL']:
                    print(f"[WebSocket] ALERT DETECTED: {reading['health_status']} for patient {patient_name}")
                    print(f"[WebSocket] Temperature: {reading['temperature']}, HR: {reading['heart_rate']}, SpO2: {reading['spo2']}")

                    # Get database session
                    db = SessionLocal()

                    try:
                        # Send Twilio notification
                        result = await notification_service.send_emergency_alert(
                            patient_id=patient_id,
                            patient_name=patient_name,
                            temperature=reading['temperature'],
                            heart_rate=reading['heart_rate'],
                            spo2=reading['spo2'],
                            alert_level=reading['health_status'],
                            db=db
                        )

                        print(f"[WebSocket] Notification result: {result}")

                        alert_sent = True  # Mark alert as sent so it won't send again

                        # Notify client that alert was sent
                        await manager.send_personal_message({
                            'type': 'alert_sent',
                            'alert_level': reading['health_status'],
                            'timestamp': reading['timestamp']
                        }, patient_id)
                    finally:
                        db.close()

    except WebSocketDisconnect:
        manager.disconnect(patient_id)
    except Exception as e:
        print(f"Error in monitoring stream: {e}")
        manager.disconnect(patient_id)
