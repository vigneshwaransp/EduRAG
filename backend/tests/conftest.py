import pytest
import pytest_asyncio
from app.database.session import init_db, AsyncSessionLocal
from app.database.seeder import seed_initial_data

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_database():
    """Ensure database schema is created and initial data is seeded before running tests."""
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed_initial_data(db)
