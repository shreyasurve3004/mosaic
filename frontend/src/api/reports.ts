import { apiRequest } from "./client"
import { getAccessToken } from "./session"

export type ReportName =
  | "students"
  | "attendance"
  | "results"
  | "assignments"
  | "faculty"
  | "library"
  | "events"
  | "notices"

export interface ReportFilters {
  date_from?: string
  date_to?: string
  page_size?: number
}

export interface ReportsOverview {
  total_students: number
  total_faculty: number
  total_courses: number
  total_departments: number
  total_books: number
  total_events: number
  total_notices: number
}

export interface PaginatedReport<T> {
  count: number
  page: number
  page_size: number
  has_next: boolean
  records: T[]
}

export interface StudentReportRecord {
  name: string
  roll_number: string
  branch: string
  department: string
  department_code: string
  year: number
  semester: number
  division: string
  email: string
  enrolled_courses: Array<{
    course_id: string
    course_name: string
    semester: number
  }>
}

export interface AttendanceReportRecord {
  student__roll_no: string
  student__full_name: string
  student__branch: string
  student__year: number
  student__sem: number
  student__div: string
  course_id: string
  course_name: string
  total_classes: number
  attended_classes: number
  absent_classes: number
  attendance_percentage: number
}

export interface AttendanceReport extends PaginatedReport<AttendanceReportRecord> {
  summary: {
    total_classes: number
    attended_classes: number
    absent_classes: number
    attendance_percentage: number
  }
}

export interface ResultsReportRecord {
  result_id: number
  student: string
  roll_number: string
  branch: string
  year: number
  division: string
  academic_year: string
  semester: number
  sgpi: string
  cgpa: string
  semester_result_status: string
  is_published: boolean
  course_id: string
  course_name: string
  isa: number
  mse: number
  ese: number
  total_marks: number
  grade: string
  grade_point: number
}

export interface ResultsReport {
  summary: {
    result_count: number
    average_marks: number | null
  }
  records: ResultsReportRecord[]
  count: number
  page: number
  page_size: number
  has_next: boolean
  semester_performance: Array<{
    student: string
    roll_number: string
    academic_year: string
    semester: number
    sgpi: string
    cgpa: string
    total_credits: number
    result_status: string
    is_published: boolean
  }>
  semester_performance_count: number
}

export interface AssignmentsReportRecord {
  assignment_id: number
  title: string
  course_id: string
  course_name: string
  faculty: string
  due_date: string
  is_active: boolean
  enrolled_students: number
  handed_in: number
  pending: number
  draft_submissions: number
  graded: number
}

export interface AssignmentsReport extends PaginatedReport<AssignmentsReportRecord> {
  summary: {
    total_assignments: number
    enrolled_students: number
    handed_in: number
    graded: number
    pending: number
  }
}

export interface FacultyReportRecord {
  faculty_id: string
  full_name: string
  faculty_email: string
  department__department_name: string
  department__department_code: string
  assigned_course_count: number
  faculty_course_assignment_count: number
  timetable_entry_count: number
}

export interface LibraryReportRecord {
  borrow_id: number
  book_title: string
  isbn: string
  user_email: string
  status: string
  reservation_date: string
  borrow_date: string | null
  due_date: string | null
  return_date: string | null
  is_overdue: boolean
}

export interface LibraryReport extends PaginatedReport<LibraryReportRecord> {
  summary: {
    total_titles: number
    total_copies: number
    available_copies: number
    borrowed_records: number
    reserved_records: number
    returned_records: number
    overdue_records: number
  }
}

export interface EventsReportRecord {
  event_id: number
  event_name: string
  event_type: string
  event_date: string
  time: string
  end_time: string | null
  status: string
  organizer: string
  registered_count: number
  attended_count: number
}

export interface EventsReport extends PaginatedReport<EventsReportRecord> {
  summary: {
    total_events: number
    events_by_status: Record<string, number>
    registrations_by_status: Record<string, number>
    total_registrations: number
  }
}

export interface NoticesReportRecord {
  notice_id: number
  title: string
  category: string
  priority: string
  status: string
  target_year: string
  published_date: string | null
  expiry_date: string | null
}

export interface NoticesReport extends PaginatedReport<NoticesReportRecord> {
  summary: {
    total_notices: number
    published_notices: number
    draft_notices: number
    archived_notices: number
    active_notices: number
  }
  by_category: Array<{
    category: string
    count: number
  }>
}

export interface ReportDataMap {
  students: PaginatedReport<StudentReportRecord>
  attendance: AttendanceReport
  results: ResultsReport
  assignments: AssignmentsReport
  faculty: PaginatedReport<FacultyReportRecord>
  library: LibraryReport
  events: EventsReport
  notices: NoticesReport
}

function getErrorMessage(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null
  if ("detail" in data && typeof data.detail === "string") return data.detail
  if ("message" in data && typeof data.message === "string") return data.message

  const messages = Object.entries(data).flatMap(([field, value]) => {
    const items = Array.isArray(value) ? value : [value]
    return items
      .filter((item): item is string => typeof item === "string")
      .map(message => `${field}: ${message}`)
  })
  return messages.length > 0 ? messages.join(" ") : null
}

const dateFilteredReports: ReportName[] = [
  "attendance",
  "assignments",
  "library",
  "events",
  "notices",
]

function buildQuery(
  reportName: ReportName,
  filters: ReportFilters,
  exportCsv = false
): string {
  const query = new URLSearchParams()
  if (dateFilteredReports.includes(reportName)) {
    if (filters.date_from) query.set("date_from", filters.date_from)
    if (filters.date_to) query.set("date_to", filters.date_to)
  }
  if (filters.page_size) query.set("page_size", String(filters.page_size))
  if (exportCsv) query.set("export", "csv")
  return query.toString()
}

export async function getReportsOverview(): Promise<ReportsOverview> {
  return apiRequest<ReportsOverview>("/api/reports/overview/", {
    method: "GET",
    token: getAccessToken() ?? undefined,
  })
}


export async function getReport<K extends ReportName>(
  reportName: K,
  filters: ReportFilters = {}
): Promise<ReportDataMap[K]> {
  const query = buildQuery(reportName, filters)
  const endpoint = `/api/reports/${reportName}/${query ? `?${query}` : ""}`

  const data = await apiRequest<unknown>(endpoint, {
    method: "GET",
    token: getAccessToken() ?? undefined,
  })

  if (
    typeof data !== "object" ||
    data === null ||
    !("records" in data) ||
    !Array.isArray(data.records)
  ) {
    throw new Error(
      `Invalid response from ${endpoint}. Expected an object containing a records array.`
    )
  }

  return data as ReportDataMap[K]
}


export async function downloadReportCsv(
  reportName: ReportName,
  filters: ReportFilters = {}
): Promise<{ blob: Blob; filename: string }> {
  const query = buildQuery(reportName, filters, true)
  const token = getAccessToken()
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/api/reports/${reportName}/?${query}`,
    {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  )

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => null)
    const message =
      getErrorMessage(errorData) ??
      "Unable to download this report. Please try again."
    throw new Error(message)
  }

  const disposition = response.headers.get("Content-Disposition") ?? ""
  const encodedFilename = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const quotedFilename = disposition.match(/filename="([^"]+)"/i)?.[1]
  let filename = quotedFilename ?? encodedFilename ?? `${reportName}-report.csv`
  if (encodedFilename) {
    try {
      filename = decodeURIComponent(encodedFilename)
    } catch {
      filename = encodedFilename
    }
  }

  return {
    blob: await response.blob(),
    filename,
  }
}
