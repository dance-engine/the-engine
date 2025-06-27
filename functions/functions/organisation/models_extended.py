from models_organisation import OrganisationObject as OrganisationBase, Status
from _shared.dynamodb import DynamoModel
from datetime import datetime, timezone

class OrganisationModel(OrganisationBase, DynamoModel):
    organisation: str
    created_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    updated_at: datetime = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    entity_type: str = "ORG"

    @property
    def PK(self): return f"ORG#{self.ksuid}"

    @property
    def SK(self): return f"ORG#{self.ksuid}"

    @property
    def org_slug(self): return self._slugify(self.organisation)