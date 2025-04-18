# models_ext.py
from models_events import EventObject as EventBase, LocationObject as LocationBase
from _shared.dynamodb import DynamoModel

class EventModel(EventBase, DynamoModel):
    organisation: str
    number_sold: int
    created_at: str
    updated_at: str
    entity_type: str = "EVENT"

    @property
    def pk(self): return f"EVENT#{self.ksuid}"

    @property
    def sk(self): return f"EVENT#{self.ksuid}"

    @property
    def gsi1PK(self): return f"EVENTLIST#{self.org_slug}"

    @property
    def gsi1SK(self): return f"EVENT#{self.ksuid}"

    @property
    def event_slug(self): return self._slugify(self.name)

    @property
    def org_slug(self): return self._slugify(self.organisation)

class LocationModel(LocationBase, DynamoModel):
    organisation: str
    parent_event_ksuid: str
    created_at: str
    updated_at: str
    entity_type: str = "LOCATION"

    @property
    def pk(self): return f"LOCATION#{self.ksuid}"

    @property
    def sk(self): return f"EVENT#{self.parent_event_ksuid}"
    
    @property
    def gsi1PK(self): return f"EVENTLIST#{self.org_slug}"
    
    @property
    def gsi1SK(self): return f"LOCATION#{self.ksuid}"
    
    @property
    def org_slug(self): return self._slugify(self.organisation)
