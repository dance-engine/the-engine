import pytest
from unittest.mock import MagicMock
from datetime import datetime, timezone
from decimal import Decimal
from ksuid import KsuidMs
from typing import Any, Dict, List, Optional

from _pydantic.dynamodb import (
    convert_datetime_to_iso_8601_with_z_suffix,
    convert_floats_to_decimals,
    DynamoModel,
    VersionConflictError,
    HistoryModel,
    batch_write,
    transact_upsert,
)
from _pydantic.EventBridge import Action, EventType
import logging

logger = logging.getLogger()
logger.setLevel("INFO")

# --- Fixtures ---
class SimpleModel(DynamoModel):
    ksuid: str
    foo: int
    bar: float
    timestamp: datetime

    @property
    def entity_type(self):
        return 'SIMPLE'
    @property
    def PK(self):
        return f'SIMPLE#{self.ksuid}'
    @property
    def SK(self):
        return f'OTHER#{self.foo}'
    @property
    def gsi1PK(self):
        return None
    @property
    def gsi1SK(self):
        return None
    
class RelatedOneModel(SimpleModel):
    @property
    def entity_type(self):
        return 'RELATEDONE'
class RelatedEntitiesSingleModel(SimpleModel):
    related: Optional[RelatedOneModel] = None

    @property
    def related_entities(self):
        return {
            'RELATEDONE': ('related', 'single', RelatedOneModel)
        }
    
class RelatedsModel(SimpleModel):
    @property
    def entity_type(self):
        return 'RELATEDS'
class RelatedEntitiesListModel(SimpleModel):
    relateds: Optional[List[Dict[str, Any]]] = None

    @property
    def related_entities(self):
        return {
            'RELATEDS': ('relateds', 'list', RelatedsModel)
        }
     
class RelatedEntitiesMixedModel(SimpleModel):
    relateds: Optional[List[Dict[str, Any]]] = None
    related: Optional[RelatedOneModel] = None

    @property
    def related_entities(self):
        return {
        'RELATEDONE': ('related', 'single', RelatedOneModel),
        'RELATEDS': ('relateds', 'list', RelatedsModel)
        }    

@pytest.fixture
def valid_ksuid():
    valid_ksuid = str(KsuidMs())
    return valid_ksuid

@pytest.fixture
def model_instance(valid_ksuid):
    dt = datetime(2022, 10, 31, 20, 32, 42, tzinfo=timezone.utc)
    m = SimpleModel(ksuid=valid_ksuid, foo=42, bar=3.14, timestamp=dt)
    return m

@pytest.fixture
def dt():
    return datetime(2022, 10, 31, 20, 32, 42, tzinfo=timezone.utc)

# --- Test Cases ---

def test_convert_datetime_to_iso_with_timezone():
    dt = datetime(2022, 10, 31, 20, 32, 42, tzinfo=timezone.utc)
    result = convert_datetime_to_iso_8601_with_z_suffix(dt)
    assert result == "2022-10-31T20:32:42Z"

def test_convert_datetime_to_iso_with_naive_datetime():
    dt = datetime(2022, 10, 31, 20, 0, 0)
    result = convert_datetime_to_iso_8601_with_z_suffix(dt)
    assert result == "2022-10-31T20:00:00Z"

def test_convert_datetime_to_iso_with_string_z():
    dt_str = "2025-08-06T12:00:00Z"
    result = convert_datetime_to_iso_8601_with_z_suffix(dt_str)
    assert result == "2025-08-06T12:00:00Z"

def test_convert_datetime_to_iso_with_string_offset():
    dt_str = "2025-08-06T12:00:00+00:00"
    result = convert_datetime_to_iso_8601_with_z_suffix(dt_str)
    assert result == "2025-08-06T12:00:00Z"

def test_convert_datetime_to_iso_with_string_space():
    dt_str = "2025-08-06 12:00:00"
    result = convert_datetime_to_iso_8601_with_z_suffix(dt_str)
    assert result == "2025-08-06T12:00:00Z"

@pytest.mark.parametrize("bad_input", [
    "not-a-date",
    "2025-13-01T00:00:00Z",  # Invalid month
    12345,
    None,
    {},
    [],
])
def  test_convert_datetime_to_iso_raise_value_error(bad_input):
    with pytest.raises(ValueError):
        convert_datetime_to_iso_8601_with_z_suffix(bad_input)

def test_convert_floats_to_decimals_with_single_float():
    assert convert_floats_to_decimals(1.23) == Decimal('1.23')

@pytest.mark.parametrize("val", [
    "hello", 123, None, [], {}, True, False, Decimal('1.23')
])
def test_convert_floats_to_decimals_no_change(val):
    assert convert_floats_to_decimals(val) == val

def test_convert_floats_to_decimals_with_dict_float():
    data = {"price": 9.99}
    result = convert_floats_to_decimals(data)
    assert result["price"] == Decimal('9.99')

def test_convert_floats_to_decimals__wtih_list_with_floats_and_other_types():
    data = [1.1, 2, "test", 3.3, True]
    result = convert_floats_to_decimals(data)
    assert result == [Decimal("1.1"), 2, "test", Decimal("3.3"), True]

def test_convert_floats_to_decimals_with_dict_and_other_types():
    data = {"name": "item", "price": 19.99, "category": ["new", "thing"], "available": True}
    result = convert_floats_to_decimals(data)
    assert result["price"] == Decimal('19.99')
    assert result["name"] == "item"
    assert result["available"] == True
    assert result["category"] == ["new", "thing"]

def test_convert_floats_to_decimals_with_nested_structure():
    data = {
        "items": [
            {"price": 1.5, "name": "this"},
            {"price": 2.25, "name": "that"}
        ],
        "total": 3.75
    }
    result = convert_floats_to_decimals(data)
    assert result["items"][0]["price"] == Decimal("1.5")
    assert result["items"][1]["price"] == Decimal("2.25")
    assert result["total"] == Decimal("3.75")

# -- DynamoModel Tests --

@pytest.mark.parametrize("ksuid", [str(KsuidMs()), KsuidMs()])
def test_validate_ksuid(ksuid):
    assert DynamoModel.validate_ksuid(ksuid) == ksuid

@pytest.mark.parametrize("invalid_ksuid", ["not-a-ksuid", "", {}, []])
def test_validate_ksuid_invalid(invalid_ksuid):
    with pytest.raises(ValueError):
        DynamoModel.validate_ksuid(invalid_ksuid)

def test_validate_ksuid_with_none():
    assert DynamoModel.validate_ksuid(None) == None

@pytest.mark.parametrize("name, expected", [
    ("The Organisation", "the-organisation"),
    ("    space    org     ", "space-org"),
    ("Org@#2024!!", "org-2024"),
    ("Café☕️", "caf"),
    ("@@", ""),
    ("", ""),
    ("Org123", "org123"),
    ("Org-Name", "org-name"),
    ("Org_Name", "org-name"),
    ("Org.Name", "org-name"),
    ("Org/Name", "org-name"),
    ("Org\\Name", "org-name"),
    ("Org@Name", "org-name"),
    ("Org#Name", "org-name"),
    ("Org$Name", "org-name"),
    ("Org%Name", "org-name"),
    ("Org^Name", "org-name"),
    ("Org&Name", "org-name"),
    ("Org*Name", "org-name"),
    ("Org(Name)", "org-name"),
    ("Org[Name]", "org-name"),
    ("Org{Name}", "org-name"),
])
def test_slugify(name, expected):
    m = DynamoModel()
    slug = m._slugify(name)
    assert slug == expected

def test_uses_versioning_with_no_version():
    m = DynamoModel()
    assert not m.uses_versioning()
    
def test_uses_versioning_with_version():
    class V(DynamoModel):
        version: int = 1
    
    assert V(version=1).uses_versioning()

def test_to_dynamo_with_exclude_keys_true(model_instance):
    d = model_instance.to_dynamo()
    
    assert d['foo'] == 42
    assert isinstance(d['bar'], Decimal)
    assert d['bar'] == Decimal('3.14')
    assert d['timestamp'] == '2022-10-31T20:32:42Z'
    assert d['entity_type'] == 'SIMPLE'
    assert 'PK' not in d and 'SK' not in d

def test_to_dynamo_with_exclude_keys_false(model_instance, valid_ksuid):
    d = model_instance.to_dynamo(exclude_keys=False)
    
    assert d['PK'] == f'SIMPLE#{valid_ksuid}'
    assert d['SK'] == f'OTHER#42'
    assert d['entity_type'] == 'SIMPLE'

def test_upsert_builds_expression(model_instance):
    mock_table = MagicMock()
    mock_table.update_item.return_value = True

    resp = model_instance.upsert(mock_table)
    assert mock_table.update_item.called
    called_kwargs = mock_table.update_item.call_args[1]
    assert "PK" in called_kwargs['Key']
    assert "SK" in called_kwargs['Key']
    assert "SET" in called_kwargs['UpdateExpression']
    assert called_kwargs['Key']['PK'] == model_instance.PK

def test_upsert_without_versioning(valid_ksuid, dt):
    m = SimpleModel(ksuid=valid_ksuid, foo=42, bar=1.23, timestamp=dt)
    mock_table = MagicMock()
    mock_table.update_item.return_value = True

    resp = m.upsert(mock_table)
    assert mock_table.update_item.called
    called_kwargs = mock_table.update_item.call_args[1]
    assert 'ConditionExpression' not in called_kwargs
    # ensure no version placeholders
    assert all(not name.endswith('version') for name in called_kwargs.get('ExpressionAttributeNames', {}))
    assert all(not name.endswith('incoming_version') for name in called_kwargs.get('ExpressionAttributeValues', {}))

def test_upsert_version_conflict(valid_ksuid):
    class VersionedModel(SimpleModel):
        version: int = 1

    m = VersionedModel(ksuid=valid_ksuid, foo=1, bar=2.0, timestamp=datetime.now(timezone.utc), version=1)
    mock_table = MagicMock()
    # ConditionalCheckFailedException on table
    class CCF(Exception):
        pass
    mock_table.meta.client.exceptions.ConditionalCheckFailedException = CCF
    mock_table.update_item.side_effect = CCF()

    with pytest.raises(VersionConflictError) as exc:
        m.upsert(mock_table)
    assert valid_ksuid in str(exc.value)

def test_upsert_only_set_once(model_instance):
    # verify that only_set_once uses if_not_exists
    mock_table = MagicMock()
    mock_table.update_item.return_value = {}

    resp = model_instance.upsert(mock_table, only_set_once=['foo', 'bar'])
    kwargs = mock_table.update_item.call_args[1]

    # UpdateExpression should use if_not_exists on foo and bar
    UpdateExpression = kwargs['UpdateExpression']
    assert '#foo = if_not_exists(#foo, :foo)' in UpdateExpression
    assert '#bar = if_not_exists(#bar, :bar)' in UpdateExpression

    # ExpressionAttributeNames and Values should include placeholders for foo/bar
    names = kwargs['ExpressionAttributeNames']
    values = kwargs['ExpressionAttributeValues']
    assert '#foo' in names and names['#foo'] == 'foo'
    assert ':foo' in values
    assert '#bar' in names and names['#bar'] == 'bar'
    assert ':bar' in values

def test_upsert_with_condition_expression(model_instance):
    # verify that condition_expression is passed through
    mock_table = MagicMock()
    mock_table.update_item.return_value = {}

    cond = "attribute_not_exists(#foo)"
    resp = model_instance.upsert(mock_table, condition_expression=cond)
    kwargs = mock_table.update_item.call_args[1]

    ce = kwargs.get('ConditionExpression', '')
    assert cond in ce

    names = kwargs['ExpressionAttributeNames']
    values = kwargs['ExpressionAttributeValues']
    assert '#foo' in names and names['#foo'] == 'foo'
    assert ':foo' in values

# assemble items
#   test if not root item raises ValueError
#   test if root item is identified correctly
#   test if current entitiy type set correctly
#   test that root is not changed
#   test that related entities are assembled correctly
#   test if unknown mode raises ValueError
#   test if 'single' mode assembles an item into a single item
#   test if 'list' assembles items into a list
#   test if no related_entities
#   test if related_entities with no items
    
def test_assemble_from_items_single_only_with_one_other_entity(dt):
    related_model = RelatedOneModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)
    m = RelatedEntitiesSingleModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)
    items = [m.to_dynamo(), related_model.to_dynamo()]
    resp = m.assemble_from_items(items)
    assert isinstance(resp, RelatedEntitiesSingleModel)
    assert resp.ksuid == m.ksuid
    assert resp.foo == m.foo
    assert resp.bar == m.bar
    assert resp.related == related_model
    assert not isinstance(resp.related, list)

def test_assemble_from_items_list_with_multiple_related_entities(dt):
    related_model_1 = RelatedsModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)
    related_model_2 = RelatedsModel(ksuid='b', foo=2, bar=2.2, timestamp=dt)
    m = RelatedEntitiesListModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)

    items = [m.to_dynamo(), related_model_1.to_dynamo(), related_model_2.to_dynamo()]
    resp = m.assemble_from_items(items)
    assert isinstance(resp, RelatedEntitiesListModel)
    assert resp.ksuid == m.ksuid
    assert resp.foo == m.foo
    assert resp.bar == m.bar
    assert isinstance(resp.relateds, list)
    assert resp.relateds == [related_model_1, related_model_2]

def test_assemble_from_items_with_mixed_related_entities(dt):
    related_model_0 = RelatedOneModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)
    related_model_1 = RelatedsModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)
    related_model_2 = RelatedsModel(ksuid='b', foo=2, bar=2.2, timestamp=dt)
    m = RelatedEntitiesMixedModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)

    items = [m.to_dynamo(), related_model_0.to_dynamo(), related_model_1.to_dynamo(), related_model_2.to_dynamo()]
    resp = m.assemble_from_items(items)
    assert isinstance(resp, RelatedEntitiesMixedModel)
    assert resp.ksuid == m.ksuid
    assert resp.foo == m.foo
    assert resp.bar == m.bar
    assert isinstance(resp.relateds, list)
    assert resp.relateds == [related_model_1, related_model_2]
    assert resp.related == related_model_0
    assert not isinstance(resp.related, list)

def test_assemble_from_items_no_root(dt):
    related_model = RelatedOneModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)
    m = RelatedEntitiesSingleModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)
    items = [related_model.to_dynamo()]

    with pytest.raises(ValueError):
        resp = m.assemble_from_items(items)

def test_assemble_from_items_invalid_mode(dt):
    class RelatedEntitiesUnknownModeModel(SimpleModel):
        related: Optional[RelatedOneModel] = None

        @property
        def related_entities(self):
            return {
                'RELATEDONE': ('related', 'unknown', RelatedOneModel)
            }
    related_model = RelatedOneModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)
    m = RelatedEntitiesUnknownModeModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)
    items = [related_model.to_dynamo()]

    with pytest.raises(ValueError):
        resp = m.assemble_from_items(items)

def test_assemble_from_items_no_related_entities(dt):
    m = SimpleModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)
    items = [m.to_dynamo()]
    resp = m.assemble_from_items(items)
    assert isinstance(resp, SimpleModel)
    assert resp.ksuid == m.ksuid
    assert resp.foo == m.foo
    assert resp.bar == m.bar

def test_assemble_from_items_empty_list(dt):
    m = SimpleModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)
    items = []
    
    with pytest.raises(ValueError):
        resp = m.assemble_from_items(items)

# query_gsi()
def test_query_gsi_returns_single_item(valid_ksuid, dt):
    m = SimpleModel(ksuid=valid_ksuid, foo=1, bar=1.1, timestamp=dt)
    mock_table = MagicMock()
    mock_table.query.return_value = {
        'Items': [m.to_dynamo(exclude_keys=True)]
    }

    resp = m.query_gsi(mock_table, key_condition={"PK": m.PK, "SK": m.SK})

    assert isinstance(resp, SimpleModel)
    assert resp.PK == m.PK
    mock_table.query.assert_called_once()

def test_query_gsi_returns_multiple_items(valid_ksuid, dt):
    m = SimpleModel(ksuid=valid_ksuid, foo=1, bar=1.1, timestamp=dt)
    mock_table = MagicMock()
    mock_table.query.return_value = {
        'Items': [m.to_dynamo(exclude_keys=True),
                  m.to_dynamo(exclude_keys=True)]
    }

    resp = m.query_gsi(mock_table, key_condition={"PK": m.PK})

    assert isinstance(resp, list)
    assert all(isinstance(item, SimpleModel) for item in resp)
    assert len(resp) == 2
    mock_table.query.assert_called_once()

def test_query_gsi_no_items(valid_ksuid, dt):
    m = SimpleModel(ksuid=valid_ksuid, foo=1, bar=1.1, timestamp=dt)
    mock_table = MagicMock()
    mock_table.query.return_value = {"Items": []}

    resp = m.query_gsi(mock_table, key_condition={"PK": m.PK, "SK": m.SK})
    assert resp == None

def test_query_gsi_with_index_name(valid_ksuid, dt):
    m = SimpleModel(ksuid=valid_ksuid, foo=1, bar=1.1, timestamp=dt)
    mock_table = MagicMock()
    mock_table.query.return_value = {
        'Items': [m.to_dynamo(exclude_keys=True)]
    }

    resp = m.query_gsi(mock_table, key_condition={"PK": m.PK, "SK": m.SK}, index_name='test-index')

    args, kwargs = mock_table.query.call_args
    assert kwargs["IndexName"] == 'test-index'

def test_query_gsi_with_assemble_entities(valid_ksuid, dt, monkeypatch):
    related_model_1 = RelatedsModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)
    related_model_2 = RelatedsModel(ksuid='b', foo=2, bar=2.2, timestamp=dt)
    m = RelatedEntitiesListModel(ksuid='a', foo=1, bar=1.1, timestamp=dt)
    mock_table = MagicMock()
    mock_table.query.return_value = {
        'Items': [m.to_dynamo(), 
                  related_model_1.to_dynamo(), 
                  related_model_2.to_dynamo()]
    }

    resp = m.query_gsi(mock_table, key_condition={"PK": m.PK, "SK": m.SK}, assemble_entites=True)

    assert isinstance(resp, RelatedEntitiesListModel)
    assert resp.relateds == [related_model_1, related_model_2]

def test_query_gsi_raises_on_wuery_fail(valid_ksuid, dt):
    m = SimpleModel(ksuid=valid_ksuid, foo=1, bar=1.1, timestamp=dt)
    mock_table = MagicMock()
    mock_table.query.side_effect = Exception()

    with pytest.raises(Exception):
        m.query_gsi(mock_table, key_condition={"PK": m.PK, "SK": m.SK})

# history model tests
def test_history_model_properties_and_to_dynamo(valid_ksuid, dt):
    data = {'key': 'value'}
    meta = {'info': 123}
    h = HistoryModel(
        ksuid=valid_ksuid,
        organisation='org',
        resource_type=EventType.event,
        resource_id='rid',
        action=Action.created,
        timestamp=dt,
        actor='user',
        data=data,
        meta=meta
    )
    assert h.entity_type == 'HISTORY'
    assert h.PK == f'HISTORY#{valid_ksuid}'
    assert h.SK == 'rid'
    assert h.gsi1PK is None and h.gsi1SK is None
    d = h.to_dynamo()
    assert d['organisation'] == 'org'
    assert d['resource_type'] == EventType.event
    assert d['resource_id'] == 'rid'
    assert d['action'] == Action.created
    assert d['actor'] == 'user'
    assert d['data'] == data
    assert d['meta'] == meta
    assert d['timestamp'] == '2022-10-31T20:32:42Z'

# batch write tests
def test_batch_write_written_successfully(dt):
    mock_table = MagicMock()
    mock_table.name = "org-demo"
    db_client = MagicMock()
    mock_table.meta.client = db_client

    m1 = SimpleModel(ksuid='k1', foo=1, bar=1.0, timestamp=dt)
    m2 = SimpleModel(ksuid='k2', foo=1, bar=1.0, timestamp=dt)

    db_client.batch_write_item.return_value = {'UnprocessedItems': {}}

    success, unprocessed = batch_write(mock_table, [m1, m2])

    assert success == [m1, m2]
    assert unprocessed == []
    assert db_client.batch_write_item.called
    req = db_client.batch_write_item.call_args[1]['RequestItems']
    assert 'org-demo' in req
    assert len(req['org-demo']) == 2

def test_batch_write_input_some_unprocessed_items(dt):
    mock_table = MagicMock()
    mock_table.name = "org-demo"
    db_client = MagicMock()
    mock_table.meta.client = db_client

    m1 = SimpleModel(ksuid='k1', foo=1, bar=1.0, timestamp=dt)
    m2 = SimpleModel(ksuid='k2', foo=1, bar=1.0, timestamp=dt)

    db_client.batch_write_item.return_value = {'UnprocessedItems': {"org-demo": [{'PutRequest':{'Item': m1.to_dynamo(exclude_keys=False)}}]}}

    success, unprocessed = batch_write(mock_table, [m1, m2])
    logger.info(f"Success: {success}, Unprocessed: {unprocessed}")
    assert db_client.batch_write_item.called
    assert m1 in unprocessed
    assert m2 in success
    
def test_batch_write_input_all_unprocessed_items(dt):
    mock_table = MagicMock()
    mock_table.name = "org-demo"
    db_client = MagicMock()
    mock_table.meta.client = db_client

    m1 = SimpleModel(ksuid='k1', foo=1, bar=1.0, timestamp=dt)
    m2 = SimpleModel(ksuid='k2', foo=1, bar=1.0, timestamp=dt)

    db_client.batch_write_item.return_value = {'UnprocessedItems': {"org-demo": [{'PutRequest':{'Item': m1.to_dynamo(exclude_keys=False)}}, {'PutRequest':{'Item': m2.to_dynamo(exclude_keys=False)}}]}}

    success, unprocessed = batch_write(mock_table, [m1, m2])
    logger.info(f"Success: {success}, Unprocessed: {unprocessed}")
    assert db_client.batch_write_item.called
    assert m1 in unprocessed
    assert m2 in unprocessed
    assert len(success) == 0

def test_batch_write_batching(dt):
    mock_table = MagicMock()
    mock_table.name = "org-demo"
    db_client = MagicMock()
    mock_table.meta.client = db_client

    items = [SimpleModel(ksuid=f'k{i}', foo=i, bar=float(i), timestamp=dt) for i in range(28)]

    # Simulate successful batch write
    db_client.batch_write_item.return_value = {'UnprocessedItems': {}}

    success, unprocessed = batch_write(mock_table, items)
    
    assert len(success) == 28
    assert len(unprocessed) == 0
    assert db_client.batch_write_item.call_count == 2

# Transaction Upsert Tests
def test_transact_upsert_success(dt):
    mock_table = MagicMock()
    mock_table.name = "org-demo"
    db_client = MagicMock()
    mock_table.meta.client = db_client
    db_client.transact_write_items.return_value = None

    m1 = SimpleModel(ksuid='k1', foo=3, bar=3.0, timestamp=dt)
    m2 = SimpleModel(ksuid='k2', foo=4, bar=4.0, timestamp=dt)

    success, failed = transact_upsert(mock_table, [m1, m2])
    assert success == [m1, m2]
    assert failed == []
    assert db_client.transact_write_items.called
    payload = db_client.transact_write_items.call_args[1]["TransactItems"]
    assert isinstance(payload, list) and len(payload) == 2
    assert payload[0]['Update']['TableName'] == "org-demo"
    assert payload[0]['Update']['Key'] == {"PK": m1.PK, "SK": m1.SK}
    # make sure not trying to set pk or sk which is not possible in a transaction
    assert '#PK' not in payload[0]['Update']['ExpressionAttributeNames']
    assert '#SK' not in payload[0]['Update']['ExpressionAttributeNames']

def test_transact_upsert_with_versioning(valid_ksuid, dt):
    class VersionedModel(SimpleModel):
        version: int = 1

    m = VersionedModel(ksuid=valid_ksuid, foo=1, bar=2.0, timestamp=dt, version=1)

    mock_table = MagicMock()
    mock_table.name = "org-demo"
    db_client = MagicMock()
    mock_table.meta.client = db_client
    db_client.transact_write_items.return_value = None

    success, failed = transact_upsert(mock_table, [m])
    args, kwargs = db_client.transact_write_items.call_args
    transact_items = kwargs['TransactItems']
    update = transact_items[0]['Update']
    logger.info(f"Update Items: {update}")
    assert "#version" in update['ExpressionAttributeNames']
    assert update['ExpressionAttributeNames']['#version'] == 'version'
    assert ":incoming_version" in update['ExpressionAttributeValues'] and update['ExpressionAttributeValues'][':incoming_version'] == 1
    assert "attribute_not_exists(#version) OR #version <= :incoming_version" in update['ConditionExpression']

def test_transact_upsert_with_only_set_once_and_condition(dt):
    mock_table = MagicMock()
    mock_table.name = "org-demo"
    db_client = MagicMock()
    mock_table.meta.client = db_client
    db_client.transact_write_items.return_value = None

    m = SimpleModel(ksuid='k1', foo=3, bar=3.0, timestamp=dt)

    resp = transact_upsert(mock_table, [m], only_set_once=["foo"], condition_expression="attribute_exists(PK)")
    update = mock_table.meta.client.transact_write_items.call_args[1]["TransactItems"][0]["Update"]

    assert 'if_not_exists(#foo, :foo)' in update['UpdateExpression']
    assert "attribute_exists(PK)" in update['ConditionExpression']

def test_transact_upsert_conflict(dt, valid_ksuid):
    class VersionedModel(SimpleModel):
        version: int = 1

    m = VersionedModel(ksuid=valid_ksuid, foo=1, bar=2.0, timestamp=dt, version=1)

    mock_table = MagicMock()
    mock_table.name = "org-demo"
    db_client = MagicMock()
    mock_table.meta.client = db_client
    db_client.transact_write_items.return_value = None

    class TCE(Exception):
        pass
    db_client.exceptions.TransactionCanceledException = TCE
    ex = TCE()
    ex.response = {'CancellationReasons': [{'Code': 'ConditionalCheckFailed'}]} 
    db_client.transact_write_items.side_effect = ex

    with pytest.raises(VersionConflictError) as e:
        transact_upsert(mock_table, [m])
    logger.info(f"Exception: {e.value}")
    assert e.value.models == [m]
    assert e.value.incoming_versions == [1]

def test_transact_upsert_empty_input():
    mock_table = MagicMock()
    mock_table.name = "org-demo"
    db_client = MagicMock()
    mock_table.meta.client = db_client
    # db_client.transact_write_items.return_value = None

    success, failed = transact_upsert(mock_table, [])

    assert success == [] 
    assert failed == []
    assert not db_client.transact_write_items.called