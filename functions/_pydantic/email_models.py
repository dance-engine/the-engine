from dataclasses import dataclass
from enum import Enum

from pydantic import BaseModel, EmailStr

class EmailTemplates(int, Enum):
    """Email templates for various notification types."""
    ticket_dynamic = 2

class JobTypes(str, Enum):
    send_ticket_email = "send_ticket_email"

class EmailRecipient(BaseModel):
    email: EmailStr
    name: str

class EmailJob(BaseModel):
    job_type: JobTypes
    job_id: str
    organisation: str
    template: EmailTemplates
    send_reason: str
    recipient: EmailRecipient
    idempotency_key: str
    correlation_id: str
    params: dict