import { apiRequest } from "./client"
import { getAccessToken } from "./session"

export interface NoticeAttachment {
  file_name?: string
  file_url?: string
  public_id?: string
  resource_type?: string
  format?: string
  file_type?: string | null
  file_size?: number
}

export interface Notice {
  notice_id: number
  user_id: string
  title: string
  category: string
  priority: "Low" | "Medium" | "High"
  content: string
  published_date: string | null
  expiry_date: string | null
  status: "Draft" | "Published" | "Archived"
  target_year: "ALL" | "1" | "2" | "3" | "4"
  attachments: NoticeAttachment[]
  renewal_history: unknown[]
  is_expired: boolean
  is_active: boolean
}

export interface NoticeRead {
  notice_read_id: number
  notice: number
  notice_title: string
  user_id: string
  read_date: string | null
  is_read: boolean
}

export async function getActiveNotices(
  targetYear?: number | "ALL"
): Promise<Notice[]> {
  const params = new URLSearchParams()

  params.set("active", "true")

  if (targetYear) {
    params.set("target_year", String(targetYear))
  }

  return apiRequest<Notice[]>(
    `/api/notices/?${params.toString()}`,
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function getNoticeReads(): Promise<NoticeRead[]> {
  return apiRequest<NoticeRead[]>(
    "/api/notices/reads/",
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function markNoticeRead(
  noticeId: number
): Promise<NoticeRead> {
  const response = await apiRequest<{
    message: string
    is_read: boolean
    notice_read: NoticeRead
  }>("/api/notices/reads/mark-read/", {
    method: "POST",
    token: getAccessToken() ?? undefined,
    body: JSON.stringify({
      notice_id: noticeId,
    }),
  })

  return response.notice_read
}

export async function markNoticeUnread(
  noticeId: number
): Promise<NoticeRead> {
  const response = await apiRequest<{
    message: string
    is_read: boolean
    notice_read: NoticeRead
  }>("/api/notices/reads/mark-unread/", {
    method: "POST",
    token: getAccessToken() ?? undefined,
    body: JSON.stringify({
      notice_id: noticeId,
    }),
  })

  return response.notice_read
}

export interface CreateNoticeData {
  title: string
  category: string
  priority: "Low" | "Medium" | "High"
  content: string
  published_date?: string | null
  expiry_date?: string | null
  status?: "Draft" | "Published" | "Archived"
  target_year?: "ALL" | "1" | "2" | "3" | "4"
}

export async function getAllNotices(): Promise<Notice[]> {
  return apiRequest<Notice[]>(
    "/api/notices/",
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function createNotice(
  data: CreateNoticeData
): Promise<Notice> {
  return apiRequest<Notice>(
    "/api/notices/",
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify(data),
    }
  )
}

export async function updateNotice(
  noticeId: number,
  data: Partial<CreateNoticeData>
): Promise<Notice> {
  return apiRequest<Notice>(
    `/api/notices/${noticeId}/`,
    {
      method: "PATCH",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify(data),
    }
  )
}

export async function deleteNotice(
  noticeId: number
): Promise<void> {
  await apiRequest<unknown>(
    `/api/notices/${noticeId}/`,
    {
      method: "DELETE",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function renewNotice(
  noticeId: number,
  expiryDate: string
): Promise<{
  message: string
  notice: Notice
}> {
  return apiRequest<{
    message: string
    notice: Notice
  }>(
    `/api/notices/${noticeId}/renew/`,
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify({
        expiry_date: expiryDate,
      }),
    }
  )
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
    throw new Error(
      data.message ||
        data.detail ||
        data.error ||
        "Something went wrong with the request."
    )
  }

  return data as T
}

export async function uploadNoticeAttachments(
  noticeId: number,
  files: File[]
): Promise<Notice> {
  const formData = new FormData()

  files.forEach(file => {
    formData.append("files", file)
  })

  return multipartRequest<Notice>(
    `/api/notices/${noticeId}/attachments/upload/`,
    formData
  )
}

export async function deleteNoticeAttachment(
  noticeId: number,
  publicId: string
): Promise<Notice> {
  return apiRequest<Notice>(
    `/api/notices/${noticeId}/attachments/delete/`,
    {
      method: "DELETE",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify({
        public_id: publicId,
      }),
    }
  )
}