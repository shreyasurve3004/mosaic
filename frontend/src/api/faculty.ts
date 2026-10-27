import { apiRequest } from "./client"
import { getAccessToken } from "./session"

export interface FacultyCourse {
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

export interface FacultyStudent {
  roll_no: string
  student_name: string
  email: string
  year: number
  sem: number
  div: string
  batch: string | null
}

export async function getFacultyCourses(): Promise<FacultyCourse[]> {
  return apiRequest<FacultyCourse[]>(
    "/api/academics/faculty-courses/",
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function getFacultyCourseStudents(
  facultyCourseId: number
): Promise<FacultyStudent[]> {
  return apiRequest<FacultyStudent[]>(
    `/api/academics/faculty-courses/${facultyCourseId}/students/`,
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export interface StudentPerformance {
  id: string
  name: string
  rollNo: string
  attendancePct: number
  avgMarks: number
  completed: number
  total: number
  status: "good" | "warn" | "alert"
  hasGrades: boolean
}

export interface StudentPerformanceResponse {
  students: StudentPerformance[]
  courseAverages: {
    label: string
    value: number
    color: string
  }[]
  attendanceBuckets: {
    label: string
    min: number
    val: number
    pct: number
    color: string
  }[]
}

export async function getFacultyStudentPerformance(): Promise<StudentPerformanceResponse> {
  return apiRequest<StudentPerformanceResponse>(
    "/api/academics/faculty/student-performance/",
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}


export interface FacultyProfile {
  faculty_id: string
  full_name: string
  faculty_email: string
  phone: string | null
  department: string
  specialization: string | null
  designation: string | null
  profile_photo_url?: string | null
  faculty_subject?: string | null
  qualification?: string | null
  experience?: number | null
  bio?: string | null
  office_room?: string | null
}

interface UserProfileApiResponse {
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    full_name: string
    phone: string | null
    role: "student" | "faculty" | "admin"
    status: string
    is_verified?: boolean
    created_at?: string
  }
  profile_type: "student" | "faculty" | "admin"
  profile: {
    faculty_id?: string
    full_name?: string
    faculty_email?: string | null
    phone?: string | null
    department_id?: string | number
    department_name?: string
    department_code?: string
    designation?: string | null
    specialization?: string | null
    profile_photo_url?: string | null
    faculty_subject?: string | null
    qualification?: string | null
    experience?: number | null
    bio?: string | null
    office_room?: string | null
  } | null
}

function mapFacultyProfile(
  response: UserProfileApiResponse
): FacultyProfile {
  if (response.profile_type !== "faculty" || !response.profile) {
    throw new Error("The authenticated account does not have a faculty profile.")
  }

  const profile = response.profile

  return {
    faculty_id: profile.faculty_id ?? "",
    full_name: profile.full_name ?? response.user.full_name,
    faculty_email: profile.faculty_email ?? response.user.email,
    phone: profile.phone ?? response.user.phone ?? null,
    department: profile.department_name ?? "",
    designation: profile.designation ?? null,
    specialization: profile.specialization ?? null,
    profile_photo_url: profile.profile_photo_url ?? null,
    faculty_subject: profile.faculty_subject ?? null,
    qualification: profile.qualification ?? null,
    experience: profile.experience ?? null,
    bio: profile.bio ?? null,
    office_room: profile.office_room ?? null,
  }
}

export async function getFacultyProfile(): Promise<FacultyProfile> {
  const response = await apiRequest<UserProfileApiResponse>(
    "/api/users/profile/",
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )

  return mapFacultyProfile(response)
}

export async function updateFacultyProfile(
  data: {
    full_name: string
    phone: string
  }
): Promise<FacultyProfile> {
  await apiRequest<{
    detail: string
    user: UserProfileApiResponse["user"]
    profile_type: string
  }>("/api/users/profile/", {
    method: "PATCH",
    token: getAccessToken() ?? undefined,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profile: {
        full_name: data.full_name,
        phone: data.phone || null,
      },
    }),
  })

  // PATCH returns a status summary, so fetch the complete updated profile.
  return getFacultyProfile()
}
