from fastapi import APIRouter, Depends, HTTPException, Request, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.notification import Notification
from app.services.twilio_service import twilio_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/twilio", tags=["twilio"])


@router.post("/status-callback")
async def status_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint for Twilio status callbacks.
    Twilio calls this endpoint when the message status changes.
    """
    # Parse form data from Twilio
    form_data = await request.form()

    message_sid = form_data.get("MessageSid")
    message_status = form_data.get("MessageStatus")
    to_phone = form_data.get("To")

    if not message_sid or not message_status:
        logger.warning("Status callback missing required fields")
        return {"status": "error", "message": "Missing required fields"}

    logger.info(f"Status callback: SID={message_sid}, Status={message_status}, To={to_phone}")

    # Find notification by Twilio message SID
    notification = db.query(Notification).filter(
        Notification.twilio_message_sid == message_sid
    ).first()

    if not notification:
        logger.warning(f"Notification not found for message SID: {message_sid}")
        return {"status": "error", "message": "Notification not found"}

    # Update delivery status
    new_status = twilio_service.parse_twilio_status(message_status)
    notification.delivery_status = new_status

    db.commit()
    db.refresh(notification)

    logger.info(f"Updated notification {notification.id} status to {new_status}")

    # Return XML response for Twilio
    return {"status": "success", "message": "Status updated"}
