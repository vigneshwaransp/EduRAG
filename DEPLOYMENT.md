# EduRAG — Render Cloud Deployment Guide

This guide provides instructions for deploying the complete **EduRAG** platform (FastAPI backend + Vite React frontend) to [Render](https://render.com).

---

## Method 1: 1-Click Render Blueprint (Recommended)

EduRAG includes a root `render.yaml` Blueprint specification. Render will automatically provision both the Python Web Service and the Static Site in one flow.

### Steps:
1. **Push your code to GitHub**:
   Ensure all changes are pushed to `https://github.com/vigneshwaransp/EduRAG.git`.
2. **Log in to Render**:
   Open [dashboard.render.com](https://dashboard.render.com).
3. **Create New Blueprint**:
   - Click the **New +** button in the top right.
   - Select **Blueprint**.
   - Connect your GitHub account and select the repository: `vigneshwaransp/EduRAG`.
   - Branch: `main`.
4. **Configure Environment Variables**:
   - Render will detect `edurag-api` and `edurag-web`.
   - In the prompt for `LLM_API_KEY`, paste your Mistral or Gemini API key (e.g. `3tFd4AtTx5ZTZbx8komOIYvQh9FUl86L`).
5. **Apply**:
   - Click **Apply**.
   - Render will build the backend service (`edurag-api`) and frontend static site (`edurag-web`).

---

## Method 2: Manual Service Creation

If you prefer configuring services individually in the Render Dashboard:

### Step A: Deploy the Backend API (`edurag-api`)
1. Click **New +** -> **Web Service**.
2. Connect `https://github.com/vigneshwaransp/EduRAG.git`.
3. Configure settings:
   - **Name**: `edurag-api`
   - **Region**: Closest to you (e.g., Singapore, Frankfurt, Oregon)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
4. Add **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `PYTHON_VERSION` | `3.12.8` |
   | `APP_ENV` | `production` |
   | `DEBUG` | `false` |
   | `LLM_PROVIDER` | `mistral` |
   | `LLM_API_KEY` | *(Your API Key)* |
   | `LLM_MODEL` | `open-mistral-7b` |
   | `LLM_BASE_URL` | `https://api.mistral.ai/v1` |
   | `DATABASE_URL` | `sqlite+aiosqlite:///./edurag.db` |
   | `CORS_ORIGINS` | `*` |
   | `JWT_SECRET` | *(Random 32-character string)* |
5. Click **Create Web Service**.
6. Copy the assigned URL (e.g., `https://edurag-api.onrender.com`).

---

### Step B: Deploy the Frontend (`edurag-web`)
1. Click **New +** -> **Static Site**.
2. Connect `https://github.com/vigneshwaransp/EduRAG.git`.
3. Configure settings:
   - **Name**: `edurag-web`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add **Environment Variable**:
   | Key | Value |
   |-----|-------|
   | `VITE_API_BASE_URL` | `https://edurag-api.onrender.com` *(your backend URL from Step A)* |
5. Add **Redirect / Rewrite Rule** (under **Redirects/Rewrites** tab):
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
6. Click **Create Static Site**.

---

## Verifying Deployment

1. **Backend Health**: Navigate to `https://<your-backend-domain>/api/health`. It should return:
   ```json
   {
     "status": "healthy",
     "version": "1.0.0",
     "app": "EduRAG"
   }
   ```
2. **Interactive API Docs**: Navigate to `https://<your-backend-domain>/docs` for Swagger UI.
3. **Frontend Application**: Navigate to `https://<your-frontend-domain>`.
   - Log in with demo credentials (`demo@edurag.edu` / `password123`) or register a new student/educator account.
   - Upload educational PDFs/DOCX, chat with the AI Tutor, generate summaries, take adaptive diagnostic examinations, and practice flashcards.
