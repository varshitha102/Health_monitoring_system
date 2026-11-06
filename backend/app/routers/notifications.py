from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.database import get_db
from app.models.notification import Notification, NotificationStatus, AlertLevel
from app.models.contact import Contact
from app.models.location import PatientLocation
from app.schemas.alert import AlertRequest, AlertResponse, NotificationResponse
from app.services.twilio_service import twilio_service
from app.utils.phone_validation import mask_phone_number

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class LocationShareRequest(BaseModel):
    patient_id: str
    patient_name: str
    latitude: float
    longitude: float
    accuracy: float


def format_alert_message(
    alert_level: AlertLevel, 
    temperature: float, 
    heart_rate: int, 
    spo2: int,
    patient_name: str,
    patient_id: str,
    location = None
) -> str:
    """
    Format alert message based on alert level and health readings.
    """
    # Add location information if available
    location_text = ""
    if location:
        maps_link = f"https://www.google.com/maps?q={location.latitude},{location.longitude}"
        location_text = (
            f"\n\n📍 PATIENT LOCATION:\n"
            f"{maps_link}\n"
            f"Click the link above to get directions to the patient's location.\n"
            f"Coordinates: {location.latitude:.6f}, {location.longitude:.6f}\n"
            f"Accuracy: {location.accuracy:.0f}m | Updated: {location.timestamp.strftime('%H:%M:%S')}"
        )
    else:
        location_text = (
            f"\n\n📍 LOCATION: Location data is currently unavailable.\n"
            f"Ensure location tracking is enabled for real-time location updates."
        )

    if alert_level == AlertLevel.WARNING:
        return (
            f"⚠️ HEALTH WARNING ALERT\n\n"
            f"Patient: {patient_name} (ID: {patient_id})\n\n"
            f"Abnormal Health Readings:\n"
            f"Temperature: {temperature}°C\n"
            f"Heart Rate: {heart_rate} BPM\n"
            f"SpO2: {spo2}%"
            f"{location_text}\n\n"
            f"Please check on the patient immediately."
        )
    else:  # CRITICAL
        return (
            f"🚨 CRITICAL EMERGENCY ALERT\n\n"
            f"Patient: {patient_name} (ID: {patient_id})\n\n"
            f"CRITICAL Health Readings:\n"
            f"Temperature: {temperature}°C\n"
            f"Heart Rate: {heart_rate} BPM\n"
            f"SpO2: {spo2}%"
            f"{location_text}\n\n"
            f"⚠️ IMMEDIATE ACTION REQUIRED:\n"
            f"Please check on the patient NOW and contact emergency services if necessary."
        )


@router.post("/send-alert", response_model=List[AlertResponse])
def send_alert(
    alert: AlertRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Send emergency alert SMS to specified contacts.
    """
    # Validate that contact IDs exist
    contacts = db.query(Contact).filter(Contact.id.in_(alert.contact_ids)).all()
    if not contacts:
        raise HTTPException(status_code=404, detail="No valid contacts found")

    if len(contacts) != len(alert.contact_ids):
        raise HTTPException(status_code=404, detail="One or more contacts not found")

    # Get latest patient location
    location = db.query(PatientLocation).filter(
        PatientLocation.patient_id == alert.patient_id
    ).order_by(PatientLocation.timestamp.desc()).first()

    # Format alert message with location
    message = format_alert_message(
        alert.alert_level,
        alert.temperature,
        alert.heart_rate,
        alert.spo2,
        alert.patient_name or "Patient",
        alert.patient_id,
        location
    )

    responses = []

    for contact in contacts:
        # Create notification record with CREATING status and location snapshot
        notification = Notification(
            patient_id=alert.patient_id,
            recipient_phone=contact.phone_number,
            alert_level=alert.alert_level,
            message_content=message,
            delivery_status=NotificationStatus.CREATING,
            contact_id=contact.id,
            location_latitude=location.latitude if location else None,
            location_longitude=location.longitude if location else None,
            location_accuracy=location.accuracy if location else None,
            location_timestamp=location.timestamp if location else None,
            location_available=1 if location else 0
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)

        # Send SMS via Twilio
        success, message_sid, error_msg, delivery_status = twilio_service.send_sms(
            to_phone=contact.phone_number,
            message=message
        )

        # Update notification based on result
        notification.twilio_message_sid = message_sid
        notification.delivery_status = delivery_status

        if not success:
            # Log error but still return the notification
            print(f"Failed to send SMS to {contact.phone_number}: {error_msg}")

        db.commit()
        db.refresh(notification)

        # Mask phone number for response
        masked_phone = mask_phone_number(contact.phone_number)

        responses.append(AlertResponse(
            notification_id=notification.id,
            recipient_phone=masked_phone,
            alert_level=notification.alert_level,
            message_content=notification.message_content,
            twilio_message_sid=notification.twilio_message_sid,
            delivery_status=notification.delivery_status,
            created_at=notification.created_at
        ))

    return responses


@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    patient_id: str = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get notification history. Optionally filter by patient ID.
    """
    query = db.query(Notification)

    if patient_id:
        query = query.filter(Notification.patient_id == patient_id)

    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()

    # Mask phone numbers for all notifications
    for notification in notifications:
        notification.recipient_phone = mask_phone_number(notification.recipient_phone)

    return notifications


@router.get("/{notification_id}", response_model=NotificationResponse)
def get_notification(notification_id: int, db: Session = Depends(get_db)):
    """
    Get a specific notification by ID.
    """
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Mask phone number
    notification.recipient_phone = mask_phone_number(notification.recipient_phone)

    return notification


@router.post("/send-location")
def send_location_to_contacts(
    location_data: LocationShareRequest,
    db: Session = Depends(get_db)
):
    """
    Send current location to all emergency contacts.
    """
    # Get all contacts
    contacts = db.query(Contact).all()

    if not contacts:
        raise HTTPException(status_code=404, detail="No emergency contacts configured")

    # Generate Google Maps link
    google_maps_url = f"https://www.google.com/maps?q={location_data.latitude},{location_data.longitude}"
    
    # Format location message
    message = (
        f"📍 LIVE LOCATION UPDATE\n\n"
        f"Patient: {location_data.patient_name}\n"
        f"Patient ID: {location_data.patient_id}\n\n"
        f"Current Location:\n"
        f"{google_maps_url}\n\n"
        f"Coordinates:\n"
        f"Latitude: {location_data.latitude:.6f}\n"
        f"Longitude: {location_data.longitude:.6f}\n"
        f"Accuracy: {location_data.accuracy:.0f}m\n\n"
        f"Click the link above to get directions to the patient's location."
    )

    responses = []

    for contact in contacts:
        # Create notification record
        notification = Notification(
            patient_id=location_data.patient_id,
            recipient_phone=contact.phone_number,
            alert_level=AlertLevel.WARNING,  # Use WARNING for location shares
            message_content=message,
            delivery_status=NotificationStatus.CREATING,
            contact_id=contact.id,
            location_latitude=location_data.latitude,
            location_longitude=location_data.longitude,
            location_accuracy=location_data.accuracy,
            location_timestamp=None,  # Current time will be used
            location_available=1
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)

        # Send SMS via Twilio
        success, message_sid, error_msg, delivery_status = twilio_service.send_sms(
            to_phone=contact.phone_number,
            message=message
        )

        # Update notification based on result
        notification.twilio_message_sid = message_sid
        notification.delivery_status = delivery_status

        if not success:
            print(f"Failed to send location SMS to {contact.phone_number}: {error_msg}")

        db.commit()
        db.refresh(notification)

        # Mask phone number for response
        masked_phone = mask_phone_number(contact.phone_number)

        responses.append({
            "contact": contact.name,
            "phone": masked_phone,
            "status": "sent" if success else "failed",
            "message_sid": message_sid
        })

    return {
        "status": "success",
        "message": f"Location sent to {len(responses)} emergency contacts",
        "contacts": responses
    }
