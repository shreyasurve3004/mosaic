
import os
import subprocess
import tempfile
import uuid

from pathlib import Path

from django.conf import settings


OFFICE_EXTENSIONS = {
    ".doc", ".docx", ".odt", ".rtf",
    ".xls", ".xlsx", ".ods",
    ".ppt", ".pptx", ".odp",
}

MAX_CONVERSION_SIZE = 50 * 1024 * 1024  # 50 MB
CONVERSION_TIMEOUT = 60


class FileConversionError(Exception):
    """Raised when a document cannot be converted safely."""


def convert_to_pdf(source_path):
    """
    Convert a supported Office document to PDF.

    Returns the PDF as bytes. The original file is never modified.
    """
    source = Path(source_path)

    if not source.is_file():
        raise FileConversionError("The source file does not exist.")

    if source.suffix.lower() not in OFFICE_EXTENSIONS:
        raise FileConversionError(
            "This file format is not supported for conversion."
        )

    if source.stat().st_size > MAX_CONVERSION_SIZE:
        raise FileConversionError(
            "The file exceeds the 50 MB conversion limit."
        )

    soffice = getattr(settings, "LIBREOFFICE_PATH", "")

    if not soffice or not Path(soffice).is_file():
        raise FileConversionError(
            "LibreOffice could not be found. Check LIBREOFFICE_PATH."
        )

    with tempfile.TemporaryDirectory(prefix="mosaic_convert_") as temp_dir:
        temp = Path(temp_dir)
        output_dir = temp / "output"
        output_dir.mkdir()

        # Use an isolated LibreOffice profile for this conversion.
        profile_dir = temp / "profile"
        profile_uri = profile_dir.resolve().as_uri()

        try:
            result = subprocess.run(
                [
                    soffice,
                    "--headless",
                    "--nologo",
                    "--nodefault",
                    "--nolockcheck",
                    f"-env:UserInstallation={profile_uri}",
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    str(output_dir),
                    str(source.resolve()),
                ],
                capture_output=True,
                text=True,
                timeout=CONVERSION_TIMEOUT,
                check=False,
                shell=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise FileConversionError(
                "Document conversion timed out."
            ) from exc
        except OSError as exc:
            raise FileConversionError(
                "LibreOffice could not be started."
            ) from exc

        pdf_path = output_dir / f"{source.stem}.pdf"

        if result.returncode != 0 or not pdf_path.is_file():
            raise FileConversionError(
                "LibreOffice could not convert this document."
            )

        if pdf_path.stat().st_size == 0:
            raise FileConversionError("The generated PDF is empty.")

        return pdf_path.read_bytes()
