import { useEffect, useMemo, useState } from "react"
import { useToast } from "../components/ui/ToastContext"
import { downloadFile, previewFile } from "../api/files"
import {
  cancelEventRegistration,
  getUpcomingEvents,
  registerForEvent,
  type Event,
  type EventAttachment,
} from "../api/events"

const categories = [
  "All",
  "Workshop",
  "Hackathon",
  "Seminar",
  "Cultural",
  "Sports",
] as const

type Category = (typeof categories)[number]

const typeStyle: Record<
  string,
  { color: string; bg: string }
> = {
  Workshop: {
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  Hackathon: {
    color: "#F97316",
    bg: "#FFF7ED",
  },
  Seminar: {
    color: "#9333EA",
    bg: "#FDF4FF",
  },
  Cultural: {
    color: "#DB2777",
    bg: "#FDF2F8",
  },
  Sports: {
    color: "#16A34A",
    bg: "#F0FDF4",
  },
}

function formatDate(date: string) {
  if (!date) return "Date unavailable"

  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatShortDate(date: string) {
  if (!date) return "Date unavailable"

  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

function formatTime(time: string) {
  if (!time) return "Time unavailable"

  const parsed = new Date(`1970-01-01T${time}`)

  if (Number.isNaN(parsed.getTime())) {
    return time.slice(0, 5)
  }

  return parsed.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatFileSize(size?: number) {
  if (!size || size <= 0) return "Resource File"

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getAttachmentName(
  file: EventAttachment,
  index: number
) {
  return file.file_name || `Resource_${index + 1}`
}

function getTypeStyle(type: string) {
  return (
    typeStyle[type] || {
      color: "#2563EB",
      bg: "#EFF6FF",
    }
  )
}

export default function Events() {
  const { showToast } = useToast()

  const [events, setEvents] = useState<Event[]>([])
  const [filter, setFilter] = useState<Category>("All")
  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    null
  )

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadEvents() {
      try {
        setLoading(true)
        setError(null)

        const data = await getUpcomingEvents()

        if (mounted) {
          setEvents(data)
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load events."
          )
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadEvents()

    return () => {
      mounted = false
    }
  }, [])

  const visibleEvents = useMemo(() => {
    if (filter === "All") {
      return events
    }

    return events.filter(
      event => event.event_type === filter
    )
  }, [events, filter])

  const activeEvent = selectedEventId
    ? events.find(
        event => event.event_id === selectedEventId
      ) ?? null
    : null

  async function handleRegister(event: Event) {
    if (actionLoading) return

    try {
      setActionLoading(true)

      const response = await registerForEvent(
        event.event_id
      )

      setEvents(previous =>
        previous.map(item =>
          item.event_id === response.event.event_id
            ? response.event
            : item
        )
      )

      showToast(
        `Registered successfully for "${event.event_name}"!`,
        "success"
      )
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Unable to register for this event.",
        "error"
      )
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancelRegistration(event: Event) {
    if (actionLoading) return

    try {
      setActionLoading(true)

      const response = await cancelEventRegistration(
        event.event_id
      )

      setEvents(previous =>
        previous.map(item =>
          item.event_id === response.event.event_id
            ? response.event
            : item
        )
      )

      showToast(
        `Registration cancelled for "${event.event_name}".`,
        "info"
      )
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Unable to cancel registration.",
        "error"
      )
    } finally {
      setActionLoading(false)
    }
  }

  if (activeEvent) {
    const style = getTypeStyle(activeEvent.event_type)

    const seatsLeft = Math.max(
      activeEvent.available_seats,
      0
    )

    const registeredCount = Math.max(
      activeEvent.registered_count,
      0
    )

    const capacity = Math.max(
      activeEvent.capacity,
      1
    )

    const pct = Math.round(
      (registeredCount / capacity) * 100
    )

    const attachments = activeEvent.attachments || []

    return (
      <div className="p-6 max-w-[1400px] w-full">
        <button
          onClick={() => setSelectedEventId(null)}
          className="inline-flex items-center gap-2 mb-6 text-[13px] font-semibold text-[#64748B] hover:text-[#2563EB] transition-colors group cursor-pointer"
        >
          <svg
            className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Events
        </button>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div
            className="h-2 w-full"
            style={{
              backgroundColor: style.color,
            }}
          />

          <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <span
                    className="text-[12px] font-semibold px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: style.bg,
                      color: style.color,
                    }}
                  >
                    {activeEvent.event_type}
                  </span>

                  <span className="text-[13px] text-[#94A3B8]">
                    Organized by {activeEvent.organizer}
                  </span>
                </div>

                <h1 className="text-[28px] font-bold text-[#1E293B] tracking-tight leading-snug">
                  {activeEvent.event_name}
                </h1>
              </div>

              <div>
                <h3 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">
                  About the Event
                </h3>

                <p className="text-[14px] text-[#475569] leading-relaxed whitespace-pre-line">
                  {activeEvent.description ||
                    "No description provided for this event."}
                </p>
              </div>

              <div className="pt-4 border-t border-[#F1F5F9]">
                <h3 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
                  Attached Documents & Resources
                </h3>

                {attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((file, index) => (
                      <div
                        key={`${file.public_id || file.file_url || file.file_name}-${index}`}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 rounded-lg bg-[#EFF6FF] text-[#2563EB] shrink-0">
                            <svg
                              width="18"
                              height="18"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </div>

                          <div className="truncate">
                            <div className="text-[13px] font-medium text-[#1E293B] truncate">
                              {getAttachmentName(
                                file,
                                index
                              )}
                            </div>

                            <div className="text-[11px] text-[#94A3B8]">
                              {formatFileSize(
                                file.file_size
                              )}
                            </div>
                          </div>
                        </div>

                        {file.file_url && (
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => {
                                void previewFile(
                                  `/api/events/${activeEvent.event_id}/attachments/${index}/file/`,
                                  getAttachmentName(file, index)
                                ).catch((error: unknown) => {
                                  showToast(
                                    error instanceof Error
                                      ? error.message
                                      : "Unable to open this attachment.",
                                    "error"
                                  )
                                })
                              }}
                              className="text-[12px] font-semibold text-[#2563EB] hover:underline"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void downloadFile(
                                  `/api/events/${activeEvent.event_id}/attachments/${index}/file/?download=1`,
                                  getAttachmentName(file, index)
                                ).catch((error: unknown) => {
                                  showToast(
                                    error instanceof Error
                                      ? error.message
                                      : "Unable to download this attachment.",
                                    "error"
                                  )
                                })
                              }}
                              className="text-[12px] font-semibold text-[#2563EB] hover:underline"
                            >
                              Download
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-[#E2E8F0] text-center text-[13px] text-[#94A3B8]">
                    No documents or attachments provided for this event yet.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-5">
                <h3 className="text-[13px] font-bold text-[#1E293B]">
                  Event Overview
                </h3>

                <div className="space-y-4 text-[13px]">
                  <div className="flex items-start gap-3 text-[#475569]">
                    <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[#2563EB]">
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                        />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">
                        Date
                      </div>
                      <div className="font-semibold text-[#1E293B]">
                        {formatDate(
                          activeEvent.event_date
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-[#475569]">
                    <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[#2563EB]">
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                        />
                        <polyline points="12 6 12 16 14 16" />
                      </svg>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">
                        Time
                      </div>
                      <div className="font-semibold text-[#1E293B]">
                        {formatTime(activeEvent.time)}
                        {activeEvent.end_time &&
                          ` – ${formatTime(activeEvent.end_time)}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-[#475569]">
                    <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[#2563EB]">
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle
                          cx="12"
                          cy="10"
                          r="3"
                        />
                      </svg>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">
                        Venue
                      </div>

                      <div className="font-semibold text-[#1E293B]">
                        {activeEvent.location}
                        {activeEvent.room_no
                          ? `, Room ${activeEvent.room_no}`
                          : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-[#475569]">
                    <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[#2563EB]">
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle
                          cx="12"
                          cy="7"
                          r="4"
                        />
                      </svg>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">
                        Organizer
                      </div>

                      <div className="font-semibold text-[#1E293B]">
                        {activeEvent.organizer}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0]">
                  <div className="flex justify-between items-center text-[12px] text-[#64748B] mb-2 font-medium">
                    <span>Availability</span>
                    <span className="font-semibold text-[#1E293B]">
                      {seatsLeft} seats left
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          pct,
                          100
                        )}%`,
                        backgroundColor:
                          pct > 85
                            ? "#F97316"
                            : style.color,
                      }}
                    />
                  </div>
                </div>

                {activeEvent.is_registered ? (
                  <button
                    onClick={() =>
                      handleCancelRegistration(
                        activeEvent
                      )
                    }
                    disabled={actionLoading}
                    className="w-full py-3 rounded-xl text-[14px] font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: "#F0FDF4",
                      color: "#16A34A",
                      border:
                        "1px solid #BBF7D0",
                    }}
                  >
                    {actionLoading
                      ? "Processing..."
                      : activeEvent.registration_status ===
                          "Attended"
                        ? "Attendance Recorded"
                        : "✓ Registered — tap to cancel"}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      handleRegister(activeEvent)
                    }
                    disabled={
                      actionLoading ||
                      activeEvent.is_full
                    }
                    className="w-full py-3 rounded-xl text-[14px] font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{
                      backgroundColor:
                        style.color,
                      color: "white",
                    }}
                  >
                    {actionLoading
                      ? "Processing..."
                      : activeEvent.is_full
                        ? "Full Capacity"
                        : "Register Now"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            Campus Events
          </h1>

          <p className="text-[13px] text-[#64748B] mt-0.5">
            {loading
              ? "Loading events..."
              : `${events.length} upcoming events`}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map(category => (
          <button
            key={category}
            onClick={() =>
              setFilter(category)
            }
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${
              filter === category
                ? "bg-[#2563EB] text-white"
                : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB]"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-16 text-[13px] text-[#94A3B8]">
          Loading upcoming events...
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-16">
          <p className="text-[13px] text-[#DC2626] mb-3">
            {error}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleEvents.length === 0 && (
            <div className="col-span-full text-center py-16 text-[13px] text-[#94A3B8]">
              No events in this category yet.
            </div>
          )}

          {visibleEvents.map(event => {
            const style = getTypeStyle(
              event.event_type
            )

            const registeredCount = Math.max(
              event.registered_count,
              0
            )

            const capacity = Math.max(
              event.capacity,
              1
            )

            const pct = Math.round(
              (registeredCount / capacity) * 100
            )

            return (
              <div
                key={event.event_id}
                className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden hover:shadow-lg hover:shadow-[#0F172A]/[0.06] transition-all group flex flex-col justify-between"
              >
                <div>
                  <div
                    className="h-1.5"
                    style={{
                      backgroundColor:
                        style.color,
                    }}
                  />

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor:
                            style.bg,
                          color: style.color,
                        }}
                      >
                        {event.event_type}
                      </span>

                      {event.is_registered && (
                        <span className="text-[11px] font-semibold text-[#16A34A]">
                          ✓ Registered
                        </span>
                      )}
                    </div>

                    <h2 className="text-[16px] font-bold text-[#1E293B] leading-snug mb-2">
                      {event.event_name}
                    </h2>

                    <p className="text-[12px] text-[#64748B] leading-relaxed line-clamp-3 min-h-[54px]">
                      {event.description ||
                        "No description provided."}
                    </p>

                    <div className="mt-4 space-y-2.5">
                      <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                        <svg
                          width="15"
                          height="15"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="18"
                            rx="2"
                          />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>

                        <span>
                          {formatShortDate(
                            event.event_date
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                        <svg
                          width="15"
                          height="15"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                          />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>

                        <span>
                          {formatTime(event.time)}
                          {event.end_time &&
                            ` – ${formatTime(event.end_time)}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                        <svg
                          width="15"
                          height="15"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
                          <circle
                            cx="12"
                            cy="10"
                            r="3"
                          />
                        </svg>

                        <span className="truncate">
                          {event.location}
                          {event.room_no
                            ? `, Room ${event.room_no}`
                            : ""}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#F1F5F9]">
                      <div className="flex justify-between text-[11px] text-[#94A3B8] mb-1.5">
                        <span>
                          {registeredCount} registered
                        </span>

                        <span>
                          {event.available_seats} seats left
                        </span>
                      </div>

                      <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(
                              pct,
                              100
                            )}%`,
                            backgroundColor:
                              pct > 85
                                ? "#F97316"
                                : style.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <button
                    onClick={() =>
                      setSelectedEventId(
                        event.event_id
                      )
                    }
                    className="w-full py-2.5 rounded-xl border border-[#E2E8F0] text-[12px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] transition-colors cursor-pointer"
                  >
                    View Event
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}