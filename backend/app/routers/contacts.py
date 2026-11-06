from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse
from app.utils.phone_validation import validate_e164_phone_number

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.post("/", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(contact: ContactCreate, db: Session = Depends(get_db)):
    """
    Create a new emergency contact.
    """
    # Validate phone number
    is_valid, error_msg = validate_e164_phone_number(contact.phone_number)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Check if phone number already exists
    existing_contact = db.query(Contact).filter(
        Contact.phone_number == contact.phone_number
    ).first()
    if existing_contact:
        raise HTTPException(
            status_code=400,
            detail="Contact with this phone number already exists"
        )

    # If setting as primary, unset other primary contacts
    if contact.is_primary:
        db.query(Contact).update({Contact.is_primary: False})

    # Create new contact
    db_contact = Contact(**contact.model_dump())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)

    return db_contact


@router.get("/", response_model=List[ContactResponse])
def get_contacts(db: Session = Depends(get_db)):
    """
    Get all emergency contacts.
    """
    contacts = db.query(Contact).order_by(Contact.is_primary.desc(), Contact.created_at.desc()).all()
    return contacts


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    """
    Get a specific emergency contact by ID.
    """
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(contact_id: int, contact_update: ContactUpdate, db: Session = Depends(get_db)):
    """
    Update an existing emergency contact.
    """
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Validate phone number if provided
    if contact_update.phone_number:
        is_valid, error_msg = validate_e164_phone_number(contact_update.phone_number)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)

        # Check if phone number already exists (excluding current contact)
        existing_contact = db.query(Contact).filter(
            Contact.phone_number == contact_update.phone_number,
            Contact.id != contact_id
        ).first()
        if existing_contact:
            raise HTTPException(
                status_code=400,
                detail="Contact with this phone number already exists"
            )

    # If setting as primary, unset other primary contacts
    if contact_update.is_primary:
        db.query(Contact).filter(Contact.id != contact_id).update({Contact.is_primary: False})

    # Update contact fields
    update_data = contact_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)

    db.commit()
    db.refresh(contact)

    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    """
    Delete an emergency contact.
    """
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    db.delete(contact)
    db.commit()

    return None
