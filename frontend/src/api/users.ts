import { apiRequest } from "./client"
import { getAccessToken } from "./session"

export interface AdminUserProfile {
  studentPk?: number
  facultyPk?: number
  rollNo?: string
  department?: string
  departmentId?: number
  year?: number
  sem?: number
  division?: string
  academicYear?: string
  scheme?: string
  branch?: string
  batch?: string | null
  specialization?: string | null
  phone?: string | null
  address?: string | null

  facultyId?: string
  designation?: string
  facultySubject?: string | null
  facultyEmail?: string | null
  qualification?: string | null
  experience?: number | null
  bio?: string | null
  officeRoom?: string | null
}

export interface AdminDepartment {
  department_id: number
  department_name: string
  department_code: string
}

export async function getAdminDepartments(
  token: string
): Promise<AdminDepartment[]> {
  return apiRequest<AdminDepartment[]>(
    "/api/academics/admin/departments/",
    {
      method: "GET",
      token,
    }
  )
}

export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: "student" | "faculty"
  status: "active" | "pending" | "inactive" | "suspended"
  isVerified: boolean
  createdAt: string
  profile: AdminUserProfile | null
}

export async function getAdminUsers(
  token?: string
): Promise<AdminUser[]> {
  return apiRequest<AdminUser[]>("/api/users/admin/users/", {
    method: "GET",
    token: token ?? getAccessToken() ?? undefined,
  })
}

export async function updateAdminUserStatus(
  token: string,
  userId: string,
  status: "active" | "inactive" | "suspended"
): Promise<{
  message: string
  user: AdminUser
}> {
  return apiRequest("/api/users/admin/users/" + userId + "/status/", {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
  })
}

export interface CreateAdminUserData {
  email: string
  firstName: string
  lastName: string
  role: "student" | "faculty"
  department: number

  // Student fields
  rollNo?: string
  year?: number
  sem?: number
  div?: string
  academicYear?: string
  scheme?: string
  branch?: string
  batch?: string
  specialization?: string

  // Faculty fields
  facultyId?: string
  facultySubject?: string
  phone?: string
  designation?: string
  qualification?: string
  experience?: number
  bio?: string
  officeRoom?: string
}

export async function createAdminUser(
  token: string,
  data: CreateAdminUserData
): Promise<{
  message: string
  user: {
    id: string
    email: string
    name: string
    role: "student" | "faculty"
    status: string
  }
}> {
  return apiRequest("/api/users/admin/create-user/", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  })
}

export interface UpdateAdminUserData {
  firstName: string
  lastName: string
  email: string
  department: number

  // Student fields
  rollNo?: string
  year?: number
  sem?: number
  div?: string
  academicYear?: string
  scheme?: string
  branch?: string
  batch?: string | null
  specialization?: string | null
  phone?: string | null
  address?: string | null

  // Faculty fields
  facultyId?: string
  facultySubject?: string | null
  designation?: string
  qualification?: string | null
  experience?: number | null
  bio?: string | null
  officeRoom?: string | null
}

export async function updateAdminUser(
  token: string,
  userId: string,
  data: UpdateAdminUserData
): Promise<{
  message: string
}> {
  return apiRequest(
    "/api/users/admin/users/" + userId + "/",
    {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }
  )
}

export async function deleteAdminUser(
  token: string,
  userId: string
): Promise<{
  message: string
  email: string
}> {
  return apiRequest(
    "/api/users/admin/users/" + userId + "/",
    {
      method: "DELETE",
      token,
    }
  )
}