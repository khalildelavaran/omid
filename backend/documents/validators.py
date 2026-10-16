import hashlib

from django.core.exceptions import ValidationError

MAX_DOCUMENT_SIZE = 10 * 1024 * 1024

SIGNATURES = {
    "application/pdf": (b"%PDF-", ".pdf"),
    "image/jpeg": (b"\xff\xd8\xff", ".jpg"),
    "image/png": (b"\x89PNG\r\n\x1a\n", ".png"),
}


def inspect_upload(upload):
    """Validate a small allowlist by file signature and calculate SHA-256."""
    if upload.size <= 0:
        raise ValidationError("فایل خالی قابل بارگذاری نیست.")
    if upload.size > MAX_DOCUMENT_SIZE:
        raise ValidationError("حداکثر حجم هر سند ۱۰ مگابایت است.")

    header = upload.read(16)
    upload.seek(0)
    detected_type = next(
        (mime for mime, (signature, _extension) in SIGNATURES.items() if header.startswith(signature)),
        None,
    )
    if not detected_type:
        raise ValidationError("فقط فایل معتبر PDF، JPEG یا PNG قابل بارگذاری است.")

    digest = hashlib.sha256()
    for chunk in upload.chunks():
        digest.update(chunk)
    upload.seek(0)
    return {
        "content_type": detected_type,
        "extension": SIGNATURES[detected_type][1],
        "sha256": digest.hexdigest(),
        "size_bytes": upload.size,
    }
