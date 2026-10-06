import pytest
from app.database.seed import seed_db


@pytest.fixture(autouse=True)
def clean_database_lifecycle():
    """Guarantee clean database state before and after every test."""
    seed_db()
    yield
    seed_db()
