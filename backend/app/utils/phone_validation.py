import re
from typing import Optional


def validate_e164_phone_number(phone_number: str) -> tuple[bool, Optional[str]]:
    """
    Validate phone number in E.164 format.

    Args:
        phone_number: Phone number string to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not phone_number:
        return False, "Phone number is required"

    # Must start with +
    if not phone_number.startswith('+'):
        return False, "Phone number must be in E.164 format (start with +)"

    # Remove the + and check remaining characters
    number_without_plus = phone_number[1:]

    # Must contain only digits after the +
    if not number_without_plus.isdigit():
        return False, "Phone number must contain only digits after the +"

    # Length validation (E.164 allows max 15 digits for country code + number)
    if len(number_without_plus) < 7 or len(number_without_plus) > 15:
        return False, "Phone number must be between 7 and 15 digits (excluding +)"

    return True, None


def mask_phone_number(phone_number: str) -> str:
    """
    Mask phone number for display purposes.

    Args:
        phone_number: Phone number in E.164 format

    Returns:
        Masked phone number (e.g., +1234567890 -> +******7890)
    """
    if len(phone_number) <= 4:
        return phone_number

    # Keep country code and last 4 digits
    masked = phone_number[:3] + "*" * (len(phone_number) - 7) + phone_number[-4:]
    return masked
