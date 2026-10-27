import { apiRequest } from "./client"
import { getAccessToken } from "./session"

export interface AdminDepartment {
  department_id: number
  department_name: string
  department_code: string
}

export interface AdminCourse {
  course_id: string
  course_name: string
  course_sem: number
  credits: number
  department: number
  department_name: string
  department_code: string
}

export interface AdminFacultyCourse {
  faculty_course_id: number
  faculty: number
  faculty_id: string
  faculty_name: string
  course: string
  course_code: string
  course_name: string
  sem: number
  year: number
  div: string
  batch: string | null
  class_type: "lecture" | "practical"
  academic_year: string
}

export interface AdminTimetable {
  timetable_id: number
  faculty_course: number
  room: string
  day: string
  start_time: string
  end_time: string

  course_id: string
  course_name: string
  faculty_id: string
  faculty_name: string
  year: number
  sem: number
  div: string
  batch: string | null
  class_type: "lecture" | "practical"
  academic_year: string

  room_no: string
  block: string
  floor: number
  room_type: string
}

export interface AcademicCalendarEvent {
  calendar_id: number
  academic_year: string
  semester: number | null
  title: string
  category:
    | "semester"
    | "examination"
    | "holiday"
    | "registration"
    | "result"
    | "semester_break"
    | "academic_event"
    | "other"
  start_date: string
  end_date: string
  description: string
  created_at: string
  updated_at: string
}

export interface AcademicCalendarFilters {
  academic_year?: string
  semester?: number
  category?: AcademicCalendarEvent["category"]
  start_date?: string
  end_date?: string
}

export interface AdminResult {
  result_id: number
  course: string
  course_id: string
  course_name: string
  credits: number
  isa: number | null
  mse: number | null
  ese: number | null
  total_marks: number | null
  grade: string | null
  grade_point: number | null
}

export interface AdminSemesterResult {
  semester_result_id: number
  student: number
  student_name?: string
  roll_no?: string
  student_year?: number
  student_division?: string
  academic_year: string
  sem: number
  sgpi: number | null
  cgpa: number | null
  total_credits: number | null
  result_status: string
  is_published: boolean
  published_at: string | null
  results: AdminResult[]
}

export interface CreateDepartmentData {
  department_name: string
  department_code: string
}

export interface CreateCourseData {
  course_id: string
  course_name: string
  course_sem: number
  credits: number
  department: number
}

export interface CreateFacultyCourseData {
  faculty: number
  course: string
  sem: number
  year: number
  div: string
  batch?: string | null
  class_type: "lecture" | "practical"
  academic_year: string
}

export interface CreateTimetableData {
  faculty_course: number
  room: string
  day: string
  start_time: string
  end_time: string
}

export interface CreateAcademicCalendarData {
  academic_year: string
  semester?: number | null
  title: string
  category: AcademicCalendarEvent["category"]
  start_date: string
  end_date: string
  description?: string
}

export interface CreateSemesterResultData {
  student: string
  academic_year: string
  sem: number
  sgpi: number
  cgpa: number
  total_credits: number
  result_status: string
}

export interface CreateResultData {
  course: string
  isa: number | null
  mse: number | null
  ese: number | null
  total_marks: number | null
  grade: string | null
  grade_point: number | null
}

function token() {
  const accessToken = getAccessToken()

  if (!accessToken) {
    throw new Error("Your session has expired. Please log in again.")
  }

  return accessToken
}

/* -------------------------------------------------------------------------- */
/* Departments                                                                */
/* -------------------------------------------------------------------------- */

export async function getAdminDepartments(): Promise<AdminDepartment[]> {
  return apiRequest<AdminDepartment[]>(
    "/api/academics/admin/departments/",
    {
      method: "GET",
      token: token(),
    }
  )
}

export async function createAdminDepartment(
  data: CreateDepartmentData
): Promise<AdminDepartment> {
  return apiRequest<AdminDepartment>(
    "/api/academics/admin/departments/",
    {
      method: "POST",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function updateAdminDepartment(
  departmentId: number,
  data: Partial<CreateDepartmentData>
): Promise<AdminDepartment> {
  return apiRequest<AdminDepartment>(
    `/api/academics/admin/departments/${departmentId}/`,
    {
      method: "PATCH",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function deleteAdminDepartment(
  departmentId: number
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/api/academics/admin/departments/${departmentId}/`,
    {
      method: "DELETE",
      token: token(),
    }
  )
}

/* -------------------------------------------------------------------------- */
/* Courses                                                                    */
/* -------------------------------------------------------------------------- */

export async function getAdminCourses(): Promise<AdminCourse[]> {
  return apiRequest<AdminCourse[]>(
    "/api/academics/admin/courses/",
    {
      method: "GET",
      token: token(),
    }
  )
}

export async function createAdminCourse(
  data: CreateCourseData
): Promise<AdminCourse> {
  return apiRequest<AdminCourse>(
    "/api/academics/admin/courses/",
    {
      method: "POST",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function updateAdminCourse(
  courseId: string,
  data: Partial<CreateCourseData>
): Promise<AdminCourse> {
  return apiRequest<AdminCourse>(
    `/api/academics/admin/courses/${encodeURIComponent(courseId)}/`,
    {
      method: "PATCH",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function deleteAdminCourse(
  courseId: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/api/academics/admin/courses/${encodeURIComponent(courseId)}/`,
    {
      method: "DELETE",
      token: token(),
    }
  )
}

/* -------------------------------------------------------------------------- */
/* Faculty Course Assignments                                                 */
/* -------------------------------------------------------------------------- */

export async function getAdminFacultyCourses(): Promise<
  AdminFacultyCourse[]
> {
  return apiRequest<AdminFacultyCourse[]>(
    "/api/academics/admin/faculty-courses/",
    {
      method: "GET",
      token: token(),
    }
  )
}

export async function createAdminFacultyCourse(
  data: CreateFacultyCourseData
): Promise<AdminFacultyCourse> {
  return apiRequest<AdminFacultyCourse>(
    "/api/academics/admin/faculty-courses/",
    {
      method: "POST",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function updateAdminFacultyCourse(
  facultyCourseId: number,
  data: Partial<CreateFacultyCourseData>
): Promise<AdminFacultyCourse> {
  return apiRequest<AdminFacultyCourse>(
    `/api/academics/admin/faculty-courses/${facultyCourseId}/`,
    {
      method: "PATCH",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function deleteAdminFacultyCourse(
  facultyCourseId: number
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/api/academics/admin/faculty-courses/${facultyCourseId}/`,
    {
      method: "DELETE",
      token: token(),
    }
  )
}

/* -------------------------------------------------------------------------- */
/* Timetable                                                                   */
/* -------------------------------------------------------------------------- */

export async function getAdminTimetable(
  params: Record<string, string | number | undefined> = {}
): Promise<AdminTimetable[]> {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value))
    }
  })

  const query = searchParams.toString()

  return apiRequest<AdminTimetable[]>(
    `/api/academics/admin/timetable/${query ? `?${query}` : ""}`,
    {
      method: "GET",
      token: token(),
    }
  )
}

export async function createAdminTimetable(
  data: CreateTimetableData
): Promise<AdminTimetable> {
  return apiRequest<AdminTimetable>(
    "/api/academics/admin/timetable/",
    {
      method: "POST",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function updateAdminTimetable(
  timetableId: number,
  data: Partial<CreateTimetableData>
): Promise<AdminTimetable> {
  return apiRequest<AdminTimetable>(
    `/api/academics/admin/timetable/${timetableId}/`,
    {
      method: "PATCH",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function deleteAdminTimetable(
  timetableId: number
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/api/academics/admin/timetable/${timetableId}/`,
    {
      method: "DELETE",
      token: token(),
    }
  )
}

/* -------------------------------------------------------------------------- */
/* Academic Calendar                                                           */
/* -------------------------------------------------------------------------- */

export async function getAcademicCalendar(
  filters: AcademicCalendarFilters = {}
): Promise<AcademicCalendarEvent[]> {
  const query = new URLSearchParams()
  if (filters.academic_year) query.set("academic_year", filters.academic_year)
  if (filters.semester !== undefined) {
    query.set("semester", String(filters.semester))
  }
  if (filters.category) query.set("category", filters.category)
  if (filters.start_date) query.set("start_date", filters.start_date)
  if (filters.end_date) query.set("end_date", filters.end_date)
  const suffix = query.toString()

  return apiRequest<AcademicCalendarEvent[]>(
    `/api/academics/calendar/${suffix ? `?${suffix}` : ""}`,
    {
      method: "GET",
      token: token(),
    }
  )
}

export async function createAcademicCalendarEvent(
  data: CreateAcademicCalendarData
): Promise<AcademicCalendarEvent> {
  return apiRequest<AcademicCalendarEvent>(
    "/api/academics/calendar/",
    {
      method: "POST",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function updateAcademicCalendarEvent(
  calendarId: number,
  data: Partial<CreateAcademicCalendarData>
): Promise<AcademicCalendarEvent> {
  return apiRequest<AcademicCalendarEvent>(
    `/api/academics/calendar/${calendarId}/`,
    {
      method: "PATCH",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function deleteAcademicCalendarEvent(
  calendarId: number
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/api/academics/calendar/${calendarId}/`,
    {
      method: "DELETE",
      token: token(),
    }
  )
}

/* -------------------------------------------------------------------------- */
/* Results                                                                     */
/* -------------------------------------------------------------------------- */

export async function getAdminResults(): Promise<AdminSemesterResult[]> {
  return apiRequest<AdminSemesterResult[]>(
    "/api/academics/admin/results/",
    {
      method: "GET",
      token: token(),
    }
  )
}

export async function createSemesterResult(
  data: CreateSemesterResultData
): Promise<AdminSemesterResult> {
  return apiRequest<AdminSemesterResult>(
    "/api/academics/admin/results/semester/",
    {
      method: "POST",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function updateSemesterResult(
  semesterResultId: number,
  data: Partial<CreateSemesterResultData>
): Promise<AdminSemesterResult> {
  return apiRequest<AdminSemesterResult>(
    `/api/academics/admin/results/semester/${semesterResultId}/`,
    {
      method: "PATCH",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function createResult(
  semesterResultId: number,
  data: CreateResultData
): Promise<AdminResult> {
  return apiRequest<AdminResult>(
    `/api/academics/admin/results/semester/${semesterResultId}/results/`,
    {
      method: "POST",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function updateResult(
  semesterResultId: number,
  resultId: number,
  data: Partial<CreateResultData>
): Promise<AdminResult> {
  return apiRequest<AdminResult>(
    `/api/academics/admin/results/semester/${semesterResultId}/results/${resultId}/`,
    {
      method: "PATCH",
      token: token(),
      body: JSON.stringify(data),
    }
  )
}

export async function publishSemesterResults(
  academicYear: string,
  sem: number
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    "/api/academics/admin/results/publish/",
    {
      method: "POST",
      token: token(),
      body: JSON.stringify({
        academic_year: academicYear,
        sem,
      }),
    }
  )
}