import { apiRequest } from "./client"

export interface AdminDashboardStats {
  total_students: number
  total_faculty: number
  total_departments: number
  active_courses: number
}

export interface AdminNotice {
  notice_id: number
  user_id: string
  title: string
  category: string
  priority: "Low" | "Medium" | "High"
  content: string
  published_date: string | null
  expiry_date: string | null
  status: "Draft" | "Published" | "Archived"
  target_year: string
  attachments: unknown[]
  renewal_history: unknown[]
  is_expired: boolean
  is_active: boolean
}

export interface AdminEvent {
  event_id: number
  event_name: string
  event_type: string
  description: string
  event_date: string
  time: string
  location: string
  room_no: string
  organizer: string
  capacity: number
  status: "Upcoming" | "Ongoing" | "Completed" | "Cancelled"
  attachments: unknown[]
  created_by: string | null
  registered_count: number
  available_seats: number
  is_full: boolean
}

export async function getAdminDashboard(
  token: string
): Promise<AdminDashboardStats> {
  return apiRequest<AdminDashboardStats>(
    "/api/academics/admin/dashboard/",
    {
      method: "GET",
      token,
    }
  )
}

export async function getAdminNotices(
  token: string
): Promise<AdminNotice[]> {
  return apiRequest<AdminNotice[]>(
    "/api/notices/?status=Published",
    {
      method: "GET",
      token,
    }
  )
}

export async function archiveAdminNotice(
  token: string,
  noticeId: number
): Promise<AdminNotice> {
  return apiRequest<AdminNotice>(
    `/api/notices/${noticeId}/`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({
        status: "Archived",
      }),
    }
  )
}

export async function deleteAdminNotice(
  token: string,
  noticeId: number
): Promise<void> {
  await apiRequest<void>(
    `/api/notices/${noticeId}/`,
    {
      method: "DELETE",
      token,
    }
  )
}

export async function getAdminUpcomingEvents(
  token: string
): Promise<AdminEvent[]> {
  return apiRequest<AdminEvent[]>(
    "/api/events/upcoming/",
    {
      method: "GET",
      token,
    }
  )
}