# generated by datamodel-codegen:
#   filename:  <stdin>
#   timestamp: 2025-07-14T13:39:23+00:00

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Status(Enum):
    i_am_teapot = 'i-am-teapot'
    draft = 'draft'
    active = 'active'
    setup = 'setup'
    suspended = 'suspended'
    archived = 'archived'


class OrganisationObject(BaseModel):
    status: Optional[Status] = 'draft'
    ksuid: Optional[str] = Field(None, description='ID of the organisation')
    organisation: Optional[str] = Field(
        None, description='Short slug used to represent the org'
    )
    name: str = Field(..., description='The name of the organisation.', min_length=2)
    banner: Optional[str] = Field(
        None, description='URL to the banner image for the organisation'
    )
    logo: Optional[str] = Field(
        None, description='URL to the logo image for the organisation'
    )
    css_vars: Optional[str] = Field(
        None,
        description='CSS variables for the organisation used to customise SOLO templates',
    )
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    version: Optional[int] = None
    history: Optional[List[Dict[str, Any]]] = None


class OrganisationResponse(BaseModel):
    organisation: Optional[OrganisationObject] = None


class UpdateOrganisationRequest(BaseModel):
    organisation: OrganisationObject
