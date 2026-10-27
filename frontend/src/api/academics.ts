import { apiRequest } from "./client"
import { getAccessToken } from "./session"

export interface StudentProfile {
  roll_no: string
  full_name: string
  department_id: number | null
  department_name: string | null
  department_code: string | null
  year: number | null
  sem: number | null
  div: string | null
  academic_year: string | null
  scheme: string | null
  branch: string | null
  batch: string | null
  specialization: string | null
}

export interface AttendanceSummary {
  course_id: string
  course_name: string
  total_lectures: number
  present: number
  absent: number
  percentage: number
}

export interface AttendanceRecord {
  attendance_id: number
  roll_no: string
  course_id: string
  course_name: string
  date: string
  lecture_no: number
  status: string
  timetable: number
}

export interface StudentAttendanceResponse {
  summary: AttendanceSummary[]
  records: AttendanceRecord[]
}

export interface StudentTimetableItem {
  timetable_id: number
  faculty_course: number
  room: number
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
  class_type: string
  academic_year: string
  room_no: string
  block: string
  floor: number
  room_type: string
}

export interface ResourceItem {
  resource_id: number
  faculty_course: number
  course_id: string
  course_name: string
  faculty_name: string
  div: string
  resource_division: "A" | "B" | "C" | null
  title: string
  resource_type: string
  file_url: string
  original_file_name: string
  upload_date: string
}

export interface StudentResourceCourse {
  course_id: string
  course_name: string
  resources: ResourceItem[]
}

export interface StudentResourcesResponse {
  current_semester: number
  courses: StudentResourceCourse[]
}

export interface ResultItem {
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

export interface SemesterResult {
  semester_result_id: number
  student: number
  student_name?: string
  roll_no?: string
  student_year?: number
  student_division?: string
  academic_year: string
  sem: number
  sgpi: number | string | null
  cgpa: number | string | null
  total_credits: number
  result_status: string
  is_published: boolean
  published_at: string | null
  results: ResultItem[]
}

export async function getStudentProfile(): Promise<StudentProfile> {
  return apiRequest<StudentProfile>("/api/users/me/student/", {
    method: "GET",
    token: getAccessToken() ?? undefined,
  })
}

export async function getStudentAttendance(): Promise<StudentAttendanceResponse> {
  return apiRequest<StudentAttendanceResponse>(
    "/api/academics/attendance/student/",
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function getStudentTimetable(): Promise<StudentTimetableItem[]> {
  return apiRequest<StudentTimetableItem[]>(
    "/api/academics/student/timetable/",
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function getStudentResources(): Promise<StudentResourcesResponse> {
  return apiRequest<StudentResourcesResponse>("/api/academics/resources/", {
    method: "GET",
    token: getAccessToken() ?? undefined,
  })
}

export async function getStudentResults(): Promise<SemesterResult[]> {
  return apiRequest<SemesterResult[]>("/api/academics/results/", {
    method: "GET",
    token: getAccessToken() ?? undefined,
  })
}
