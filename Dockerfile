FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000 \
    PRIVATE_DOCUMENT_ROOT=/var/lib/omid/private-documents

RUN addgroup --system app \
    && adduser --system --ingroup app app \
    && mkdir -p /var/lib/omid/private-documents \
    && chown -R app:app /var/lib/omid

WORKDIR /app

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY --chown=app:app backend/ /app/backend/
WORKDIR /app/backend

# Build-time-only key is used for collectstatic; it is not a runtime secret.
RUN DJANGO_SECRET_KEY=build-only-not-a-real-secret \
    DJANGO_DEBUG=False \
    python manage.py collectstatic --noinput \
    && chown -R app:app /app/backend/staticfiles

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["sh", "-c", "python -c \"import os; from urllib.request import urlopen; urlopen('http://127.0.0.1:' + os.getenv('PORT', '8000') + '/api/v1/health/', timeout=3).read()\""]

CMD ["sh", "-c", "exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers ${GUNICORN_WORKERS:-2} --access-logfile - --error-logfile - --timeout 60"]
