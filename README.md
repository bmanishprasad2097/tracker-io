# Learning Tracker

Private single-user learning roadmap tracker built with FastAPI + PostgreSQL + React + Vite.

## Stack

- Backend: `FastAPI`, `SQLAlchemy 2.x async`, `asyncpg`, `Alembic`, `orjson`
- Frontend: `React`, `Vite`, `TypeScript`, `Tailwind CSS`, `React Query`, `react-router-dom`, `recharts`
- Python package manager: `uv`

## Project Structure

- `backend/` FastAPI app, async DB models, services, routers, and migrations
- `frontend/` React SPA with dashboard + roadmap detail workflows

## Environment Variables

### Backend (`backend/.env`)

Copy from `backend/.env.example` and fill real values:

- `DATABASE_URL` (Neon pooled connection string, with `sslmode=require`)
- `API_KEY` (used by `X-API-Key` for all `/api/*` routes)

### Frontend (`frontend/.env`)

Copy from `frontend/.env.example`:

- `VITE_API_URL` (leave empty for local proxy setup)
- `VITE_API_KEY` (must match backend `API_KEY`)

## Backend Setup

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

API docs:

- `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Features Implemented

- API key auth on all `/api/*` routes
- Roadmap, topic, task CRUD
- Automatic task `completed_at` transition logic
- Auto `sort_order` assignment for new sibling topics/tasks
- Dashboard stats and 30-day completion series
- Sidebar navigation with roadmap mini-progress bars
- Dashboard cards + chart + recent activity
- Roadmap detail with topic accordion and task checklist
- Optimistic task completion toggles (React Query `onMutate`)
- Debounced notes auto-save (500ms)
- Lazy-loaded route pages

## Build Validation

- Backend syntax compilation passed (`uv run python -m compileall app`)
- Frontend production build passed (`npm run build`)