from _pydantic.models.bundles_models import BundleObject as BundleBase, BundleObjectPublic
from _pydantic.models.items_models import ItemObject as ItemBase, ItemObjectPublic
from _pydantic.models.organisation_models import OrganisationObject as OrganisationBase, Status as OrganisationStatus, OrganisationObjectPublic
from _pydantic.models.events_models import EventObject as EventBase, LocationObject as LocationBase, Status as EventStatus, EventObjectPublic
from _pydantic.dynamodb import DynamoModel, HistoryModel
from datetime import datetime, timezone
from pydantic import model_validator, field_validator

class BundleModel(BundleBase, DynamoModel):
    organisation: str
    parent_event_ksuid: str
    created_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    updated_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    
    @property
    def entity_type(self): return "BUNDLE"

    @property
    def PK(self): return f"BUNDLE#{self.ksuid}"

    @property
    def SK(self): return f"EVENT#{self.parent_event_ksuid}"

    @property
    def org_slug(self): return self._slugify(self.organisation)

    def to_public(self) -> 'BundleObjectPublic':
        return BundleObjectPublic.model_validate(self.model_dump(include=BundleObjectPublic.model_fields.keys()))

class ItemModel(ItemBase, DynamoModel):
    ksuid: str
    organisation: str
    parent_event_ksuid: str
    created_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    updated_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    
    @property
    def entity_type(self): return "ITEM"

    @property
    def PK(self): return f"ITEM#{self.ksuid}"

    @property
    def SK(self): return f"EVENT#{self.parent_event_ksuid}"

    @property
    def org_slug(self): return self._slugify(self.organisation)

    def to_public(self) -> 'ItemObjectPublic':
        return ItemObjectPublic.model_validate(self.model_dump(include=ItemObjectPublic.model_fields.keys()))

class OrganisationModel(OrganisationBase, DynamoModel):
    organisation: str
    created_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    updated_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    version: int = 0
    
    @property
    def entity_type(self): return "ORGANISATION"

    @property
    def PK(self): return f"ORG#{self.org_slug}"

    @property
    def SK(self): return f"ORG#{self.org_slug}"

    @property
    def org_slug(self): return self._slugify(self.organisation)
    
    def to_public(self) -> 'OrganisationObjectPublic':
        return OrganisationObjectPublic.model_validate(self.model_dump(include=OrganisationObjectPublic.model_fields.keys()))    

class EventModel(EventBase, DynamoModel):
    organisation: str
    number_sold: int = 0
    created_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    updated_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    remaining_capacity: int = 0
    reserved: int = 0

    @property
    def related_entities(self):
        return {
            "LOCATION": ("location", "single", LocationModel),
            "HISTORY": ("history", "list", HistoryModel),
            "ITEM": ("items", "list", ItemModel),
            "BUNDLE": ("bundles", "list", BundleModel),
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
        if self.status == EventStatus.live:
            REQUIRED_FIELDS_FOR_LIVE = ["name", "description", "starts_at", "ends_at", "capacity"]
            missing = []

            for field in REQUIRED_FIELDS_FOR_LIVE:
                value = self.__getattribute__(field) if field in self.model_fields.keys() else None
                if not value:
                    missing.append(field)

            if missing:
                raise ValueError(f"Cannot publish event: missing required field(s): {', '.join(missing)}")
        return self

    def to_public(self) -> 'EventObjectPublic':
        return EventObjectPublic.model_validate(self.model_dump(include=EventObjectPublic.model_fields.keys()))

class LocationModel(LocationBase, DynamoModel):
    organisation: str
    parent_event_ksuid: str
    created_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    updated_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    
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
