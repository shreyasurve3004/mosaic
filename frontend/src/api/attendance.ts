import { apiRequest } from "./client"
import { getAccessToken } from "./session"

export interface FacultyAttendanceTimetable {
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

export interface AttendanceStudent {
  roll_no: string
  student_name: string
  status: "present" | "absent"
}

export interface MarkAttendanceData {
  timetable_id: number
  date: string
  lecture_no: number
  attendance: AttendanceStudent[]
}

export interface AttendanceRecord {
  attendance_id: number
  roll_no: string
  student_name?: string
  course_id: string
  course_name: string
  date: string
  lecture_no: number
  status: string
  timetable: number
}

export async function getFacultyTimetable(): Promise<
  FacultyAttendanceTimetable[]
> {
  return apiRequest<FacultyAttendanceTimetable[]>(
    "/api/academics/faculty/timetable/",
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function markAttendance(
  data: MarkAttendanceData
): Promise<AttendanceRecord[]> {
  return apiRequest<AttendanceRecord[]>(
    "/api/academics/attendance/",
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify(data),
    }
  )
}

export async function updateAttendance(
  data: MarkAttendanceData
): Promise<AttendanceRecord[]> {
  return apiRequest<AttendanceRecord[]>(
    "/api/academics/attendance/",
    {
      method: "PUT",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify(data),
    }
  )
}

export async function getAttendanceStudents(
  timetableId: number
): Promise<AttendanceStudent[]> {
  return apiRequest<AttendanceStudent[]>(
    `/api/academics/attendance/students/?timetable_id=${timetableId}`,
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}