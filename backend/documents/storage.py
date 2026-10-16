from django.conf import settings
from django.core.files.storage import FileSystemStorage


class PrivateDocumentStorage(FileSystemStorage):
    """Filesystem storage deliberately configured without a public URL."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("location", settings.PRIVATE_DOCUMENT_ROOT)
        kwargs.setdefault("base_url", None)
        super().__init__(*args, **kwargs)

    def url(self, name):
        raise ValueError("Private documents do not have public URLs.")
