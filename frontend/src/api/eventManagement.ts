import { apiRequest } from "./client"
import { getAccessToken } from "./session"

export interface EventAttachment {
  file_name?: string
  file_url?: string
  public_id?: string
  resource_type?: string
  format?: string
  file_type?: string | null
  file_size?: number
}

export interface ManagedEvent {
  event_id: number
  event_name: string
  event_type: string
  description: string
  event_date: string
  time: string
  end_time: string | null
  location: string
  room_no: string
  organizer: string
  capacity: number
  status: "Upcoming" | "Ongoing" | "Completed" | "Cancelled"
  attachments: EventAttachment[]
  created_by: string | null
  registered_count: number
  available_seats: number
  is_full: boolean
  is_registered: boolean
  registration_status:
    | "Registered"
    | "Cancelled"
    | "Attended"
    | null
}

export interface CreateEventData {
  event_name: string
  event_type: string
  description: string
  event_date: string
  time: string
  end_time: string
  location: string
  room_no: string
  organizer: string
  capacity: number
  status: "Upcoming" | "Ongoing" | "Completed" | "Cancelled"
}

export interface EventRegistration {
  registration_id: number
  event: number
  event_name: string
  roll_no: string
  registration_date: string
  status: "Registered" | "Cancelled" | "Attended"
}

export async function getEvents(
  params: Record<string, string> = {}
): Promise<ManagedEvent[]> {
  const query = new URLSearchParams(params).toString()

  return apiRequest<ManagedEvent[]>(
    `/api/events/${query ? `?${query}` : ""}`,
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function getEvent(
  eventId: number
): Promise<ManagedEvent> {
  return apiRequest<ManagedEvent>(
    `/api/events/${eventId}/`,
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function createEvent(
  data: CreateEventData
): Promise<ManagedEvent> {
  return apiRequest<ManagedEvent>(
    "/api/events/",
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify(data),
    }
  )
}

export async function updateEvent(
  eventId: number,
  data: Partial<CreateEventData>
): Promise<ManagedEvent> {
  return apiRequest<ManagedEvent>(
    `/api/events/${eventId}/`,
    {
      method: "PATCH",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify(data),
    }
  )
}

export async function deleteEvent(
  eventId: number
): Promise<void> {
  await apiRequest<unknown>(
    `/api/events/${eventId}/`,
    {
      method: "DELETE",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function getEventRegistrations(
  eventId: number
): Promise<EventRegistration[]> {
  return apiRequest<EventRegistration[]>(
    `/api/events/registrations/?event=${eventId}`,
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function markEventAttendance(
  eventId: number,
  rollNo: string
): Promise<EventRegistration> {
  return apiRequest<EventRegistration>(
    `/api/events/${eventId}/mark-attended/`,
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify({
        roll_no: rollNo,
      }),
    }
  )
}



export async function uploadEventAttachments(
  eventId: number,
  files: File[]
): Promise<ManagedEvent> {
  if (files.length === 0) {
    throw new Error("Select at least one file to upload.")
  }

  const token = getAccessToken()
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "")

  if (!baseUrl) {
    throw new Error(
      "VITE_API_BASE_URL is missing. Check your frontend .env file."
    )
  }

  const formData = new FormData()

  files.forEach((file) => {
    formData.append("files", file)
  })

  let response: Response

  try {
    response = await fetch(
      `${baseUrl}/api/events/${eventId}/attachments/upload/`,
      {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      }
    )
  } catch {
    throw new Error(
      "Could not connect to the backend. Check that Django is running and VITE_API_BASE_URL is correct."
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const details =
      data.details ||
      data.detail ||
      data.error ||
      data.message

    throw new Error(
      `Attachment upload failed (${response.status}): ${
        typeof details === "string"
          ? details
          : JSON.stringify(details || "Unknown server error")
      }`
    )
  }

  return data as ManagedEvent
}



export async function deleteEventAttachment(
  eventId: number,
  publicId: string
): Promise<ManagedEvent> {
  return apiRequest<ManagedEvent>(
    `/api/events/${eventId}/attachments/delete/`,
    {
      method: "DELETE",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify({
        public_id: publicId,
      }),
    }
  )
}