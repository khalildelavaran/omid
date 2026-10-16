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

Core API routes include `/api/v1/customers/`, `/api/v1/applications/`, `/api/v1/tasks/`, and the restricted read-only `/api/v1/audit-events/` feed. Run `python backend/manage.py migrate` after pulling changes; new migrations include the audit log, generated record numbers, and workflow tasks.

The example database password is for local development only. Do not reuse it in production.

## Internal authentication API

The internal staff API uses Django sessions, not bearer tokens. Browser clients must send cookies and use the CSRF token for state-changing requests.

1. `GET /api/v1/auth/csrf/` to obtain a CSRF token and cookie.
2. `POST /api/v1/auth/login/` with JSON `{"username":"…","password":"…"}` and header `X-CSRFToken`.
3. `GET /api/v1/auth/me/` to obtain the current staff user's profile and role.
4. `POST /api/v1/auth/change-password/` with `current_password` and `new_password` plus `X-CSRFToken`.
5. `POST /api/v1/auth/logout/` plus `X-CSRFToken` to end the session.

The internal login accepts only active staff accounts with an allowed non-customer business role. Login attempts are throttled both per normalized account+source-IP pair (`LOGIN_RATE_LIMIT`, default `5/minute`) and per source IP across accounts (`LOGIN_IP_RATE_LIMIT`, default `20/minute`). Password changes are also rate-limited (`PASSWORD_CHANGE_RATE_LIMIT`, default `5/hour`). Append-only `AuditEvent` records cover authentication and key customer/loan-application changes. Audit metadata must never include credentials, OTPs, customer notes, or document contents. Customer portal authentication is separate and is not implemented yet. The production frontend should use same-origin routing or a carefully configured trusted origin, send credentials, and never disable CSRF checks.

Before production, configure a strong `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, HTTPS-only cookies, a trusted HTTPS proxy configuration if applicable, login throttling, monitoring, and a production database. Do not expose this scaffold publicly before deployment and security checks are complete.
