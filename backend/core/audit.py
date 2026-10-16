"""Safe audit helpers. Never pass passwords, tokens, OTPs, or document content here."""

from .models import AuditEvent


def _client_ip(request):
    # REMOTE_ADDR is authoritative unless a trusted proxy is configured explicitly.
    value = request.META.get("REMOTE_ADDR", "") if request else ""
    return value or None


def record_audit(
    request,
    action,
    *,
    actor=None,
    entity_type="",
    entity_id="",
    outcome="success",
    metadata=None,
):
    if outcome not in {"success", "failure", "denied"}:
        outcome = "success"
    request_id = ""
    user_agent = ""
    if request is not None:
        candidate = request.headers.get("X-Request-ID", "")
        request_id = candidate[:80] if candidate and candidate.isascii() else ""
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:300]
    safe_metadata = metadata if isinstance(metadata, dict) else {}
    return AuditEvent.objects.create(
        actor=actor,
        action=str(action)[:80],
        entity_type=str(entity_type)[:80],
        entity_id=str(entity_id)[:80],
        outcome=outcome,
        ip_address=_client_ip(request),
        request_id=request_id,
        user_agent=user_agent,
        metadata=safe_metadata,
    )
