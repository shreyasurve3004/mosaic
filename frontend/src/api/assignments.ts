import { apiRequest } from "./client"
import { getAccessToken } from "./session"

export interface AssignmentFile {
  assignment_file_id: number
  file_name: string
  file_url: string
  uploaded_at: string
}

export interface FacultyCourse {
  faculty_course_id: number
  faculty: number
  faculty_id: string
  faculty_name: string
  course: number
  course_code: string
  course_name: string
  sem: number
  year: number
  div: string
  batch: string | null
  class_type: string
  academic_year: string
}

export interface Assignment {
  assignment_id: number
  my_submission_status:
    | "draft"
    | "submitted"
    | "returned"
    | "not_submitted"
    | null
  faculty_course: number
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
  title: string
  description: string
  due_date: string
  max_marks: number
  allow_late_submission: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  files: AssignmentFile[]
}

export interface SubmissionFile {
  submission_file_id: number
  file_name: string
  file_url: string
  uploaded_at: string
}

export interface Submission {
  submission_id: number | null
  student_id: number
  student_roll_no: string
  student_name: string
  assignment_id: number
  assignment_title: string
  course_id: string
  course_name: string
  due_date: string
  max_marks: number
  allow_late_submission: boolean
  is_active: boolean
  submitted_at: string | null
  is_late: boolean
  status: "draft" | "submitted" | "returned" | "not_submitted"
  marks: number | null
  feedback: string | null
  files: SubmissionFile[]
}

async function multipartRequest<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = getAccessToken()

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}${endpoint}`,
    {
      method: "POST",
      headers: {
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
      body: formData,
    }
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    console.error("Multipart upload failed:", {
      status: response.status,
      statusText: response.statusText,
      endpoint,
      response: data,
    })

    throw new Error(
      data.message ||
        data.detail ||
        data.error ||
        JSON.stringify(data) ||
        `Request failed with status ${response.status}`
    )
  }

  return data as T
}

export async function getAssignments(): Promise<Assignment[]> {
  return apiRequest<Assignment[]>("/api/academics/assignments/", {
    method: "GET",
    token: getAccessToken() ?? undefined,
  })
}

export async function getAssignment(
  assignmentId: number
): Promise<Assignment> {
  return apiRequest<Assignment>(
    `/api/academics/assignments/${assignmentId}/`,
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function getAssignmentSubmissions(
  assignmentId: number
): Promise<Submission[]> {
  return apiRequest<Submission[]>(
    `/api/academics/assignments/${assignmentId}/submissions/`,
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function gradeSubmission(
  assignmentId: number,
  submissionId: number,
  marks: number,
  feedback?: string
): Promise<Submission> {
  return apiRequest<Submission>(
    `/api/academics/assignments/${assignmentId}/submissions/${submissionId}/`,
    {
      method: "PUT",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify({
        marks,
        ...(feedback !== undefined ? { feedback } : {}),
      }),
    }
  )
}

export async function returnSubmission(
  assignmentId: number,
  submissionId: number
): Promise<Submission> {
  return apiRequest<Submission>(
    `/api/academics/assignments/${assignmentId}/submissions/${submissionId}/return/`,
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify({}),
    }
  )
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

export async function createAssignment(data: {
  faculty_course: number
  title: string
  description: string
  due_date: string
  max_marks: number
  allow_late_submission: boolean
  is_active: boolean
}): Promise<Assignment> {
  return apiRequest<Assignment>(
    "/api/academics/assignments/",
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify(data),
    }
  )
}

export async function updateAssignment(
  assignmentId: number,
  data: Partial<{
    title: string
    description: string
    due_date: string
    max_marks: number
    allow_late_submission: boolean
    is_active: boolean
  }>
): Promise<Assignment> {
  return apiRequest<Assignment>(
    `/api/academics/assignments/${assignmentId}/`,
    {
      method: "PUT",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify(data),
    }
  )
}

export async function deleteAssignment(
  assignmentId: number
): Promise<void> {
  await apiRequest<unknown>(
    `/api/academics/assignments/${assignmentId}/`,
    {
      method: "DELETE",
      token: getAccessToken() ?? undefined,
    }
  )
}

type StudentSubmissionResponse =
  | Submission
  | {
      submission: null
      status: "not_submitted"
      files: SubmissionFile[]
    }

export async function getStudentSubmission(
  assignmentId: number
): Promise<Submission | null> {
  const response = await apiRequest<StudentSubmissionResponse>(
    `/api/academics/assignments/${assignmentId}/submission/`,
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )

  return "submission" in response ? response.submission : response
}

export async function uploadSubmissionFiles(
  assignmentId: number,
  files: File[]
): Promise<SubmissionFile[]> {
  const formData = new FormData()

  files.forEach((file) => {
    formData.append("files", file)
  })

  return multipartRequest<SubmissionFile[]>(
    `/api/academics/assignments/${assignmentId}/submission/files/`,
    formData
  )
}

export async function handInSubmission(
  assignmentId: number
): Promise<Submission> {
  return apiRequest<Submission>(
    `/api/academics/assignments/${assignmentId}/submission/hand-in/`,
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify({}),
    }
  )
}

export async function undoHandInSubmission(
  assignmentId: number
): Promise<Submission> {
  return apiRequest<Submission>(
    `/api/academics/assignments/${assignmentId}/submission/undo-hand-in/`,
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify({}),
    }
  )
}

export async function deleteSubmissionFile(
  assignmentId: number,
  submissionFileId: number
): Promise<void> {
  await apiRequest<unknown>(
    `/api/academics/assignments/${assignmentId}/submission/files/${submissionFileId}/`,
    {
      method: "DELETE",
      token: getAccessToken() ?? undefined,
    }
  )
}
