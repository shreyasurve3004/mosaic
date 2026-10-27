import React, { useEffect, useState } from "react"
import { useAuth } from "../../store/AuthContext"
import { useToast } from "../../components/ui/ToastContext"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { previewFile } from "../../api/files"
import {
  createEvent,
  deleteEvent,
  deleteEventAttachment,
  getEvent,
  getEventRegistrations,
  getEvents,
  markEventAttendance,
  updateEvent,
  uploadEventAttachments,
  type EventRegistration,
  type ManagedEvent,
} from "../../api/eventManagement"

const eventTypes = [
  "Workshop",
  "Seminar",
  "Hackathon",
  "Cultural",
  "Sports",
]

const typeColor: Record<
  string,
  {
    border: string
    tagBg: string
    tagText: string
    buttonBorder: string
    buttonText: string
  }
> = {
  Workshop: {
    border: "#2563EB",
    tagBg: "#EFF6FF",
    tagText: "#2563EB",
    buttonBorder: "#2563EB",
    buttonText: "#2563EB",
  },
  Hackathon: {
    border: "#F97316",
    tagBg: "#FFF7ED",
    tagText: "#F97316",
    buttonBorder: "#F97316",
    buttonText: "#F97316",
  },
  Seminar: {
    border: "#9333EA",
    tagBg: "#FDF4FF",
    tagText: "#9333EA",
    buttonBorder: "#9333EA",
    buttonText: "#9333EA",
  },
  Cultural: {
    border: "#DC2626",
    tagBg: "#FEF2F2",
    tagText: "#DC2626",
    buttonBorder: "#DC2626",
    buttonText: "#DC2626",
  },
  Sports: {
    border: "#16A34A",
    tagBg: "#F0FDF4",
    tagText: "#16A34A",
    buttonBorder: "#16A34A",
    buttonText: "#16A34A",
  },
}

type EventStatus =
  | "Upcoming"
  | "Ongoing"
  | "Completed"
  | "Cancelled"

interface EventFormData {
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
  status: EventStatus
}

const emptyForm: EventFormData = {
  event_name: "",
  event_type: "Workshop",
  description: "",
  event_date: "",
  time: "",
  end_time: "",
  location: "",
  room_no: "",
  organizer: "",
  capacity: 50,
  status: "Upcoming",
}

function formatDate(date: string) {
  if (!date) return "-"

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
  if (!time) return "-"

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

function statusLabel(status: EventStatus) {
  return status
}

function sortEventsForFaculty(
  eventList: ManagedEvent[]
): ManagedEvent[] {
  const activeEvents = eventList
    .filter(
      (event) =>
        event.status === "Upcoming" ||
        event.status === "Ongoing"
    )
    .sort((a, b) => {
      const dateA = `${a.event_date}T${a.time}`
      const dateB = `${b.event_date}T${b.time}`

      return dateA.localeCompare(dateB)
    })

  const pastEvents = eventList
    .filter(
      (event) =>
        event.status === "Completed" ||
        event.status === "Cancelled"
    )
    .sort((a, b) => {
      const dateA = `${a.event_date}T${a.time}`
      const dateB = `${b.event_date}T${b.time}`

      return dateB.localeCompare(dateA)
    })

  return [...activeEvents, ...pastEvents]
}

export default function FacultyEvents() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [events, setEvents] = useState<ManagedEvent[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<
    "All" | "Upcoming" | "Completed" | "Cancelled" | "Your Events"
  >("All")

  const [categoryFilter, setCategoryFilter] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")

  const [viewMode, setViewMode] = useState<
    "list" | "create" | "edit" | "detail"
  >("list")

  const [editingEventId, setEditingEventId] =
    useState<number | null>(null)

  const [viewingEvent, setViewingEvent] =
    useState<ManagedEvent | null>(null)

  const [toDelete, setToDelete] =
    useState<ManagedEvent | null>(null)

  const [formData, setFormData] =
    useState<EventFormData>(emptyForm)

  const [registrations, setRegistrations] =
    useState<EventRegistration[]>([])

  const [loadingRegistrations, setLoadingRegistrations] =
    useState(false)

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([])

  const [saving, setSaving] = useState(false)

  const loadEvents = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)

      const data = await getEvents()

      setEvents(data)
      setViewingEvent((current) => {
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

  const totalEventsCount = events.length

  const upcomingCount = events.filter(
    (event) => event.status === "Upcoming"
  ).length

  const completedCount = events.filter(
    (event) => event.status === "Completed"
  ).length

  const cancelledCount = events.filter(
    (event) => event.status === "Cancelled"
  ).length

  const yourEventsCount = events.filter(
    (event) =>
      String(event.created_by) ===
      String(currentUser?.backendId)
  ).length

  const filteredEvents = events.filter((event) => {
    if (
      activeTab === "Upcoming" &&
      event.status !== "Upcoming"
    ) {
      return false
    }

    if (
      activeTab === "Completed" &&
      event.status !== "Completed"
    ) {
      return false
    }

    if (
      activeTab === "Cancelled" &&
      event.status !== "Cancelled"
    ) {
      return false
    }

    if (
      activeTab === "Your Events" &&
      String(event.created_by) !==
        String(currentUser?.backendId)
    ) {
      return false
    }

    if (categoryFilter === "Your Events") {
      if (
        String(event.created_by) !==
        String(currentUser?.backendId)
      ) {
        return false
      }
    } else if (
      categoryFilter !== "All" &&
      event.event_type !== categoryFilter
    ) {
      return false
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()

      const matches =
        event.event_name
          ?.toLowerCase()
          .includes(query) ||
        event.description
          ?.toLowerCase()
          .includes(query) ||
        event.location
          ?.toLowerCase()
          .includes(query) ||
        event.room_no
          ?.toLowerCase()
          .includes(query) ||
        event.organizer
          ?.toLowerCase()
          .includes(query)

      if (!matches) {
        return false
      }
    }

    return true
  })

  const handleOpenCreatePage = () => {
    setEditingEventId(null)

    setFormData({
      ...emptyForm,
      organizer: currentUser?.name || "",
    })

    setSelectedFiles([])
    setViewMode("create")
  }

  const handleOpenEditPage = (event: ManagedEvent) => {
    setEditingEventId(event.event_id)

    setFormData({
      event_name: event.event_name,
      event_type: event.event_type,
      description: event.description,
      event_date: event.event_date,
      time: event.time,
      end_time: event.end_time ?? "",
      location: event.location,
      room_no: event.room_no,
      organizer:
        event.organizer || currentUser?.name || "",
      capacity: event.capacity,
      status: event.status,
    })

    setSelectedFiles([])
    setViewMode("edit")
  }

  const handleViewDetails = async (
    event: ManagedEvent
  ) => {
    setViewingEvent(event)
    setViewMode("detail")
    setRegistrations([])

    try {
      setLoadingRegistrations(true)

      const data = await getEventRegistrations(
        event.event_id
      )

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

  const handleFileUpload = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  // Capture the File objects before clearing the input.
  const files = Array.from(e.currentTarget.files ?? [])

  console.log(
    "[Events] Files selected:",
    files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }))
  )

  if (files.length === 0) {
    return
  }

  // Use the captured array, not e.target.files, inside the updater.
  setSelectedFiles((prev) => {
    const updated = [...prev, ...files]

    console.log(
      "[Events] Total files queued:",
      updated.length
    )

    return updated
  })

  // Allow the same file to be selected again later.
  e.currentTarget.value = ""
}

  const handleRemoveSelectedFile = (
    index: number
  ) => {
    setSelectedFiles((prev) =>
      prev.filter((_, fileIndex) => fileIndex !== index)
    )
  }

  const handleSubmitForm = async (
  e: React.FormEvent<HTMLFormElement>
) => {
  e.preventDefault()

  console.log("[Events] Form submitted")
  console.log(
    "[Events] Selected file count:",
    selectedFiles.length
  )
  console.log(
    "[Events] Selected files:",
    selectedFiles.map((file) => file.name)
  )

  if (!formData.event_name.trim()) {
    showToast("Please enter an event name.", "error")
    return
  }

  if (!formData.event_date) {
    showToast("Please select an event date.", "error")
    return
  }

  if (!formData.time) {
    showToast("Please select an event time.", "error")
    return
  }

  if (!formData.end_time) {
    showToast("Please select an event end time.", "error")
    return
  }

  if (formData.end_time <= formData.time) {
    showToast(
      "End time must be later than start time.",
      "error"
    )
    return
  }

  if (formData.capacity <= 0) {
    showToast(
      "Capacity must be greater than zero.",
      "error"
    )
    return
  }

  try {
    setSaving(true)

    let event: ManagedEvent

    const payload = {
      event_name: formData.event_name.trim(),
      event_type: formData.event_type,
      description: formData.description.trim(),
      event_date: formData.event_date,
      time: formData.time,
      end_time: formData.end_time,
      location: formData.location.trim(),
      room_no: formData.room_no.trim(),
      organizer:
        formData.organizer.trim() ||
        currentUser?.name ||
        "Faculty",
      capacity: Number(formData.capacity),
      status: formData.status,
    }

    // Step 1: Create or update the event.
    if (editingEventId !== null) {
      console.log(
        "[Events] Updating event:",
        editingEventId
      )

      event = await updateEvent(
        editingEventId,
        payload
      )
    } else {
      console.log("[Events] Creating event")

      event = await createEvent(payload)
    }

    console.log(
      "[Events] Event saved successfully:",
      event.event_id
    )

    // Step 2: Upload attachments only when files are selected.
    if (selectedFiles.length > 0) {
      console.log(
        "[Events] Starting attachment upload for event:",
        event.event_id
      )

      console.log(
        "[Events] Uploading files:",
        selectedFiles.map((file) => file.name)
      )

      event = await uploadEventAttachments(
        event.event_id,
        selectedFiles
      )

      console.log(
        "[Events] Attachment upload completed:",
        event.attachments
      )
    } else {
      console.log(
        "[Events] No attachments selected; skipping upload"
      )
    }

    // Step 3: Report the result and refresh the event list.
    showToast(
      editingEventId !== null
        ? "Event updated successfully."
        : "Event created successfully.",
      "success"
    )

    setViewMode("list")
    setEditingEventId(null)
    setSelectedFiles([])

    await loadEvents()
  } catch (error) {
    console.error(
      "[Events] Event save or attachment upload failed:",
      error
    )

    showToast(
      error instanceof Error
        ? error.message
        : "Failed to save event.",
      "error"
    )
  } finally {
    setSaving(false)
  }
}

  const confirmDelete = async () => {
    if (!toDelete) {
      return
    }

    try {
      await deleteEvent(toDelete.event_id)

      showToast(
        "Event deleted successfully.",
        "success"
      )
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete event.",
        "error"
      )
    } finally {
      setToDelete(null)
    }
  }

  const handleMarkAttended = async (
    registration: EventRegistration
  ) => {
    if (!viewingEvent) {
      return
    }

    try {
      await markEventAttendance(
        viewingEvent.event_id,
        registration.roll_no
      )

      setRegistrations((prev) =>
        prev.map((item) =>
          item.registration_id ===
          registration.registration_id
            ? {
                ...item,
                status: "Attended",
              }
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

  const handleDeleteAttachment = async (
    publicId: string
  ) => {
    if (!viewingEvent) {
      return
    }

    try {
      const updated = await deleteEventAttachment(
        viewingEvent.event_id,
        publicId
      )

      setViewingEvent(updated)

      setEvents((prev) =>
        prev.map((event) =>
          event.event_id === updated.event_id
            ? updated
            : event
        )
      )

      showToast(
        "Attachment deleted successfully.",
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

  const handleExportCSV = (
    event: ManagedEvent,
    registeredStudents: EventRegistration[]
  ) => {
    if (!registeredStudents.length) {
      return
    }

    const headers = [
      "Roll No",
      "Event",
      "Registered Date",
      "Status",
    ]

    const rows = registeredStudents.map(
      (student) => [
        `"${student.roll_no || ""}"`,
        `"${student.event_name || event.event_name}"`,
        `"${student.registration_date || ""}"`,
        `"${student.status || ""}"`,
      ]
    )

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")

    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `${event.event_name.replace(
        /\s+/g,
        "_"
      )}_Registrations.csv`
    )

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (viewMode === "detail" && viewingEvent) {
    const colors =
      typeColor[viewingEvent.event_type] ||
      typeColor.Workshop

    const registeredCount =
      viewingEvent.registered_count

    const seatsRemaining =
      viewingEvent.available_seats

    const isOwner =
      String(viewingEvent.created_by) ===
      String(currentUser?.backendId)

    return (
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="mb-6">
          <button
            onClick={() => {
              setViewMode("list")
              setViewingEvent(null)
            }}
            className="text-[13px] text-[#64748B] hover:text-[#1E293B] flex items-center gap-2 font-medium cursor-pointer transition-colors"
          >
            ← Back to Events
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-[12px] font-semibold px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: colors.tagBg,
                    color: colors.tagText,
                  }}
                >
                  {viewingEvent.event_type}
                </span>

                <span className="text-[13px] text-[#64748B]">
                  Organized by{" "}
                  <strong className="text-[#1E293B]">
                    {viewingEvent.organizer}
                  </strong>
                </span>
              </div>

              <h1 className="text-[26px] font-bold text-[#1E293B] tracking-tight mb-6">
                {viewingEvent.event_name}
              </h1>

              <div className="mb-8">
                <h3 className="text-[11px] font-bold text-[#94A3B8] tracking-wider uppercase mb-3">
                  ABOUT THE EVENT
                </h3>

                <p className="text-[14px] text-[#475569] leading-relaxed whitespace-pre-line">
                  {viewingEvent.description}
                </p>
              </div>

              <div className="mb-8">
                <h3 className="text-[11px] font-bold text-[#94A3B8] tracking-wider uppercase mb-3">
                  ATTACHED DOCUMENTS & RESOURCES
                </h3>

                {viewingEvent.attachments?.length > 0 ? (
                  <div className="space-y-2">
                    {viewingEvent.attachments.map(
                      (file, index) => (
                        <div
                          key={
                            file.public_id || index
                          }
                          className="px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B] rounded-xl text-[13px] flex items-center justify-between gap-3 font-medium"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              void previewFile(
                                `/api/events/${viewingEvent.event_id}/attachments/${index}/file/`,
                                file.file_name || file.format || "Attachment"
                              ).catch((error: unknown) => {
                                showToast(
                                  error instanceof Error
                                    ? error.message
                                    : "Unable to preview this attachment.",
                                  "error"
                                )
                              })
                            }}
                            className="flex items-center gap-2 hover:text-[#2563EB] truncate text-left cursor-pointer"
                          >
                            <span>📎</span>
                            <span className="truncate">
                              {file.file_name || file.format || "Attachment"}
                            </span>
                          </button>

                          {file.public_id && (
                            <button
                              onClick={() =>
                                handleDeleteAttachment(
                                  file.public_id!
                                )
                              }
                              className="text-[#DC2626] hover:underline text-[11px] cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0] p-6 text-center text-[13px] text-[#94A3B8]">
                    No documents or attachments provided for this event yet.
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-[#F1F5F9]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[14px] font-bold text-[#1E293B]">
                      Registered Students (
                      {registrations.length})
                    </h3>

                    <p className="text-[12px] text-[#64748B] mt-0.5">
                      Students registered for this event.
                    </p>
                  </div>

                  {registrations.length > 0 && (
                    <button
                      onClick={() =>
                        handleExportCSV(
                          viewingEvent,
                          registrations
                        )
                      }
                      className="px-3 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E293B] text-[12px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      📥 Export CSV
                    </button>
                  )}
                </div>

                {loadingRegistrations ? (
                  <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-6 text-center text-[13px] text-[#94A3B8]">
                    Loading registrations...
                  </div>
                ) : registrations.length === 0 ? (
                  <div className="bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0] p-6 text-center text-[13px] text-[#94A3B8]">
                    No students have registered for this event yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                    <table className="w-full text-left text-[12px] text-[#1E293B]">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="px-4 py-3">
                            Roll No
                          </th>
                          <th className="px-4 py-3">
                            Registered Date
                          </th>
                          <th className="px-4 py-3">
                            Status
                          </th>
                          <th className="px-4 py-3">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#E2E8F0]">
                        {registrations.map(
                          (registration) => (
                            <tr
                              key={
                                registration.registration_id
                              }
                              className="hover:bg-[#F8FAFC] transition-colors"
                            >
                              <td className="px-4 py-3 font-semibold text-[#1E293B]">
                                {registration.roll_no}
                              </td>

                              <td className="px-4 py-3 text-[#64748B]">
                                {new Date(
                                  registration.registration_date
                                ).toLocaleDateString(
                                  "en-IN"
                                )}
                              </td>

                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                                    registration.status ===
                                    "Attended"
                                      ? "bg-[#F0FDF4] text-[#16A34A]"
                                      : registration.status ===
                                        "Cancelled"
                                      ? "bg-[#FEF2F2] text-[#DC2626]"
                                      : "bg-[#EFF6FF] text-[#2563EB]"
                                  }`}
                                >
                                  {
                                    registration.status
                                  }
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                {registration.status ===
                                "Registered" ? (
                                  <button
                                    onClick={() =>
                                      handleMarkAttended(
                                        registration
                                      )
                                    }
                                    className="text-[#2563EB] hover:underline font-semibold cursor-pointer"
                                  >
                                    Mark Attended
                                  </button>
                                ) : (
                                  <span className="text-[#94A3B8]">
                                    -
                                  </span>
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
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm sticky top-6 space-y-6">
              <h3 className="text-[15px] font-bold text-[#1E293B] pb-3 border-b border-[#F1F5F9]">
                Event Overview
              </h3>

              <div className="space-y-4 text-[13px]">
                <div>
                  <span className="text-[11px] font-bold text-[#94A3B8] tracking-wider uppercase block mb-1">
                    DATE
                  </span>
                  <span className="text-[#1E293B] font-semibold">
                    {formatDate(
                      viewingEvent.event_date
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[#94A3B8] tracking-wider uppercase block mb-1">
                    TIME
                  </span>
                  <span className="text-[#1E293B] font-semibold">
                    {formatTime(viewingEvent.time)}
                    {viewingEvent.end_time &&
                      ` – ${formatTime(viewingEvent.end_time)}`}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[#94A3B8] tracking-wider uppercase block mb-1">
                    VENUE
                  </span>
                  <span className="text-[#1E293B] font-semibold">
                    {viewingEvent.location ||
                      viewingEvent.room_no ||
                      "-"}
                  </span>

                  {viewingEvent.room_no && (
                    <span className="block text-[#64748B] text-[12px] mt-1">
                      Room: {viewingEvent.room_no}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[#94A3B8] tracking-wider uppercase block mb-1">
                    STATUS
                  </span>
                  <span className="text-[#1E293B] font-semibold">
                    {statusLabel(
                      viewingEvent.status
                    )}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9]">
                  <div className="flex items-center justify-between text-[12px] mb-2">
                    <span className="text-[#64748B]">
                      Availability
                    </span>

                    <span className="font-semibold text-[#1E293B]">
                      {seatsRemaining} seats left
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          viewingEvent.capacity > 0
                            ? (registeredCount /
                                viewingEvent.capacity) *
                                100
                            : 0
                        )}%`,
                        backgroundColor:
                          colors.border,
                      }}
                    />
                  </div>
                </div>
              </div>

              {isOwner ? (
                <div className="pt-2">
                  <button
                    onClick={() =>
                      handleOpenEditPage(
                        viewingEvent
                      )
                    }
                    className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold rounded-xl shadow-sm transition-all cursor-pointer text-center"
                  >
                    Edit Event
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-center text-[12px] text-[#64748B] font-medium">
                    Event management
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (
    viewMode === "create" ||
    viewMode === "edit"
  ) {
    return (
      <div className="p-6 max-w-[900px] mx-auto">
        <div className="mb-6 pb-4 border-b border-[#E2E8F0]">
          <button
            onClick={() => setViewMode("list")}
            className="text-[13px] text-[#2563EB] hover:underline flex items-center gap-1 mb-2 font-medium cursor-pointer"
          >
            ← Back to Events
          </button>

          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            {viewMode === "edit"
              ? "Edit Event"
              : "Create Event"}
          </h1>

          <p className="text-[13px] text-[#64748B] mt-0.5">
            Faculty — Create/Edit Event
          </p>
        </div>

        <form
          onSubmit={handleSubmitForm}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm space-y-6"
        >
          <h2 className="text-[15px] font-bold text-[#1E293B] pb-2 border-b border-[#F1F5F9]">
            Event Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
                Event Name *
              </label>

              <input
                type="text"
                required
                placeholder="Enter event name"
                value={formData.event_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    event_name: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
                Event Type
              </label>

              <select
                value={formData.event_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    event_type: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#2563EB] focus:bg-white transition-all cursor-pointer"
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
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
                Status
              </label>

              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status:
                      e.target.value as EventStatus,
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#2563EB] focus:bg-white transition-all cursor-pointer"
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

            <div className="md:col-span-2">
              <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
                Description
              </label>

              <textarea
                rows={5}
                placeholder="Describe the event..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
                Date *
              </label>

              <input
                type="date"
                required
                value={formData.event_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    event_date: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
                Start time *
              </label>

              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    time: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
                End time *
              </label>

              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    end_time: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
                Capacity
              </label>

              <input
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    capacity: Number(
                      e.target.value
                    ),
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
                Location
              </label>

              <input
                type="text"
                placeholder="e.g. Main Auditorium / CSE Block"
                value={formData.location}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
                Room
              </label>

              <input
                type="text"
                placeholder="e.g. Lab 302"
                value={formData.room_no}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    room_no: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
                Organizer
              </label>

              <input
                type="text"
                placeholder="e.g. Dr. A. Sharma / Dept of Computer Science"
                value={formData.organizer}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    organizer: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>

            <div className="md:col-span-2 pt-2">
              <label className="block text-[13px] font-semibold text-[#1E293B] mb-2">
                Attachments
              </label>

              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E293B] text-[13px] font-medium rounded-xl cursor-pointer transition-colors border border-[#CBD5E1] mb-3">
                + Add Files

                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-[12px] font-medium text-[#64748B]">
                    Selected files:
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map(
                      (file, index) => (
                        <span
                          key={`${file.name}-${index}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#EFF6FF] text-[#2563EB] text-[12px] font-medium rounded-lg border border-[#BFDBFE]"
                        >
                          📎 {file.name}

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveSelectedFile(
                                index
                              )
                            }
                            className="text-[#94A3B8] hover:text-[#DC2626] font-bold cursor-pointer transition-colors ml-1"
                          >
                            ✕
                          </button>
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#F1F5F9]">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="px-5 py-2.5 border border-[#E2E8F0] text-[13px] font-medium text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-xl cursor-pointer transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-[13px] font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {saving
                ? "Saving..."
                : viewMode === "edit"
                ? "Update Event"
                : "Publish Event"}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            Events
          </h1>

          <p className="text-[13px] text-[#64748B] mt-0.5">
            Create and manage campus events
          </p>
        </div>

        <button
          onClick={handleOpenCreatePage}
          className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <span>+</span> Create Event
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          {
            label: "Total Events",
            count: totalEventsCount,
            tabKey: "All",
          },
          {
            label: "Upcoming",
            count: upcomingCount,
            tabKey: "Upcoming",
          },
          {
            label: "Completed",
            count: completedCount,
            tabKey: "Completed",
          },
          {
            label: "Cancelled",
            count: cancelledCount,
            tabKey: "Cancelled",
          },
          {
            label: "Your Events",
            count: yourEventsCount,
            tabKey: "Your Events",
          },
        ].map((metric) => {
          const isActive =
            activeTab === metric.tabKey

          return (
            <button
              key={metric.label}
              onClick={() =>
                setActiveTab(
                  metric.tabKey as typeof activeTab
                )
              }
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                isActive
                  ? "bg-white border-[#2563EB] shadow-sm ring-1 ring-[#2563EB]"
                  : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1]"
              }`}
            >
              <div className="text-[12px] font-medium text-[#64748B]">
                {metric.label}
              </div>

              <div className="text-[22px] font-bold text-[#1E293B] mt-1">
                {metric.count}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            "All",
            "Your Events",
            ...eventTypes,
          ].map((category) => (
            <button
              key={category}
              onClick={() =>
                setCategoryFilter(category)
              }
              className={`px-4 py-1.5 text-[12px] font-medium rounded-full transition-all cursor-pointer whitespace-nowrap ${
                categoryFilter === category
                  ? "bg-[#2563EB] text-white font-semibold shadow-sm"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#1E293B]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB] transition-all"
          />

          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center text-[#94A3B8] text-[13px]">
          Loading events...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.length === 0 ? (
            <div className="col-span-full bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center text-[#94A3B8] text-[13px]">
              No events found matching your criteria.
            </div>
          ) : (
            sortEventsForFaculty(filteredEvents).map((event) => {
              const colors =
                typeColor[event.event_type] ||
                typeColor.Workshop

              const registeredCount =
                event.registered_count

              const seatsRemaining =
                event.available_seats

              const isOwner =
                String(event.created_by) ===
                String(currentUser?.backendId)

              return (
                <div
                  key={event.event_id}
                  className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow relative"
                >
                {(event.status === "Completed" ||
                  event.status === "Cancelled") && (
                  <span
                    className={`absolute top-3 right-3 z-10 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      event.status === "Completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {event.status}
                  </span>
                )}
                  <div
                    className="h-1.5 w-full"
                    style={{
                      backgroundColor:
                        colors.border,
                    }}
                  />

                  <div className="p-5 pt-11 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3 pr-20">
                        <span
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              colors.tagBg,
                            color: colors.tagText,
                          }}
                        >
                          {event.event_type}
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-[#94A3B8]">
                            {event.organizer}
                          </span>

                          {isOwner && (
                            <button
                              onClick={() =>
                                handleOpenEditPage(
                                  event
                                )
                              }
                              className="text-[11px] font-medium text-[#2563EB] hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-[15px] font-bold text-[#1E293B] mb-1.5">
                        {event.event_name}
                      </h3>

                      <p className="text-[12px] text-[#64748B] line-clamp-2 leading-relaxed mb-4">
                        {event.description}
                      </p>

                      <div className="space-y-1.5 text-[12px] text-[#64748B] mb-4">
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span>
                            {formatDate(
                              event.event_date
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span>🕒</span>
                          <span>
                            {formatTime(event.time)}
                            {event.end_time &&
                              ` – ${formatTime(event.end_time)}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span>
                            {event.location ||
                              event.room_no ||
                              "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mb-1.5">
                        <span>
                          {registeredCount} registered
                        </span>

                        <span>
                          {seatsRemaining} seats left
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden mb-5">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              event.capacity > 0
                                ? (registeredCount /
                                    event.capacity) *
                                    100
                                : 0
                            )}%`,
                            backgroundColor:
                              colors.border,
                          }}
                        />
                      </div>

                      <button
                        onClick={() =>
                          handleViewDetails(event)
                        }
                        className="w-full py-2 rounded-xl text-[12px] font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50"
                        style={{
                          borderColor:
                            colors.buttonBorder,
                          color:
                            colors.buttonText,
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle
                            cx="12"
                            cy="12"
                            r="3"
                          />
                        </svg>
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this event?"
        message={`"${toDelete?.event_name}" will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}