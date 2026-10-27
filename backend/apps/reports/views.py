import csv
import json

from django.http import HttpResponse
from django.core.serializers.json import DjangoJSONEncoder

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .permissions import IsAdminRole
from .serializers import validate_report_filters
from .services import REPORT_FILTERS, REPORT_SERVICES


def _csv_value(value):
    if isinstance(value, (dict, list, tuple)):
        return json.dumps(value, cls=DjangoJSONEncoder)
    if value is None:
        return ""
    return value


def _csv_response(report_name, payload):
    rows = payload.get("records")
    if not isinstance(rows, list):
        rows = [payload]

    headers = []
    for row in rows:
        if isinstance(row, dict):
            for key in row:
                if key not in headers:
                    headers.append(key)

    if not headers:
        headers = list(payload.keys())
        rows = [payload]

    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = (
        f'attachment; filename="{report_name}-report.csv"'
    )
    writer = csv.DictWriter(response, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({
            key: _csv_value(value)
            for key, value in row.items()
        })
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def report(request, report_name):
    filters = validate_report_filters(
        request.query_params,
        REPORT_FILTERS[report_name],
    )
    payload = REPORT_SERVICES[report_name](filters)
    if filters["export"] == "csv":
        return _csv_response(report_name, payload)
    return Response(payload)
