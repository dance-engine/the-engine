import pytest

from _shared.naming import getOrganisationTableName, generateSlug


# --- Test Cases ---

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
def test_generate_slug_variants(name, expected):
    """Test various name inputs for generateSlug."""
    assert generateSlug(name) == expected

def test_table_name_basic_replacement(monkeypatch):
    """Test basic table name generation. getOrganisationTableName()"""
    monkeypatch.setenv("ORG_TABLE_NAME_TEMPLATE", "preview-org-org_name")
    assert getOrganisationTableName("test-org") == "preview-org-test-org"

def test_table_name_missing_env_var(monkeypatch):
    """Test behaviour when ORG_TABLE_NAME_TEMPLATE is not set. getOrganisationTableName()"""
    monkeypatch.delenv("ORG_TABLE_NAME_TEMPLATE", raising=False)
    with pytest.raises(AttributeError):
        getOrganisationTableName("whatever")

def test_table_name_with_empty_slug(monkeypatch):
    """Test table name generation with an empty slug. getOrganisationTableName()"""
    monkeypatch.setenv("ORG_TABLE_NAME_TEMPLATE", "preview-org-org_name")
    result = getOrganisationTableName("")
    assert result == "preview-org-"