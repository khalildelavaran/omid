import hashlib

from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    """Limit login attempts by source IP and normalized account identifier."""

    scope = "login"

    def get_cache_key(self, request, view):
        username = request.data.get("username", "")
        if not isinstance(username, str):
            username = ""
        username = username.strip().casefold()[:254]
        ident = self.get_ident(request)
        digest = hashlib.sha256(f"{ident}:{username}".encode("utf-8")).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": digest}
