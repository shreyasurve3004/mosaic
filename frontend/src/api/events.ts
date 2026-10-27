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

export interface Event {
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
  status: string
  attachments: EventAttachment[]
  created_by: string | null
  registered_count: number
  available_seats: number
  is_full: boolean
  is_registered: boolean
  registration_status: "Registered" | "Cancelled" | "Attended" | null
}

export interface EventRegistration {
  registration_id: number
  event: number
  event_name: string
  roll_no: string
  registration_date: string
  status: "Registered" | "Cancelled" | "Attended"
}

export interface EventRegistrationResponse {
  message: string
  registration: EventRegistration
  event: Event
}



export async function getUpcomingEvents(): Promise<Event[]> {
  return apiRequest<Event[]>("/api/events/upcoming/", {
    method: "GET",
    token: getAccessToken() ?? undefined,
  })
}

export async function getEvent(eventId: number): Promise<Event> {
  return apiRequest<Event>(`/api/events/${eventId}/`, {
    method: "GET",
    token: getAccessToken() ?? undefined,
  })
}

export async function registerForEvent(
  eventId: number
): Promise<EventRegistrationResponse> {
  return apiRequest<EventRegistrationResponse>(
    `/api/events/${eventId}/register/`,
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify({}),
    }
  )
}

export async function cancelEventRegistration(
  eventId: number
): Promise<EventRegistrationResponse> {
  return apiRequest<EventRegistrationResponse>(
    `/api/events/${eventId}/cancel-registration/`,
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify({}),
    }
  )
}
