import { apiRequest } from "./client"
import { getAccessToken } from "./session"

export type Division = "A" | "B" | "C"

export interface Resource {
  resource_id: number
  faculty_course: number

  department_code: string
  department_name: string

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

  // Division folder for PPT / Notes.
  // Null for resources that do not belong to a division folder.
  resource_division: Division | null

  title: string
  resource_type: ResourceType
  file_url: string
  original_file_name: string
  upload_date: string
}

export type ResourceType =
  | "study_material"
  | "ppt_notes"
  | "ebooks"
  | "assignments"
  | "practical"
  | "tutorials"
  | "syllabus"
  | "question_papers"
  | "mse"
  | "ese"
  | "other"

export interface FacultyResourceCourse {
  faculty_course_id: number
  course_code: string
  course_name: string
  year: number
  sem: number
  div: string
  batch: string | null
  class_type: string
  academic_year: string
}

export async function getFacultyResources(
  facultyCourseId?: number
): Promise<Resource[]> {
  const query = facultyCourseId
    ? `?faculty_course=${facultyCourseId}`
    : ""

  return apiRequest<Resource[]>(
    `/api/academics/resources/${query}`,
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

async function multipartRequest<T>(
  endpoint: string,
  formData: FormData,
  method: "POST" | "PUT" = "POST"
): Promise<T> {
  const token = getAccessToken()

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}${endpoint}`,
    {
      method,
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

  const data = await response
    .json()
    .catch(() => ({}))

  if (!response.ok) {
    console.error("Resource upload failed:", {
      status: response.status,
      response: data,
    })

    const details =
      typeof data.details === "string"
        ? data.details
        : data.details
          ? JSON.stringify(data.details)
          : ""

    throw new Error(
      details ||
        data.message ||
        data.detail ||
        data.error ||
        "Something went wrong with the request."
    )
  }

  return data as T
}

export async function createResource(
  facultyCourseId: number,
  title: string,
  resourceType: ResourceType,
  file: File,
  resourceDivision: Division | null = null
): Promise<Resource> {
  const formData = new FormData()

  formData.append(
    "faculty_course",
    String(facultyCourseId)
  )

  formData.append("title", title)
  formData.append("resource_type", resourceType)
  formData.append("file", file)

  if (resourceType === "ppt_notes") {
    if (!resourceDivision) {
      throw new Error(
        "Select Division A, B, or C before uploading PPT / Notes."
      )
    }

    formData.append(
      "resource_division",
      resourceDivision
    )
  }

  return multipartRequest<Resource>(
    "/api/academics/resources/create/",
    formData
  )
}

export async function deleteResource(
  resourceId: number
): Promise<void> {
  await apiRequest<unknown>(
    `/api/academics/resources/${resourceId}/`,
    {
      method: "DELETE",
      token: getAccessToken() ?? undefined,
    }
  )
}
