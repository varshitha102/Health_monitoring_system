from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class ContactBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Contact name")
    phone_number: str = Field(..., description="Phone number in E.164 format (e.g., +1234567890)")
    is_primary: bool = False

    @validator('phone_number')
    def validate_phone_number(cls, v):
        if not v.startswith('+'):
            raise ValueError('Phone number must be in E.164 format (start with +)')
        if len(v) < 8 or len(v) > 20:
            raise ValueError('Phone number must be between 8 and 20 characters')
        # Basic validation - can be enhanced with phonenumbers library
        digits = ''.join(filter(str.isdigit, v))
        if len(digits) < 7:
            raise ValueError('Phone number must have at least 7 digits')
        return v


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone_number: Optional[str] = Field(None, description="Phone number in E.164 format")
    is_primary: Optional[bool] = None

    @validator('phone_number')
    def validate_phone_number(cls, v):
        if v is not None:
            if not v.startswith('+'):
                raise ValueError('Phone number must be in E.164 format (start with +)')
            if len(v) < 8 or len(v) > 20:
                raise ValueError('Phone number must be between 8 and 20 characters')
            digits = ''.join(filter(str.isdigit, v))
            if len(digits) < 7:
                raise ValueError('Phone number must have at least 7 digits')
        return v


class ContactResponse(ContactBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
