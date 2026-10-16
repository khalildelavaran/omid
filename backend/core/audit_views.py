from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import AuditEvent
from .permissions import CanReadAuditEvents
from .serializers import AuditEventSerializer


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only, paginated audit feed for authorized audit staff."""

    serializer_class = AuditEventSerializer
    permission_classes = [IsAuthenticated, CanReadAuditEvents]
    queryset = AuditEvent.objects.select_related("actor").all()

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        action = params.get("action", "").strip()
        entity_type = params.get("entity_type", "").strip()
        entity_id = params.get("entity_id", "").strip()
        outcome = params.get("outcome", "").strip()
        actor_id = params.get("actor", "").strip()

        if action:
            queryset = queryset.filter(action=action[:80])
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type[:80])
        if entity_id:
            queryset = queryset.filter(entity_id=entity_id[:80])
        if outcome in {"success", "failure", "denied"}:
            queryset = queryset.filter(outcome=outcome)
        if actor_id.isdigit():
            queryset = queryset.filter(actor_id=int(actor_id))
        return queryset
