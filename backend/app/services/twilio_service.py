from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from app.config import get_settings
from app.models.notification import NotificationStatus
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class TwilioService:
    def __init__(self):
        self.settings = get_settings()
        self.client = None

        if not self.settings.mock_mode:
            try:
                self.client = Client(
                    self.settings.twilio_account_sid,
                    self.settings.twilio_auth_token
                )
                logger.info("Twilio client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
                self.client = None

    def send_sms(
        self,
        to_phone: str,
        message: str
    ) -> Tuple[bool, Optional[str], Optional[str], Optional[str]]:
        """
        Send SMS message via Twilio.

        Args:
            to_phone: Recipient phone number in E.164 format
            message: SMS message content

        Returns:
            Tuple of (success, message_sid, error_message, delivery_status)
        """
        if self.settings.mock_mode:
            # Mock mode for development/testing
            logger.info(f"[MOCK] Sending SMS to {to_phone}: {message}")
            mock_sid = f"MOCK_{to_phone}_{hash(message)}"
            return True, mock_sid, None, NotificationStatus.SENT

        if not self.client:
            error_msg = "Twilio client not initialized. Check credentials."
            logger.error(error_msg)
            return False, None, error_msg, NotificationStatus.FAILED

        try:
            message_obj = self.client.messages.create(
                body=message,
                from_=self.settings.twilio_phone_number,
                to=to_phone
            )
            logger.info(f"SMS sent successfully. SID: {message_obj.sid}, Status: {message_obj.status}")
            # Mark as SENT immediately since we're not using delivery status webhooks
            return True, message_obj.sid, None, NotificationStatus.SENT

        except TwilioRestException as e:
            error_msg = f"Twilio API error: {e.msg}"
            logger.error(error_msg)
            return False, None, error_msg, NotificationStatus.FAILED

        except Exception as e:
            error_msg = f"Unexpected error sending SMS: {str(e)}"
            logger.error(error_msg)
            return False, None, error_msg, NotificationStatus.FAILED

    def parse_twilio_status(self, twilio_status: str) -> NotificationStatus:
        """
        Map Twilio message status to our NotificationStatus enum.

        Args:
            twilio_status: Twilio message status string

        Returns:
            NotificationStatus enum value
        """
        status_mapping = {
            'queued': NotificationStatus.SENDING,
            'sending': NotificationStatus.SENDING,
            'sent': NotificationStatus.SENT,
            'delivered': NotificationStatus.SENT,
            'undelivered': NotificationStatus.FAILED,
            'failed': NotificationStatus.FAILED,
        }

        return status_mapping.get(twilio_status.lower(), NotificationStatus.FAILED)


# Singleton instance
twilio_service = TwilioService()
