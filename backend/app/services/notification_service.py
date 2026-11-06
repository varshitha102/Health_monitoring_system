from sqlalchemy.orm import Session
from app.models.contact import Contact
from app.models.notification import Notification, NotificationStatus, AlertLevel
from app.models.location import PatientLocation
from app.services.twilio_service import twilio_service
from typing import List, Optional
import asyncio


class NotificationService:
    """Service for managing emergency notifications."""

    def __init__(self):
        self.last_alert_time = {}
        self.cooldown_seconds = 60  # Minimum time between alerts

    async def send_emergency_alert(
        self,
        patient_id: str,
        patient_name: str,
        temperature: float,
        heart_rate: int,
        spo2: float,
        alert_level: str,
        db: Session
    ):
        """
        Send emergency SMS to all primary contacts.

        Args:
            patient_id: Patient identifier
            patient_name: Patient's actual name
            temperature: Body temperature
            heart_rate: Heart rate
            spo2: Blood oxygen saturation
            alert_level: WARNING or CRITICAL
            db: Database session
        """
        try:
            # Get all contacts
            contacts = db.query(Contact).all()

            if not contacts:
                print(f"[Notification Service] No contacts found, skipping SMS")
                return {
                    'status': 'no_contacts',
                    'alert_level': alert_level,
                    'message': 'No emergency contacts configured'
                }

            # Get latest patient location
            location = db.query(PatientLocation).filter(
                PatientLocation.patient_id == patient_id
            ).order_by(PatientLocation.timestamp.desc()).first()

            # Generate Google Maps link if location available
            maps_link = None
            location_text = ""
            
            if location:
                maps_link = f"https://www.google.com/maps?q={location.latitude},{location.longitude}"
                location_text = (
                    f"\n\nPATIENT LOCATION:\n"
                    f"{maps_link}\n"
                    f"Coordinates: {location.latitude:.6f}, {location.longitude:.6f}\n"
                    f"Accuracy: {location.accuracy:.0f}m | Updated: {location.timestamp.strftime('%H:%M:%S')}"
                )
            else:
                location_text = (
                    f"\n\nLOCATION: Location data is currently unavailable.\n"
                    f"Ensure location tracking is enabled for real-time location updates."
                )

            # Format message with patient name and location (simplified to avoid carrier rejection)
            if alert_level == 'WARNING':
                message = (
                    f"HEALTH WARNING ALERT\n\n"
                    f"Patient: {patient_name} (ID: {patient_id})\n\n"
                    f"Abnormal Health Readings:\n"
                    f"Temperature: {temperature}C\n"
                    f"Heart Rate: {heart_rate} BPM\n"
                    f"SpO2: {spo2}%"
                    f"{location_text}\n\n"
                    f"Please check on the patient immediately."
                )
            else:  # CRITICAL
                message = (
                    f"CRITICAL EMERGENCY ALERT\n\n"
                    f"Patient: {patient_name} (ID: {patient_id})\n\n"
                    f"CRITICAL Health Readings:\n"
                    f"Temperature: {temperature}C\n"
                    f"Heart Rate: {heart_rate} BPM\n"
                    f"SpO2: {spo2}%"
                    f"{location_text}\n\n"
                    f"IMMEDIATE ACTION REQUIRED:\n"
                    f"Please check on the patient NOW and contact emergency services if necessary."
                )

            # Send SMS to each contact
            results = []
            for contact in contacts:
                print(f"[Notification Service] Processing contact: {contact.name} ({contact.phone_number})")

                # Create notification record with location snapshot
                notification = Notification(
                    patient_id=patient_id,
                    recipient_phone=contact.phone_number,
                    alert_level=AlertLevel.WARNING if alert_level == 'WARNING' else AlertLevel.CRITICAL,
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
                print(f"[Notification Service] Attempting to send SMS to {contact.phone_number}")
                success, message_sid, error_msg, delivery_status = twilio_service.send_sms(
                    to_phone=contact.phone_number,
                    message=message
                )

                print(f"[Notification Service] SMS Result - Success: {success}, SID: {message_sid}, Status: {delivery_status}")

                # Update notification
                notification.twilio_message_sid = message_sid
                notification.delivery_status = delivery_status

                if not success:
                    print(f"[Notification Service] Failed to send SMS to {contact.phone_number}: {error_msg}")

                db.commit()
                db.refresh(notification)

                results.append({
                    'contact_id': contact.id,
                    'phone': contact.phone_number,
                    'success': success,
                    'message_sid': message_sid,
                    'status': delivery_status
                })

            print(f"[Notification Service] Sent {alert_level} alert to {len(contacts)} contacts")

            return {
                'status': 'alert_sent',
                'alert_level': alert_level,
                'contacts_notified': len(contacts),
                'results': results
            }

        except Exception as e:
            print(f"[Notification Service] Error sending alert: {e}")
            return {
                'status': 'error',
                'alert_level': alert_level,
                'error': str(e)
            }
