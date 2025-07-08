# models_ext.py
from models_events import EventObject as EventBase, LocationObject as LocationBase, Status, EventObjectPublic
from _shared.dynamodb import DynamoModel, HistoryModel
from datetime import datetime, timezone
from typing import ClassVar
from pydantic import model_validator, field_validator

class EventModel(EventBase, DynamoModel):
    location: ClassVar[None] = None
    organisation: str
    number_sold: int = 0
    created_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    updated_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

    @property
    def related_entities(self):
        return {
            "LOCATION": ("location", "single", LocationModel),
            "HISTORY": ("history", "list", HistoryModel) 
            }
    
    @property
    def entity_type(self): return f"EVENT"

    @property
    def PK(self): return f"EVENT#{self.ksuid}"

    @property
    def SK(self): return f"EVENT#{self.ksuid}"

    @property
    def gsi1PK(self): return f"EVENTLIST#{self.org_slug}"

    @property
    def gsi1SK(self): return f"EVENT#{self.ksuid}"

    @property
    def event_slug(self): return self._slugify(self.name)

    @property
    def org_slug(self): return self._slugify(self.organisation)

    @field_validator('category', mode='before')
    @classmethod
    def ensure_list_of_enums(cls, v):
        if isinstance(v, str):
            return [v]
        if isinstance(v, list):
            return v
        raise ValueError('Invalid category format')

    @model_validator(mode="after")
    def validate_live(self) -> 'EventModel':
        if self.status == Status.live:
            REQUIRED_FIELDS_FOR_LIVE = ["name", "description", "starts_at", "ends_at"]
            missing = []

            for field in REQUIRED_FIELDS_FOR_LIVE:
                value = self.__getattribute__(field) if field in self.model_fields.keys() else None
                if not value:
                    missing.append(field)

            if missing:
                raise ValueError(f"Cannot publish event: missing required field(s): {', '.join(missing)}")
        return self

class LocationModel(LocationBase, DynamoModel):
    organisation: str
    parent_event_ksuid: str
    created_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    updated_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    entity_type: str = "LOCATION"
    @property
    def entity_type(self): return "LOCATION"

    @property
    def PK(self): return f"LOCATION#{self.ksuid}"

    @property
    def SK(self): return f"EVENT#{self.parent_event_ksuid}"
    
    @property
    def gsi1PK(self): return f"EVENTLIST#{self.org_slug}"
    
    @property
    def gsi1SK(self): return f"LOCATION#{self.ksuid}"
    
    @property
    def org_slug(self): return self._slugify(self.organisation)
