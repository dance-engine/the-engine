import json
from datetime import datetime
from typing import List
from enum import Enum

from pydantic import BaseModel, Field

class EventCategory(str, Enum):
    CONGRESS = "congress"
    WORKSHOP = "workshop"
    PARTY = "party"
    CLASS = "class"
    LECTURE = "lecture"

class Location(BaseModel):
    name: str = Field(..., min_length=1, description="Name is required")
    lat: float = Field(..., ge=-90, le=90, description="Latitude must be between -90 and 90")
    lng: float = Field(..., ge=-180, le=180, description="Longitude must be between -180 and 180")

class Event(BaseModel):
    name: str = Field(..., min_length=2, description="The name of the event.")
    description: str = Field(..., min_length=10, description="A brief description of the event.")
    category: List[EventCategory] = Field(..., min_items=1, description="Must have at least one category")
    location: Location = Field(..., description="The event location")
    address: str = Field(..., min_length=5, description="Enter the full event address.")
    capacity: int = Field(default=100, ge=1, description="Maximum number of attendees.")
    date: datetime = Field(..., description="Select the event date.")

with open("event_schema.json", "w") as f:
    main_model_schema = Event.model_json_schema()
    json.dump(main_model_schema, f, indent=2)
