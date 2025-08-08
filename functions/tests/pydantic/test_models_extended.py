import pytest
from datetime import datetime, timezone
from ksuid import KsuidMs

from _pydantic.models.models_extended import (
    BundleModel,
    ItemModel,
    OrganisationModel,
    EventModel,
    LocationModel,
)
from _pydantic.models.bundles_models import BundleObjectPublic
from _pydantic.models.items_models import ItemObjectPublic
from _pydantic.models.organisation_models import OrganisationObjectPublic

from _pydantic.models.events_models import CategoryEnum, Status as EventStatus
from _pydantic.dynamodb import HistoryModel

import logging
logger = logging.getLogger()
logger.setLevel("INFO")

# --- Fixtures ---

@pytest.fixture
def valid_ksuid():
    return str(KsuidMs())

@pytest.fixture
def dt():
    return datetime(2022, 10, 31, 20, 32, 42, tzinfo=timezone.utc)

# --- Tests for BundleModel ---

def test_bundle_model_properties(valid_ksuid):
    name = "Best Bundle"
    org = "org-demo"
    parent = "evt_123"
    m = BundleModel(
        ksuid=valid_ksuid,
        name=name,
        organisation=org,
        parent_event_ksuid=parent,
    )
    assert m.entity_type == "BUNDLE"
    assert m.PK == f"BUNDLE#{valid_ksuid}"
    assert m.SK == f"EVENT#{parent}"
    assert m.org_slug == "org-demo"
    assert isinstance(m.created_at, (str, datetime))
    assert isinstance(m.updated_at, (str, datetime))
    pub = m.to_public()
    assert isinstance(pub, BundleObjectPublic)
    assert pub.name == name

# -- - Tests for ItemModel ---

def test_item_model_properties(valid_ksuid):
    name = "Lonely Item"
    org = "org-demo"
    parent = "evt_123"
    m = ItemModel(
        ksuid=valid_ksuid,
        name=name,
        organisation=org,
        parent_event_ksuid=parent,
    )
    assert m.entity_type == "ITEM"
    assert m.PK == f"ITEM#{valid_ksuid}"
    assert m.SK == f"EVENT#{parent}"
    assert m.org_slug == "org-demo"
    pub = m.to_public()
    assert isinstance(pub, ItemObjectPublic)
    assert pub.name == name

# --- Tests for OrganisationModel ---

def test_organisation_model_properties(valid_ksuid):
    name = "Org Demo"
    slug = "org-demo"
    m = OrganisationModel(
        ksuid=valid_ksuid,
        name=name,
        organisation=name,
    )
    assert m.entity_type == "ORGANISATION"
    assert m.org_slug == slug
    assert m.PK == f"ORG#{slug}"
    assert m.SK == f"ORG#{slug}"
    assert m.uses_versioning()
    pub = m.to_public()
    assert isinstance(pub, OrganisationObjectPublic)
    assert pub.name == name

# --- Tests for LocationModel ---

def test_location_model_properties(valid_ksuid):
    name = "Some Location"
    org = "org-demo"
    parent = "evt_12345"
    m = LocationModel(
        ksuid=valid_ksuid,
        name=name,
        organisation=org,
        parent_event_ksuid=parent,
    )
    assert m.entity_type == "LOCATION"
    assert m.PK == f"LOCATION#{valid_ksuid}"
    assert m.SK == f"EVENT#{parent}"
    assert m.gsi1PK == f"EVENTLIST#{m.org_slug}"
    assert m.gsi1SK == f"LOCATION#{valid_ksuid}"
    assert m.org_slug == "org-demo"

# --- Tests for EventModel ---

def test_event_model_basic_and_related_entities(valid_ksuid, dt):
    name = "My Birthday"
    org = "org-demo"
    m = EventModel(
        ksuid=valid_ksuid,
        name=name,
        organisation=org,
        starts_at=dt,
        ends_at=dt,
    )
    assert m.entity_type == "EVENT"
    assert m.PK == f"EVENT#{valid_ksuid}"
    assert m.SK == f"EVENT#{valid_ksuid}"
    assert m.gsi1PK == f"EVENTLIST#{m.org_slug}"
    assert m.gsi1SK == f"EVENT#{valid_ksuid}"
    assert m.event_slug == "my-birthday"
    rel = m.related_entities
    assert rel["LOCATION"][2]is LocationModel
    assert rel["HISTORY"][2] is HistoryModel
    assert rel["ITEM"][2] is ItemModel
    assert rel["BUNDLE"][2] is BundleModel

def test_category_field_validator(valid_ksuid, dt):
    ks = valid_ksuid
    m1 = EventModel(
        ksuid=ks,
        name="Your Birthday",
        organisation="org-demo",
        starts_at=dt,
        ends_at=dt,
        category="party",
    )
    assert m1.category == [CategoryEnum.party]
    m2 = EventModel(
        ksuid=ks,
        name="My Mum's Birthday",
        organisation="org-demo",
        starts_at=dt,
        ends_at=dt,
        category=["workshop"],
    )
    assert m2.category == [CategoryEnum.workshop]
    with pytest.raises(ValueError):
        EventModel(
            ksuid=ks,
            name="My Dad's Birthday",
            organisation="org-demo",
            starts_at=dt,
            ends_at=dt,
            category=123,
        )

def test_validate_live_validator(valid_ksuid, dt):
    ks = valid_ksuid
    with pytest.raises(ValueError) as exc:
        EventModel(
            ksuid=ks,
            name="Adam's Birthday",
            organisation="org-demo",
            starts_at=None,
            ends_at=None,
            status=EventStatus.live,
        )
    assert "Cannot publish event:" in str(exc.value)
    m = EventModel(
        ksuid=ks,
        name="Connor's Birthday",
        organisation="org-dmeo",
        starts_at=dt,
        ends_at=dt,
        status=EventStatus.live,
        description="The Best Birthday Ever",
    )
    assert isinstance(m, EventModel)
