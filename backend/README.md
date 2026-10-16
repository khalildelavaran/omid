# Backend development

## Requirements
- Python 3.12+
- Docker Compose (for PostgreSQL), or local PostgreSQL

## Setup

From the repository root:

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
docker compose up -d db
python backend/manage.py migrate
python backend/manage.py runserver
```

The API liveness endpoint is available at `http://127.0.0.1:8000/api/v1/health/`.

The example database password is for local development only. Do not reuse it in production. The current scaffold does not yet implement customer records, business workflows, or production authentication flows.
