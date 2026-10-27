import mimetypes
import os
import tempfile
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

from django.http import HttpResponse, StreamingHttpResponse
from django.utils.http import content_disposition_header

from file_service.services import (
    OFFICE_EXTENSIONS,
    MAX_CONVERSION_SIZE,
    FileConversionError,
    convert_to_pdf,
)


MAX_PREVIEW_SIZE = 50 * 1024 * 1024


class CloudinaryRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, new_url):
        parsed = urlparse(new_url)
        if (
            parsed.scheme != "https"
            or parsed.hostname != "res.cloudinary.com"
        ):
            return None
        return super().redirect_request(
            req, fp, code, msg, headers, new_url
        )


def _safe_filename(filename, file_url):
    filename = os.path.basename(
        filename.replace("\\", "/")
    ).strip()
    extension = os.path.splitext(filename)[1]

    if not extension:
        url_extension = os.path.splitext(
            unquote(urlparse(file_url).path)
        )[1]
        filename = f"{filename or 'download'}{url_extension}"

    return filename or "download"


def serve_cloudinary_file(request, file_url, filename):
    parsed = urlparse(file_url)

    if (
        parsed.scheme != "https"
        or parsed.hostname != "res.cloudinary.com"
    ):
        return HttpResponse("Invalid file URL.", status=400)

    filename = _safe_filename(filename, file_url)
    extension = Path(filename).suffix.lower()
    download = request.GET.get("download") == "1"

    try:
        opener = build_opener(CloudinaryRedirectHandler())
        upstream = opener.open(
            Request(
                file_url,
                headers={"User-Agent": "Mosaic file delivery"},
            ),
            timeout=30,
        )
    except HTTPError as error:
        return HttpResponse(
            "File could not be retrieved.",
            status=error.code,
        )
    except (URLError, TimeoutError, OSError):
        return HttpResponse(
            "File could not be retrieved.",
            status=502,
        )

    # Preview Office documents as PDFs. Downloads still return
    # the original Office file without conversion.
    if not download and extension in OFFICE_EXTENSIONS:
        try:
            content_length = upstream.headers.get("Content-Length")
            if content_length and int(content_length) > MAX_PREVIEW_SIZE:
                upstream.close()
                return HttpResponse(
                    "Files must be no larger than 50 MB to preview.",
                    status=413,
                )

            with tempfile.TemporaryDirectory(
                prefix="mosaic_preview_"
            ) as temp_dir:
                source_path = Path(temp_dir) / f"source{extension}"
                total = 0

                with source_path.open("wb") as output:
                    while True:
                        chunk = upstream.read(64 * 1024)
                        if not chunk:
                            break

                        total += len(chunk)
                        if total > MAX_PREVIEW_SIZE:
                            return HttpResponse(
                                "Files must be no larger than 50 MB to preview.",
                                status=413,
                            )

                        output.write(chunk)

                pdf_bytes = convert_to_pdf(str(source_path))

            if not pdf_bytes.startswith(b"%PDF-"):
                return HttpResponse(
                    "The file could not be converted to a valid PDF.",
                    status=422,
                )

            response = HttpResponse(
                pdf_bytes,
                content_type="application/pdf",
            )
            response["Content-Disposition"] = content_disposition_header(
                as_attachment=False,
                filename=f"{Path(filename).stem}.pdf",
            )
            response["X-Content-Type-Options"] = "nosniff"
            response["Cache-Control"] = "private, no-store"
            return response

        except (FileConversionError, OSError, ValueError) as error:
            return HttpResponse(
                f"Preview failed: {error}",
                status=422,
            )
        finally:
            upstream.close()

    upstream_content_type = upstream.headers.get_content_type()
    content_type = (
        mimetypes.guess_type(filename)[0]
        if upstream_content_type in (
            None,
            "application/octet-stream",
        )
        else upstream_content_type
    ) or "application/octet-stream"

    inline_type = (
        content_type == "application/pdf"
        or content_type.startswith("image/")
    )
    as_attachment = download or not inline_type

    response = StreamingHttpResponse(
        iter(lambda: upstream.read(64 * 1024), b""),
        content_type=content_type,
    )
    response._resource_closers.append(upstream.close)
    response["Content-Disposition"] = content_disposition_header(
        as_attachment=as_attachment,
        filename=filename,
    )
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "private, no-store"
    response["Access-Control-Expose-Headers"] = "Content-Disposition"

    content_length = upstream.headers.get("Content-Length")
    if content_length:
        response["Content-Length"] = content_length

    return response
