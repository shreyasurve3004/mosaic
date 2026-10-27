import os

from cloudinary.uploader import destroy, upload
from rest_framework.exceptions import APIException


ALLOWED = {
    "pdf",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
}

MAX_SIZE = 100 * 1024 * 1024


def upload_attachment(file, folder):
    ext = (
        file.name.rsplit(".", 1)[-1].lower()
        if "." in file.name
        else ""
    )

    if ext not in ALLOWED:
        raise APIException("Unsupported file type.")

    if file.size > MAX_SIZE:
        raise APIException("File is larger than 10 MB.")

    if not all(
        os.getenv(key)
        for key in [
            "CLOUDINARY_CLOUD_NAME",
            "CLOUDINARY_API_KEY",
            "CLOUDINARY_API_SECRET",
        ]
    ):
        raise APIException(
            "Cloudinary is not configured. Set "
            "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and "
            "CLOUDINARY_API_SECRET in .env."
        )

    result = upload(
        file,
        folder=folder,
        resource_type="auto"
    )

    return {
        "file_name": file.name,
        "file_url": result.get("secure_url"),
        "public_id": result.get("public_id"),
        "resource_type": result.get("resource_type"),
        "format": result.get("format"),
        "file_type": getattr(file, "content_type", None),
        "file_size": file.size,
    }


def delete_attachment(public_id, resource_type="image"):
    if public_id:
        destroy(
            public_id,
            resource_type=resource_type
        )