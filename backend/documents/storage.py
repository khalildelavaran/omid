from django.conf import settings
from django.core.files.storage import FileSystemStorage


class PrivateDocumentStorage(FileSystemStorage):
    """Filesystem storage deliberately configured without a public URL."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("location", settings.PRIVATE_DOCUMENT_ROOT)
        kwargs.setdefault("base_url", None)
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        # Storage location is environment-specific; migrations should store the
        # stable storage class, not an absolute path from a developer or CI host.
        return ("documents.storage.PrivateDocumentStorage", (), {})

    def url(self, name):
        raise ValueError("Private documents do not have public URLs.")
