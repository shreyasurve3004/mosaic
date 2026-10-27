import io
from email.message import Message
from unittest.mock import Mock, patch

from django.test import RequestFactory, SimpleTestCase

from config.file_delivery import serve_cloudinary_file


class FileDeliveryTests(SimpleTestCase):
    def make_upstream(self, content_type):
        upstream = io.BytesIO(b"file contents")
        upstream.headers = Message()
        upstream.headers["Content-Type"] = content_type
        upstream.headers["Content-Length"] = str(len(b"file contents"))
        upstream.close = Mock()
        return upstream

    @patch("config.file_delivery.build_opener")
    def test_pdf_is_served_inline_for_preview(self, build_opener):
        upstream = self.make_upstream("application/pdf")
        build_opener.return_value.open.return_value = upstream

        response = serve_cloudinary_file(
            RequestFactory().get("/file/"),
            "https://res.cloudinary.com/demo/raw/upload/guide.pdf",
            "Course Guide",
        )

        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response["Content-Disposition"].startswith("inline;"))
        self.assertIn('filename="Course Guide.pdf"', response["Content-Disposition"])
        self.assertEqual(b"".join(response.streaming_content), b"file contents")
        response.close()

    @patch("config.file_delivery.build_opener")
    def test_image_can_be_downloaded_with_original_filename(self, build_opener):
        upstream = self.make_upstream("image/png")
        build_opener.return_value.open.return_value = upstream

        response = serve_cloudinary_file(
            RequestFactory().get("/file/?download=1"),
            "https://res.cloudinary.com/demo/image/upload/photo.png",
            "campus-poster.png",
        )

        self.assertEqual(response["Content-Type"], "image/png")
        self.assertTrue(
            response["Content-Disposition"].startswith("attachment;")
        )
        self.assertEqual(
            response["Access-Control-Expose-Headers"],
            "Content-Disposition",
        )
        self.assertIn("campus-poster.png", response["Content-Disposition"])
        response.close()
