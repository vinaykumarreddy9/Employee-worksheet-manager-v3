# Employee Timesheet Manager

A professional timesheet management system built with FastAPI (Backend) and React (Frontend).

## Deployment to Render

This project is configured for easy deployment on Render using the `render.yaml` blueprint.

### Prerequisites

1. A [Neon DB](https://neon.tech/) PostgreSQL database.
2. The `DATABASE_URL` for your Neon DB.

### Fast Deployment

1. Push this repository to GitHub.
2. In the Render Dashboard, click **Blueprints** -> **New Blueprint Instance**.
3. Select your repository.
4. Render will automatically detect the settings from `render.yaml`.
5. When prompted, provide your **`DATABASE_URL`**.

### Manual Deployment Settings

If not using the Blueprint:

#### Backend API:

- **Build Command**: `cd backend && pip install -r requirements.txt`
- **Start Command**: `cd backend && gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT`
- **Env Vars**: `DATABASE_URL`

#### Frontend App:

- **Build Command**: `cd frontend && npm install && npm run build`
- **Start Command**: `cd frontend && npm run dev`
- **Env Vars**: `VITE_API_URL` (URL of your Backend service)
