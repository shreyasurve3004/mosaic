import { useEffect, useState } from "react"
import { apiRequest } from "../api/client"
import { getAccessToken } from "../api/session"
import { useAuth } from "../store/AuthContext"
import AcademicCalendarList from "../components/academics/AcademicCalendarList"
import type { AcademicCalendarEvent } from "../api/academicAdmin"

interface Props {
  onNavigate: (page: string) => void
}

interface TimetableItem {
  timetable_id: number
  course_id: string
  course_name: string
  faculty_id: string
  faculty_name: string
  day: string
  start_time: string
  end_time: string
  room_no: string
  block: string
  floor: string
  room_type: string
  class_type: string
  year: string
  sem: number
  div: string
  batch: string | null
  academic_year: string
}

interface DashboardAssignment {
  assignment_id: number
  title: string
  course_id: string
  course_name: string
  due_date: string
  max_marks: number
}

interface StudentDashboardResponse {
  attendance: number
  pending_assignments: number
  cgpa: number | null
  today_schedule: TimetableItem[]
  upcoming_assignments: DashboardAssignment[]
}

type CalendarEvent = AcademicCalendarEvent

interface Notice {
  notice_id: number
  title: string
  category: string
  priority: string
  status: string
  content: string
  published_date: string | null
  expiry_date: string | null
}

interface EventItem {
  event_id: number
  event_name: string
  event_type: string
  event_date: string
  time: string
  location: string
  room_no: string
  status: string
}

interface EventRegistration {
  registration_id: number
  event: number
  status: string
}

function formatTime(time: string) {
  if (!time) return "-"

  const [hoursString, minutes] = time.split(":")
  const hours = Number(hoursString)

  if (Number.isNaN(hours)) return time

  const period = hours >= 12 ? "PM" : "AM"
  const displayHours = hours % 12 || 12

  return `${displayHours}:${minutes} ${period}`
}

function formatDate(date: string | null | undefined) {
  if (!date) return "-"

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return date

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function calendarCategoryLabel(category: AcademicCalendarEvent["category"]) {
  return {
    semester: "Semester",
    examination: "Examination",
    holiday: "Holiday",
    registration: "Registration",
    result: "Result Declaration",
    semester_break: "Semester Break",
    academic_event: "Academic Event",
    other: "Other",
  }[category]
}

function formatCalendarRange(event: AcademicCalendarEvent) {
  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  return event.start_date === event.end_date
    ? format(event.start_date)
    : `${format(event.start_date)} – ${format(event.end_date)}`
}

function calendarCategoryColor(category: AcademicCalendarEvent["category"]) {
  if (category === "examination") {
    return { color: "#F97316", background: "#FFF7ED" }
  }
  if (category === "holiday" || category === "semester_break") {
    return { color: "#16A34A", background: "#F0FDF4" }
  }
  if (category === "registration") {
    return { color: "#0891B2", background: "#ECFEFF" }
  }
  if (category === "result" || category === "academic_event") {
    return { color: "#9333EA", background: "#FDF4FF" }
  }
  return { color: "#2563EB", background: "#EFF6FF" }
}

export default function Dashboard({ onNavigate }: Props) {
  const { currentUser } = useAuth()

  const [dashboardData, setDashboardData] =
    useState<StudentDashboardResponse | null>(null)

  const [calendarEvents, setCalendarEvents] =
    useState<CalendarEvent[]>([])

  const [notices, setNotices] =
    useState<Notice[]>([])

  const [events, setEvents] =
    useState<EventItem[]>([])

  const [registrations, setRegistrations] =
    useState<EventRegistration[]>([])

  // State to toggle full academic calendar view inside Dashboard
  const [showFullCalendar, setShowFullCalendar] =
    useState<boolean>(false)

  const [calendarLoading, setCalendarLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      const token = getAccessToken()

      if (!token) {
        return
      }

      try {
        const [
          dashboardResponse,
          calendarResponse,
          noticesResponse,
          eventsResponse,
          registrationsResponse,
        ] = await Promise.all([
          apiRequest<StudentDashboardResponse>(
            "/api/academics/dashboard/",
            {
              token,
            }
          ),

          apiRequest<CalendarEvent[]>(
            "/api/academics/calendar/",
            {
              token,
            }
          ),

          apiRequest<Notice[]>(
            "/api/notices/active/",
            {
              token,
            }
          ),

          apiRequest<EventItem[]>(
            "/api/events/upcoming/",
            {
              token,
            }
          ),

          apiRequest<EventRegistration[]>(
            "/api/events/registrations/",
            {
              token,
            }
          ),
        ])

        if (!mounted) return

        setDashboardData(dashboardResponse)
        setCalendarEvents(calendarResponse)
        setCalendarLoading(false)
        setNotices(noticesResponse)
        setEvents(eventsResponse)
        setRegistrations(registrationsResponse)
      } catch (error) {
        console.error("Failed to load student dashboard:", error)

        if (!mounted) return

        setDashboardData(null)
        setCalendarEvents([])
        setCalendarLoading(false)
        setNotices([])
        setEvents([])
        setRegistrations([])
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  const firstName =
    currentUser?.name.split(" ")[0] ?? "there"

  const schedule =
    dashboardData?.today_schedule ?? []

  const pendingCount =
    dashboardData?.pending_assignments ?? 0

  const upcomingAssignments =
    (dashboardData?.upcoming_assignments ?? [])
      .slice(0, 3)
      .map(assignment => ({
        subject: assignment.course_name,
        title: assignment.title,
        due: formatDate(assignment.due_date),
        urgent: false,
      }))

  const myNotices = notices
    .slice(0, 3)

  const upcomingEvents = events

  const registeredEventIds = new Set(
    registrations
      .filter(
        registration =>
          registration.status.toLowerCase() === "registered"
      )
      .map(registration => registration.event)
  )

  const openRegistrationCount =
    upcomingEvents.filter(
      event => !registeredEventIds.has(event.event_id)
    ).length

  const academicYear =
    calendarEvents[0]?.academic_year ?? "-"

  const semester =
    currentUser?.sem ??
    schedule[0]?.sem ??
    "-"

  // Full-page Read-Only Academic Calendar View inside Dashboard
  if (showFullCalendar) {
    return (
      <div className="p-6 max-w-[1400px]">
        {/* Back Button & Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => setShowFullCalendar(false)}
              className="text-[13px] text-[#2563EB] font-medium hover:underline flex items-center gap-1 mb-2 cursor-pointer"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
              Academic Calendar
            </h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Complete academic timeline, examination dates, and holidays for the current semester
            </p>
          </div>
          <span className="text-[12px] font-medium text-[#64748B] bg-[#F1F5F9] px-3 py-1.5 rounded-lg">
            Academic Year {academicYear}
          </span>
        </div>

        <AcademicCalendarList
          events={calendarEvents}
          loading={calendarLoading}
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })} · Semester {semester}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Attendance",
            value:
              dashboardData?.attendance !== undefined
                ? `${dashboardData.attendance}%`
                : "-",
            sub:
              dashboardData?.attendance !== undefined
                ? dashboardData.attendance >= 75
                  ? "Above 75% threshold"
                  : "Below 75% threshold"
                : "Loading attendance",
            bg: "#EFF6FF",
            text: "#2563EB",
            border: "#BFDBFE",
            icon: (
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            ),
          },
          {
            label: "Pending Assignments",
            value: String(pendingCount),
            sub:
              upcomingAssignments[0]
                ? `Next due ${upcomingAssignments[0].due}`
                : "All caught up",
            bg: "#FFF7ED",
            text: "#F97316",
            border: "#FED7AA",
            icon: (
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            ),
          },
          {
            label: "CGPA",
            value:
              dashboardData?.cgpa !== null &&
              dashboardData?.cgpa !== undefined
                ? String(dashboardData.cgpa)
                : "-",
            sub:
              dashboardData?.cgpa !== null &&
              dashboardData?.cgpa !== undefined
                ? "Latest published result"
                : "No published result",
            bg: "#F0FDF4",
            text: "#16A34A",
            border: "#BBF7D0",
            icon: (
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            ),
          },
          {
            label: "Events This Week",
            value: String(upcomingEvents.length),
            sub: `${openRegistrationCount} registrations open`,
            bg: "#FDF4FF",
            text: "#9333EA",
            border: "#E9D5FF",
            icon: (
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            ),
          },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-xl border p-4 bg-white hover:shadow-md transition-shadow cursor-default"
            style={{ borderColor: card.border }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-[12px] font-medium text-[#64748B]">
                {card.label}
              </div>
              <div
                className="rounded-lg p-1.5"
                style={{
                  backgroundColor: card.bg,
                  color: card.text,
                }}
              >
                {card.icon}
              </div>
            </div>
            <div
              className="text-[26px] font-bold tracking-tight"
              style={{ color: card.text }}
            >
              {card.value}
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-1">
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Today's schedule */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-[14px] font-semibold text-[#1E293B]">
                Today's Schedule
              </h2>
              <p className="text-[11px] text-[#94A3B8]">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={() => onNavigate("academics")}
              className="text-[12px] text-[#2563EB] font-medium hover:underline"
            >
              View timetable →
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {schedule.length === 0 ? (
              <div className="px-5 py-6 text-center text-[12px] text-[#94A3B8]">
                No classes scheduled for today
              </div>
            ) : (
              schedule.map((s, i) => (
                <div
                  key={s.timetable_id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="w-16 text-[11px] font-medium text-[#94A3B8] flex-shrink-0">
                    {formatTime(s.start_time)}
                  </div>

                  <div
                    className="w-1 h-8 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        i === 0
                          ? "#2563EB"
                          : s.class_type.toLowerCase() === "practical"
                          ? "#F97316"
                          : "#CBD5E1",
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#1E293B]">
                      {s.course_name}
                    </div>
                    <div className="text-[11px] text-[#94A3B8]">
                      {s.room_no
                        ? `${s.room_no}${s.block ? ` · ${s.block}` : ""}`
                        : "Room not assigned"}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      s.class_type.toLowerCase() === "practical"
                        ? "bg-[#FFF7ED] text-[#F97316]"
                        : "bg-[#EFF6FF] text-[#2563EB]"
                    }`}
                  >
                    {s.class_type.toLowerCase() === "practical"
                      ? "Lab"
                      : "Lecture"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notices */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-semibold text-[#1E293B]">
                Notices
              </h2>

              {myNotices.length > 0 && (
                <span className="text-[10px] font-semibold bg-[#2563EB] text-white rounded-full px-1.5 py-0.5">
                  {myNotices.length}
                </span>
              )}
            </div>

            <button
              onClick={() => onNavigate("notices")}
              className="text-[12px] text-[#2563EB] font-medium hover:underline cursor-pointer"
            >
              All →
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {myNotices.length === 0 && (
              <div className="px-5 py-6 text-center text-[12px] text-[#94A3B8]">
                You're all caught up
              </div>
            )}

            {myNotices.map(n => (
              <button
                key={n.notice_id}
                onClick={() => onNavigate("notices")}
                className="w-full text-left px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 flex-shrink-0" />

                  <div>
                    <div className="text-[13px] leading-snug font-medium text-[#1E293B]">
                      {n.title}
                    </div>

                    <div className="text-[11px] text-[#94A3B8] mt-0.5">
                      {formatDate(n.published_date)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming assignments */}
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
            <h2 className="text-[14px] font-semibold text-[#1E293B]">
              Upcoming Assignments
            </h2>

            <button
              onClick={() => onNavigate("assignments")}
              className="text-[12px] text-[#2563EB] font-medium hover:underline cursor-pointer"
            >
              Kanban view →
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {upcomingAssignments.length === 0 && (
              <div className="px-5 py-6 text-center text-[12px] text-[#94A3B8]">
                Nothing pending 🎉
              </div>
            )}

            {upcomingAssignments.map((a, i) => (
              <button
                key={`${a.title}-${i}`}
                onClick={() => onNavigate("assignments")}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors text-left cursor-pointer"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: a.urgent
                      ? "#F97316"
                      : "#CBD5E1",
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#1E293B] truncate">
                    {a.title}
                  </div>

                  <div className="text-[11px] text-[#94A3B8]">
                    {a.subject}
                  </div>
                </div>

                <span
                  className={`text-[11px] font-medium flex-shrink-0 ${
                    a.urgent
                      ? "text-[#F97316]"
                      : "text-[#94A3B8]"
                  }`}
                >
                  {a.due}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Academic Calendar Widget */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-[14px] font-semibold text-[#1E293B]">
                Academic Calendar
              </h2>

              <p className="text-[11px] text-[#94A3B8]">
                Academic Year {academicYear}
              </p>
            </div>

            <button
              onClick={() => setShowFullCalendar(true)}
              className="text-[12px] text-[#2563EB] font-medium hover:underline cursor-pointer"
            >
              View full calendar →
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {calendarEvents
              .slice(0, 3)
              .map((item) => {
                const style = calendarCategoryColor(item.category)
                return (
                <button
                  key={item.calendar_id}
                  onClick={() => setShowFullCalendar(true)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#F8FAFC] transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-1 h-7 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: style.color,
                      }}
                    />

                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-[#1E293B] truncate">
                        {item.title}
                      </div>

                      <div className="text-[11px] text-[#94A3B8]">
                        {formatCalendarRange(item)}
                      </div>
                    </div>
                  </div>

                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                    style={{
                      backgroundColor: style.background,
                      color: style.color,
                    }}
                  >
                    {calendarCategoryLabel(item.category)}
                  </span>
                </button>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}