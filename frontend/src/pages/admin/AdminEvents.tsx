import { useEffect, useState } from "react"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { Field, TextInput, TextArea, Button } from "../../components/ui/FormControls"
import { useToast } from "../../components/ui/ToastContext"
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventRegistrations,
  markEventAttendance,
  uploadEventAttachments,
  deleteEventAttachment,
  type ManagedEvent,
  type EventRegistration,
  type CreateEventData,
} from "../../api/eventManagement"

const eventTypes = [
  "Workshop",
  "Seminar",
  "Hackathon",
  "Cultural",
  "Sports",
]

type EventStatus =
  | "Upcoming"
  | "Ongoing"
  | "Completed"
  | "Cancelled"

const typeColor: Record<
  string,
  { bg: string; text: string; bar: string }
> = {
  Workshop: {
    bg: "#EFF6FF",
    text: "#2563EB",
    bar: "#2563EB",
  },
  Seminar: {
    bg: "#FDF4FF",
    text: "#9333EA",
    bar: "#9333EA",
  },
  Hackathon: {
    bg: "#FFF7ED",
    text: "#F97316",
    bar: "#F97316",
  },
  Cultural: {
    bg: "#FEF2F2",
    text: "#DC2626",
    bar: "#DC2626",
  },
  Sports: {
    bg: "#F0FDF4",
    text: "#16A34A",
    bar: "#16A34A",
  },
}

const statusStyle: Record<
  string,
  { bg: string; text: string }
> = {
  Upcoming: {
    bg: "#EFF6FF",
    text: "#2563EB",
  },
  Ongoing: {
    bg: "#F0FDF4",
    text: "#16A34A",
  },
  Completed: {
    bg: "#F1F5F9",
    text: "#64748B",
  },
  Cancelled: {
    bg: "#FEF2F2",
    text: "#DC2626",
  },
}

interface EventForm {
  event_name: string
  event_type: string
  organizer: string
  location: string
  room_no: string
  event_date: string
  time: string
  end_time: string
  capacity: string
  description: string
  status: EventStatus
}

const emptyForm: EventForm = {
  event_name: "",
  event_type: "Workshop",
  organizer: "",
  location: "",
  room_no: "",
  event_date: "",
  time: "",
  end_time: "",
  capacity: "100",
  description: "",
  status: "Upcoming",
}

function formatDate(date: string) {
  if (!date) return "TBD"

  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatTime(time: string) {
  if (!time) return "TBD"

  const [hours, minutes] = time.split(":").map(Number)

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return time
  }

  const date = new Date()
  date.setHours(hours, minutes, 0, 0)

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AdminEvents() {
  const { showToast } = useToast()

  const [events, setEvents] = useState<ManagedEvent[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)

  const [detail, setDetail] =
    useState<ManagedEvent | null>(null)

  const [editing, setEditing] =
    useState<ManagedEvent | null>(null)

  const [toDelete, setToDelete] =
    useState<ManagedEvent | null>(null)

  const [typeFilter, setTypeFilter] =
    useState("All")

  const [statusFilter, setStatusFilter] =
    useState("all")

  const [form, setForm] =
    useState<EventForm>(emptyForm)

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([])

  const [saving, setSaving] =
    useState(false)

  const [registrations, setRegistrations] =
    useState<EventRegistration[]>([])

  const [loadingRegistrations, setLoadingRegistrations] =
    useState(false)

  const [search, setSearch] =
    useState("")

  const loadEvents = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)

      const data = await getEvents()

      setEvents(data)
      setDetail((current) => {
        if (!current) return current
        const updated = data.find(
          (event) => event.event_id === current.event_id
        )
        return updated
          ? {
              ...current,
              status: updated.status,
              end_time: updated.end_time,
            }
          : current
      })
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to load events.",
        "error"
      )
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
    const refreshInterval = window.setInterval(
      () => void loadEvents(false),
      60_000
    )
    const refreshOnFocus = () => void loadEvents(false)
    window.addEventListener("focus", refreshOnFocus)

    return () => {
      window.clearInterval(refreshInterval)
      window.removeEventListener("focus", refreshOnFocus)
    }
  }, [])

  const upcoming = events.filter(
    (e) => e.status === "Upcoming"
  ).length

  const ongoing = events.filter(
    (e) => e.status === "Ongoing"
  ).length

  const completed = events.filter(
    (e) => e.status === "Completed"
  ).length

  const cancelled = events.filter(
    (e) => e.status === "Cancelled"
  ).length

  const totalReg = events.reduce(
    (sum, event) =>
      sum + (event.registered_count || 0),
    0
  )

  const filtered = events.filter((event) => {
    const typeMatch =
      typeFilter === "All" ||
      event.event_type === typeFilter

    const statusMatch =
      statusFilter === "all" ||
      event.status === statusFilter

    const searchText = search
      .trim()
      .toLowerCase()

    const searchMatch =
      !searchText ||
      event.event_name
        ?.toLowerCase()
        .includes(searchText) ||
      event.organizer
        ?.toLowerCase()
        .includes(searchText) ||
      event.location
        ?.toLowerCase()
        .includes(searchText) ||
      event.room_no
        ?.toLowerCase()
        .includes(searchText)

    return (
      typeMatch &&
      statusMatch &&
      searchMatch
    )
  })

  const openCreate = () => {
    setForm(emptyForm)
    setSelectedFiles([])
    setShowForm(true)
  }

  const closeCreate = () => {
    setShowForm(false)
    setForm(emptyForm)
    setSelectedFiles([])
  }

  const openEdit = (
    event: ManagedEvent
  ) => {
    setEditing(event)
    setSelectedFiles([])
  }

  const closeEdit = () => {
    setEditing(null)
    setSelectedFiles([])
  }

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files

    if (!files || files.length === 0) {
      return
    }

    if (!form.end_time) {
      showToast("Please select an event end time.", "error")
      return
    }

    if (form.end_time <= form.time) {
      showToast("End time must be later than start time.", "error")
      return
    }

    setSelectedFiles((prev) => [
      ...prev,
      ...Array.from(files),
    ])

    showToast(
      `${files.length} file(s) selected`,
      "success"
    )

    e.target.value = ""
  }

  const removeSelectedFile = (
    index: number
  ) => {
    setSelectedFiles((prev) =>
      prev.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    )
  }

  const submitAdd = async (
    status: EventStatus
  ) => {
    if (!form.event_name.trim()) {
      showToast(
        "Please enter an event title.",
        "error"
      )
      return
    }

    if (
      !editing.end_time ||
      editing.end_time <= editing.time
    ) {
      showToast("Please enter an end time later than the start time.", "error")
      return
    }

    if (!form.event_date) {
      showToast(
        "Please select an event date.",
        "error"
      )
      return
    }

    if (!form.time) {
      showToast(
        "Please select an event time.",
        "error"
      )
      return
    }

    try {
      setSaving(true)

      const data: CreateEventData = {
        event_name:
          form.event_name.trim(),

        event_type:
          form.event_type,

        description:
          form.description.trim(),

        event_date:
          form.event_date,

        time:
          form.time,

        end_time:
          form.end_time,

        location:
          form.location.trim(),

        room_no:
          form.room_no.trim(),

        organizer:
          form.organizer.trim() ||
          "Administration",

        capacity:
          Number(form.capacity) || 100,

        status,
      }

      const created =
        await createEvent(data)

      if (selectedFiles.length > 0) {
        await uploadEventAttachments(
          created.event_id,
          selectedFiles
        )
      }

      showToast(
        "Event created successfully.",
        "success"
      )

      closeCreate()
      await loadEvents()
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to create event.",
        "error"
      )
    } finally {
      setSaving(false)
    }
  }

  const submitEdit = async () => {
    if (!editing) return

    if (!editing.event_name.trim()) {
      showToast(
        "Please enter an event title.",
        "error"
      )
      return
    }

    try {
      setSaving(true)

      const updated =
        await updateEvent(
          editing.event_id,
          {
            event_name:
              editing.event_name.trim(),

            event_type:
              editing.event_type,

            description:
              editing.description,

            event_date:
              editing.event_date,

            time:
              editing.time,

            end_time:
              editing.end_time,

            location:
              editing.location,

            room_no:
              editing.room_no,

            organizer:
              editing.organizer,

            capacity:
              Number(editing.capacity),

            status:
              editing.status,
          }
        )

      if (selectedFiles.length > 0) {
        await uploadEventAttachments(
          updated.event_id,
          selectedFiles
        )
      }

      showToast(
        "Event updated successfully.",
        "success"
      )

      closeEdit()
      await loadEvents()

      if (
        detail &&
        detail.event_id ===
          updated.event_id
      ) {
        setDetail(updated)
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update event.",
        "error"
      )
    } finally {
      setSaving(false)
    }
  }

  const cancelEvent = async (
    event: ManagedEvent
  ) => {
    try {
      await updateEvent(
        event.event_id,
        {
          status: "Cancelled",
        }
      )

      showToast(
        "Event cancelled.",
        "info"
      )

      await loadEvents()

      if (
        detail?.event_id ===
        event.event_id
      ) {
        setDetail({
          ...detail,
          status: "Cancelled",
        })
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to cancel event.",
        "error"
      )
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return

    try {
      await deleteEvent(
        toDelete.event_id
      )

      showToast(
        "Event deleted successfully.",
        "success"
      )

      if (
        detail?.event_id ===
        toDelete.event_id
      ) {
        setDetail(null)
      }

      setToDelete(null)

      await loadEvents()
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete event.",
        "error"
      )
    }
  }

  const openDetail = async (
    event: ManagedEvent
  ) => {
    setDetail(event)
    setRegistrations([])

    try {
      setLoadingRegistrations(true)

      const [eventData, data] = await Promise.all([
        getEvent(event.event_id),
        getEventRegistrations(event.event_id),
      ])

      setDetail(eventData)
      setRegistrations(data)
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to load registrations.",
        "error"
      )
    } finally {
      setLoadingRegistrations(false)
    }
  }

  const markAttended = async (
    registration: EventRegistration
  ) => {
    if (!detail) return

    try {
      const updated =
        await markEventAttendance(
          detail.event_id,
          registration.roll_no
        )

      setRegistrations((prev) =>
        prev.map((item) =>
          item.registration_id ===
          registration.registration_id
            ? updated
            : item
        )
      )

      showToast(
        `${registration.roll_no} marked as attended.`,
        "success"
      )
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to mark attendance.",
        "error"
      )
    }
  }

  const removeAttachment = async (
    event: ManagedEvent,
    publicId: string
  ) => {
    try {
      const updated =
        await deleteEventAttachment(
          event.event_id,
          publicId
        )

      setEvents((prev) =>
        prev.map((item) =>
          item.event_id ===
          updated.event_id
            ? updated
            : item
        )
      )

      if (
        detail?.event_id ===
        updated.event_id
      ) {
        setDetail(updated)
      }

      showToast(
        "Attachment deleted.",
        "success"
      )
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete attachment.",
        "error"
      )
    }
  }

  const exportRegistrations = () => {
    if (!detail || registrations.length === 0) {
      return
    }

    const headers = [
      "Roll No",
      "Event",
      "Registration Date",
      "Status",
    ]

    const rows = registrations.map(
      (registration) => [
        registration.roll_no,
        registration.event_name,
        registration.registration_date,
        registration.status,
      ]
    )

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(
              /"/g,
              '""'
            )}"`
          )
          .join(",")
      ),
    ].join("\n")

    const blob = new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement("a")

    link.href = url
    link.download =
      `${detail.event_name.replace(
        /\s+/g,
        "_"
      )}_Registrations.csv`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            Events
          </h1>

          <p className="text-[13px] text-[#64748B] mt-0.5">
            {events.length} events managed ·{" "}
            {upcoming} upcoming ·{" "}
            {ongoing} ongoing
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] transition-colors"
        >
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <line
              x1="12"
              y1="5"
              x2="12"
              y2="19"
            />
            <line
              x1="5"
              y1="12"
              x2="19"
              y2="12"
            />
          </svg>

          Create Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Upcoming Events",
            val: upcoming,
            color: "#2563EB",
            bg: "#EFF6FF",
            border: "#BFDBFE",
          },
          {
            label: "Total Registrations",
            val: totalReg,
            color: "#9333EA",
            bg: "#FDF4FF",
            border: "#E9D5FF",
          },
          {
            label: "Completed",
            val: completed,
            color: "#16A34A",
            bg: "#F0FDF4",
            border: "#BBF7D0",
          },
          {
            label: "Cancelled",
            val: cancelled,
            color: "#DC2626",
            bg: "#FEF2F2",
            border: "#FECACA",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border p-4"
            style={{
              borderColor: stat.border,
            }}
          >
            <div
              className="text-[24px] font-bold"
              style={{
                color: stat.color,
              }}
            >
              {stat.val}
            </div>

            <div className="text-[12px] text-[#64748B] mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 mb-5">
          <h3 className="text-[13px] font-semibold text-[#1E293B] mb-4">
            Create New Event
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <input
              value={form.event_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  event_name:
                    e.target.value,
                })
              }
              placeholder="Event title"
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC] md:col-span-2"
            />

            <select
              value={form.event_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  event_type:
                    e.target.value,
                })
              }
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            >
              {eventTypes.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ))}
            </select>

            <input
              value={form.capacity}
              onChange={(e) =>
                setForm({
                  ...form,
                  capacity:
                    e.target.value,
                })
              }
              type="number"
              min="1"
              placeholder="Max capacity"
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <input
              value={form.organizer}
              onChange={(e) =>
                setForm({
                  ...form,
                  organizer:
                    e.target.value,
                })
              }
              placeholder="Organizer / Dept."
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            />

            <input
              value={form.location}
              onChange={(e) =>
                setForm({
                  ...form,
                  location:
                    e.target.value,
                })
              }
              placeholder="Venue"
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            />

            <input
              value={form.event_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  event_date:
                    e.target.value,
                })
              }
              type="date"
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            />
            <input
              value={form.end_time}
              onChange={(e) =>
                setForm({
                  ...form,
                  end_time: e.target.value,
                })
              }
              type="time"
              required
              placeholder="End time"
              aria-label="Event end time"
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            />

            <input
              value={form.time}
              onChange={(e) =>
                setForm({
                  ...form,
                  time: e.target.value,
                })
              }
              type="time"
              required
              aria-label="Event start time"
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              value={form.room_no}
              onChange={(e) =>
                setForm({
                  ...form,
                  room_no:
                    e.target.value,
                })
              }
              placeholder="Room / Hall No."
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            />

            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status:
                    e.target.value as EventStatus,
                })
              }
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            >
              <option value="Upcoming">
                Upcoming
              </option>
              <option value="Ongoing">
                Ongoing
              </option>
              <option value="Completed">
                Completed
              </option>
              <option value="Cancelled">
                Cancelled
              </option>
            </select>
          </div>

          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description:
                  e.target.value,
              })
            }
            placeholder="Event description..."
            className="w-full h-20 px-3 py-2 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC] resize-none mb-3"
          />

          {/* Attach Files */}
          <div className="mb-4">
            <label className="block text-[12px] font-medium text-[#1E293B] mb-1.5">
              Attach Files / Resources
            </label>

            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[12px] font-medium text-[#2563EB] hover:bg-[#EFF6FF] transition-colors flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>

                Attach Files

                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <span className="text-[11px] text-[#94A3B8]">
                PDF, DOCX, PNG up to 10MB
              </span>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {selectedFiles.map(
                  (file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 bg-[#F1F5F9] px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[12px] text-[#1E293B]"
                    >
                      <span>
                        {file.name}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeSelectedFile(
                            index
                          )
                        }
                        className="text-[#94A3B8] hover:text-[#DC2626] font-bold ml-1"
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              disabled={saving}
              onClick={() =>
                submitAdd("Upcoming")
              }
              className="px-4 py-1.5 rounded-lg bg-[#2563EB] text-white text-[12px] font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
            >
              {saving
                ? "Publishing..."
                : "Publish Event"}
            </button>

            <button
              disabled={saving}
              onClick={() =>
                submitAdd("Completed")
              }
              className="px-4 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] text-[#64748B] disabled:opacity-50"
            >
              Save Event
            </button>

            <button
              disabled={saving}
              onClick={closeCreate}
              className="px-4 py-1.5 rounded-lg text-[12px] text-[#94A3B8]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-1 flex-wrap">
          {[
            "All",
            ...eventTypes,
          ].map((type) => (
            <button
              key={type}
              onClick={() =>
                setTypeFilter(type)
              }
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                typeFilter === type
                  ? "bg-[#2563EB] text-white"
                  : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB]"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex gap-1 ml-auto">
          {[
            "all",
            "Upcoming",
            "Ongoing",
            "Completed",
            "Cancelled",
          ].map((status) => (
            <button
              key={status}
              onClick={() =>
                setStatusFilter(status)
              }
              className={`px-3 py-1.5 rounded-lg text-[12px] transition-all ${
                statusFilter === status
                  ? "bg-[#0F172A] text-white"
                  : "bg-white border border-[#E2E8F0] text-[#64748B]"
              }`}
            >
              {status === "all"
                ? "All"
                : status}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search events..."
          className="w-full md:w-80 h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[13px] focus:outline-none focus:border-[#2563EB]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-[13px] text-[#94A3B8]">
            Loading events...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F1F5F9]">
                  {[
                    "Event",
                    "Type",
                    "Organizer",
                    "Date & Venue",
                    "Registrations",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="text-left px-5 py-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider whitespace-nowrap"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map((event) => {
                  const tc =
                    typeColor[
                      event.event_type
                    ] ||
                    typeColor.Workshop

                  const ss =
                    statusStyle[
                      event.status
                    ] ||
                    statusStyle.Upcoming

                  const percentage =
                    event.capacity > 0
                      ? Math.round(
                          ((event.registered_count ||
                            0) /
                            event.capacity) *
                            100
                        )
                      : 0

                  return (
                    <tr
                      key={event.event_id}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-1.5 h-8 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor:
                                tc.bar,
                            }}
                          />

                          <div>
                            <div className="text-[13px] font-medium text-[#1E293B]">
                              {
                                event.event_name
                              }
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              tc.bg,
                            color: tc.text,
                          }}
                        >
                          {
                            event.event_type
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4 text-[12px] text-[#64748B]">
                        {event.organizer ||
                          "-"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-[12px] font-medium text-[#1E293B]">
                          {formatDate(
                            event.event_date
                          )}
                          {" · "}
                          {formatTime(
                            event.time
                          )}
                          {event.end_time &&
                            ` – ${formatTime(event.end_time)}`}
                        </div>

                        <div className="text-[11px] text-[#94A3B8]">
                          {event.location ||
                            event.room_no ||
                            "-"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(
                                  percentage,
                                  100
                                )}%`,
                                backgroundColor:
                                  tc.bar,
                              }}
                            />
                          </div>

                          <span className="text-[11px] text-[#64748B]">
                            {
                              event.registered_count
                            }
                            /
                            {
                              event.capacity
                            }
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              ss.bg,
                            color: ss.text,
                          }}
                        >
                          {event.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              openDetail(event)
                            }
                            className="text-[11px] px-2 py-0.5 rounded text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                          >
                            View
                          </button>

                          <button
                            onClick={() =>
                              openEdit(event)
                            }
                            className="text-[11px] px-2 py-0.5 rounded text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
                          >
                            Edit
                          </button>

                          {event.status !==
                            "Cancelled" &&
                            event.status !==
                              "Completed" && (
                              <button
                                onClick={() =>
                                  cancelEvent(
                                    event
                                  )
                                }
                                className="text-[11px] px-2 py-0.5 rounded text-[#F97316] hover:bg-[#FFF7ED] transition-colors"
                              >
                                Cancel
                              </button>
                            )}

                          <button
                            onClick={() =>
                              setToDelete(
                                event
                              )
                            }
                            className="text-[11px] px-2 py-0.5 rounded text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {filtered.length === 0 &&
                  !loading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-10 text-[13px] text-[#94A3B8]"
                      >
                        No events match the current filters
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!detail}
        onClose={() =>
          setDetail(null)
        }
        title={
          detail?.event_name ??
          "Event Details"
        }
        width="max-w-2xl"
      >
        {detail && (
          <div className="space-y-5 text-[13px]">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{
                  backgroundColor:
                    (
                      typeColor[
                        detail.event_type
                      ] ||
                      typeColor.Workshop
                    ).bg,
                  color:
                    (
                      typeColor[
                        detail.event_type
                      ] ||
                      typeColor.Workshop
                    ).text,
                }}
              >
                {detail.event_type}
              </span>

              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{
                  backgroundColor:
                    (
                      statusStyle[
                        detail.status
                      ] ||
                      statusStyle.Upcoming
                    ).bg,
                  color:
                    (
                      statusStyle[
                        detail.status
                      ] ||
                      statusStyle.Upcoming
                    ).text,
                }}
              >
                {detail.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
              <div>
                <span className="text-[11px] text-[#94A3B8] block">
                  Date & Time
                </span>

                <span className="font-semibold text-[#1E293B]">
                  {formatDate(
                    detail.event_date
                  )}{" "}
                  at{" "}
                  {formatTime(
                    detail.time
                  )}
                  {detail.end_time &&
                    ` – ${formatTime(detail.end_time)}`}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-[#94A3B8] block">
                  Venue
                </span>

                <span className="font-semibold text-[#1E293B]">
                  {detail.location ||
                    "-"}
                </span>

                {detail.room_no && (
                  <span className="block text-[11px] text-[#64748B] mt-0.5">
                    Room:{" "}
                    {detail.room_no}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] text-[#94A3B8] block">
                  Organized By
                </span>

                <span className="font-semibold text-[#1E293B]">
                  {detail.organizer ||
                    "-"}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-[#94A3B8] block">
                  Registrations
                </span>

                <span className="font-semibold text-[#2563EB]">
                  {
                    detail.registered_count
                  }{" "}
                  /{" "}
                  {
                    detail.capacity
                  }{" "}
                  Filled
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[#1E293B] mb-1">
                About the Event
              </h4>

              <p className="text-[#64748B] leading-relaxed whitespace-pre-line">
                {detail.description ||
                  "No description provided."}
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[#1E293B] mb-2">
                Attached Documents & Resources
              </h4>

              {detail.attachments &&
              detail.attachments.length >
                0 ? (
                <div className="space-y-2">
                  {detail.attachments.map(
                    (file, index) => (
                      <div
                        key={
                          file.public_id ||
                          index
                        }
                        className="flex items-center justify-between gap-3 bg-[#F1F5F9] px-3 py-2 rounded-lg border border-[#E2E8F0] text-[12px]"
                      >
                        <a
                          href={
                            file.file_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-[#1E293B] hover:text-[#2563EB] font-medium truncate"
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                            <polyline points="13 2 13 9 20 9" />
                          </svg>

                          <span className="truncate">
                            {file.file_name ||
                              file.format ||
                              "Attachment"}
                          </span>
                        </a>

                        {file.public_id && (
                          <button
                            onClick={() =>
                              removeAttachment(
                                detail,
                                file.public_id!
                              )
                            }
                            className="text-[#DC2626] text-[11px] font-medium hover:underline flex-shrink-0"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-[12px] text-[#94A3B8] italic">
                  No attached files
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-[#F1F5F9]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-[#1E293B]">
                  Registered Students
                </h4>

                {registrations.length >
                  0 && (
                  <button
                    onClick={
                      exportRegistrations
                    }
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
                  >
                    Export CSV
                  </button>
                )}
              </div>

              {loadingRegistrations ? (
                <div className="text-center py-5 text-[12px] text-[#94A3B8]">
                  Loading registrations...
                </div>
              ) : registrations.length ===
                0 ? (
                <div className="text-center py-5 bg-[#F8FAFC] border border-dashed border-[#E2E8F0] rounded-lg text-[12px] text-[#94A3B8]">
                  No students registered yet.
                </div>
              ) : (
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#F8FAFC]">
                      <tr>
                        <th className="text-left px-3 py-2 text-[10px] uppercase text-[#94A3B8]">
                          Roll No
                        </th>

                        <th className="text-left px-3 py-2 text-[10px] uppercase text-[#94A3B8]">
                          Registered
                        </th>

                        <th className="text-left px-3 py-2 text-[10px] uppercase text-[#94A3B8]">
                          Status
                        </th>

                        <th className="text-left px-3 py-2 text-[10px] uppercase text-[#94A3B8]">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F1F5F9]">
                      {registrations.map(
                        (registration) => (
                          <tr
                            key={
                              registration.registration_id
                            }
                          >
                            <td className="px-3 py-2.5 text-[12px] font-medium text-[#1E293B]">
                              {
                                registration.roll_no
                              }
                            </td>

                            <td className="px-3 py-2.5 text-[11px] text-[#64748B]">
                              {new Date(
                                registration.registration_date
                              ).toLocaleDateString(
                                "en-IN"
                              )}
                            </td>

                            <td className="px-3 py-2.5">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB]">
                                {
                                  registration.status
                                }
                              </span>
                            </td>

                            <td className="px-3 py-2.5">
                              {registration.status ===
                                "Registered" && (
                                <button
                                  onClick={() =>
                                    markAttended(
                                      registration
                                    )
                                  }
                                  className="text-[11px] text-[#16A34A] hover:underline font-medium"
                                >
                                  Mark Attended
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  openEdit(detail)
                }
              >
                Edit
              </Button>

              <Button
                variant="danger"
                onClick={() => {
                  setToDelete(detail)
                  setDetail(null)
                }}
              >
                Delete
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  setDetail(null)
                }
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editing}
        onClose={closeEdit}
        title="Edit Event"
        width="max-w-xl"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeEdit}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={submitEdit}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save changes"}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <Field
              label="Title"
              required
            >
              <TextInput
                value={
                  editing.event_name
                }
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    event_name:
                      e.target.value,
                  })
                }
              />
            </Field>
            <Field label="End time">
              <TextInput
                type="time"
                value={editing.end_time ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    end_time: e.target.value,
                  })
                }
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Type">
                <select
                  value={
                    editing.event_type
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      event_type:
                        e.target.value,
                    })
                  }
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] bg-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                >
                  {eventTypes.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Organizer">
                <TextInput
                  value={
                    editing.organizer
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      organizer:
                        e.target.value,
                    })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <TextInput
                  type="date"
                  value={
                    editing.event_date
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      event_date:
                        e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Start time">
                <TextInput
                  type="time"
                  value={editing.time}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      time:
                        e.target.value,
                    })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Venue">
                <TextInput
                  value={
                    editing.location
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      location:
                        e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Room">
                <TextInput
                  value={
                    editing.room_no
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      room_no:
                        e.target.value,
                    })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Capacity">
                <TextInput
                  type="number"
                  min="1"
                  value={
                    editing.capacity
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      capacity:
                        Number(
                          e.target.value
                        ),
                    })
                  }
                />
              </Field>

              <Field label="Status">
                <select
                  value={
                    editing.status
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status:
                        e.target.value as EventStatus,
                    })
                  }
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] bg-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="Upcoming">
                    Upcoming
                  </option>
                  <option value="Ongoing">
                    Ongoing
                  </option>
                  <option value="Completed">
                    Completed
                  </option>
                  <option value="Cancelled">
                    Cancelled
                  </option>
                </select>
              </Field>
            </div>

            <Field label="Description">
              <TextArea
                rows={3}
                value={
                  editing.description
                }
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    description:
                      e.target.value,
                  })
                }
              />
            </Field>

            {/* Existing attachments */}
            {editing.attachments &&
              editing.attachments.length >
                0 && (
                <div>
                  <label className="block text-[12px] font-medium text-[#1E293B] mb-1.5">
                    Existing Attachments
                  </label>

                  <div className="space-y-1.5">
                    {editing.attachments.map(
                      (
                        file,
                        index
                      ) => (
                        <div
                          key={
                            file.public_id ||
                            index
                          }
                          className="flex items-center justify-between gap-2 bg-[#F8FAFC] px-3 py-2 rounded-lg border border-[#E2E8F0] text-[12px]"
                        >
                          <a
                            href={
                              file.file_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-[#2563EB] hover:underline"
                          >
                            {file.file_name ||
                              file.format ||
                              "Attachment"}
                          </a>

                          {file.public_id && (
                            <button
                              type="button"
                              onClick={() =>
                                removeAttachment(
                                  editing,
                                  file.public_id!
                                )
                              }
                              className="text-[#DC2626] text-[11px] hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Add attachments */}
            <div>
              <label className="block text-[12px] font-medium text-[#1E293B] mb-1.5">
                Attach Files / Resources
              </label>

              <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[12px] font-medium text-[#2563EB] hover:bg-[#EFF6FF] transition-colors inline-flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>

                Attach Files

                <input
                  type="file"
                  multiple
                  onChange={
                    handleFileUpload
                  }
                  className="hidden"
                />
              </label>

              {selectedFiles.length >
                0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedFiles.map(
                    (file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-2 bg-[#F1F5F9] px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[12px] text-[#1E293B]"
                      >
                        <span>
                          {file.name}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeSelectedFile(
                              index
                            )
                          }
                          className="text-[#94A3B8] hover:text-[#DC2626] font-bold"
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this event?"
        message={`"${toDelete?.event_name}" will be permanently removed, including its registrations and attachments.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() =>
          setToDelete(null)
        }
      />
    </div>
  )
}