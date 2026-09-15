import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["app_name"] == "EduRAG"

@pytest.mark.asyncio
async def test_auth_login_demo():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/auth/login", json={
            "email": "demo@edurag.edu",
            "password": "edurag2025"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "demo@edurag.edu"

@pytest.mark.asyncio
async def test_rag_chat_grounded():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login
        login_res = await client.post("/api/auth/login", json={
            "email": "demo@edurag.edu",
            "password": "edurag2025"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Ask question
        chat_res = await client.post("/api/chat", headers=headers, json={
            "message": "What are the four conditions required for a deadlock?",
            "selected_document_ids": []
        })
        assert chat_res.status_code == 200
        data = chat_res.json()
        assert "answer" in data
        assert len(data["answer"]) > 20
        assert "citations" in data
