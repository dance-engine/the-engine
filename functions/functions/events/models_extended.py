# models_ext.py
from models_events import EventObject as EventBase, LocationObject as LocationBase
from _shared.dynamodb import DynamoModel

class EventModel(EventBase, DynamoModel):
    organisation: str
    number_sold: int
    created_at: str
    updated_at: str
    entity_type: str = "EVENT"

    def pk(self): return f"EVENT#{self.ksuid}"
    def sk(self): return f"EVENT#{self.ksuid}"
    def gsi1pk(self): return f"EVENTLIST#{self.org_slug}"
    def gsi1sk(self): return f"EVENT#{self.ksuid}"
    def event_slug(self): return self._slugify(self.name)
    def org_slug(self): return self._slugify(self.organisation)

class LocationModel(LocationBase, DynamoModel):
    organisation: str
    parent_event_ksuid: str
    created_at: str
    updated_at: str
    entity_type: str = "LOCATION"

    def pk(self): return f"LOCATION#{self.ksuid}"
    def sk(self): return f"EVENT#{self.parent_event_ksuid}"
    def gsi1pk(self): return f"EVENTLIST#{self.org_slug}"
    def gsi1sk(self): return f"LOCATION#{self.ksuid}"
    def org_slug(self): return self._slugify(self.organisation)
