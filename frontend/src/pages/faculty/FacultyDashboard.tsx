import { useEffect, useState } from "react"
import { useAuth } from "../../store/AuthContext"
import { apiRequest } from "../../api/client"
import { getAccessToken } from "../../api/session"
import {
  getFacultyTimetable,
  type FacultyAttendanceTimetable,
} from "../../api/attendance"
import AcademicCalendarList from "../../components/academics/AcademicCalendarList"
import type { AcademicCalendarEvent } from "../../api/academicAdmin"

interface Props {
  onNavigate: (page: string) => void
}

interface DashboardData {
  courses_teaching: number
  pending_reviews: number
  average_attendance: number
  pending_reviews_by_course: PendingReviewCourse[]
}

interface PendingReviewCourse {
  course_id: string
  course_name: string
  pending_reviews: number
}

type CalendarEvent = AcademicCalendarEvent

const quickActions = [
  {
    label: "Create Assignment",
    icon: "✏️",
    color: "#2563EB",
    bg: "#EFF6FF",
    page: "faculty-assignments",
  },
  {
    label: "Upload Notes",
    icon: "📁",
    color: "#9333EA",
    bg: "#FDF4FF",
    page: "faculty-resources",
  },
  {
    label: "Publish Notice",
    icon: "📢",
    color: "#F97316",
    bg: "#FFF7ED",
    page: "faculty-notices",
  },
  {
    label: "Take Attendance",
    icon: "✅",
    color: "#16A34A",
    bg: "#F0FDF4",
    page: "faculty-attendance",
  },
  {
    label: "Schedule Event",
    icon: "🗓️",
    color: "#0891B2",
    bg: "#ECFEFF",
    page: "faculty-events",
  },
  {
    label: "Library Catalog",
    icon: "📚",
    color: "#2563EB",
    bg: "#F0F9FF",
    page: "library",
  },
]

function formatTime(time: string) {
  if (!time) return "—"

  const [hours, minutes] = time.split(":").map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time
  }

  const date = new Date()
  date.setHours(hours, minutes, 0, 0)

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDate(date: string) {
  if (!date) return "—"

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getEventTypeStyle(type: AcademicCalendarEvent["category"]) {
  if (type === "examination") {
    return {
      bg: "#FFF7ED",
      color: "#F97316",
    }
  }
  if (type === "holiday" || type === "semester_break") {
    return {
      bg: "#F0FDF4",
      color: "#16A34A",
    }
  }
  if (type === "registration") {
    return { bg: "#ECFEFF", color: "#0891B2" }
  }
  if (type === "result" || type === "academic_event") {
    return { bg: "#FDF4FF", color: "#9333EA" }
  }
  return {
    bg: "#EFF6FF",
    color: "#2563EB",
  }
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
  const format = (value: string) => formatDate(value)
  return event.start_date === event.end_date
    ? format(event.start_date)
    : `${format(event.start_date)} – ${format(event.end_date)}`
}
export default function FacultyDashboard({
  onNavigate,
}: Props) {
  const { currentUser } = useAuth()

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null)
  const [facultyTimetable, setFacultyTimetable] =
    useState<FacultyAttendanceTimetable[]>([])

  const [calendarEvents, setCalendarEvents] = useState<
    CalendarEvent[]
  >([])

  const [loading, setLoading] = useState(true)
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [error, setError] = useState("")
  const [showFullCalendar, setShowFullCalendar] =
    useState(false)

  useEffect(() => {
    loadDashboard()
    loadCalendar()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError("")

      const [data, timetable] = await Promise.all([
        apiRequest<DashboardData>(
          "/api/academics/faculty/dashboard/",
          {
            method: "GET",
            token: getAccessToken() ?? undefined,
          }
        ),
        getFacultyTimetable(),
      ])

      setDashboard(data)
      setFacultyTimetable(timetable)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load faculty dashboard."
      )
    } finally {
      setLoading(false)
    }
  }

  const loadCalendar = async () => {
    try {
      setCalendarLoading(true)

      const data = await apiRequest<CalendarEvent[]>(
        "/api/academics/calendar/",
        {
          method: "GET",
          token: getAccessToken() ?? undefined,
        }
      )

      setCalendarEvents(data)
    } catch {
      setCalendarEvents([])
    } finally {
      setCalendarLoading(false)
    }
  }

  if (showFullCalendar) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => setShowFullCalendar(false)}
              className="text-[13px] text-[#2563EB] font-medium hover:underline flex items-center gap-1 mb-2 cursor-pointer"
            >
              ← Back to Faculty Dashboard
            </button>

            <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
              Academic Calendar
            </h1>

            <p className="text-[13px] text-[#64748B] mt-0.5">
              Complete academic schedule, exam dates, and official holidays
            </p>
          </div>

        </div>

        <AcademicCalendarList
          events={calendarEvents}
          loading={calendarLoading}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-10 text-center">
          <div className="text-[13px] text-[#64748B]">
            Loading faculty dashboard...
          </div>
        </div>
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-10 text-center">
          <div className="text-[14px] font-semibold text-[#1E293B]">
            Unable to load faculty dashboard
          </div>

          <div className="text-[12px] text-[#64748B] mt-1">
            {error || "No dashboard data available."}
          </div>

          <button
            onClick={loadDashboard}
            className="mt-4 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-[12px] font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const localWeekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  })
    .format(new Date())
    .toLocaleLowerCase("en-US")

  const todaySchedule = facultyTimetable
    .filter(
      (entry) =>
        entry.day.trim().toLocaleLowerCase("en-US") ===
        localWeekday
    )
    .sort((first, second) =>
      first.start_time.localeCompare(second.start_time)
    )

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            Good day, {currentUser?.name} 👋
          </h1>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13px] text-[#64748B]">
              {currentUser?.department}
            </span>

            {currentUser?.department &&
              currentUser?.designation && (
                <span className="text-[#CBD5E1]">
                  ·
                </span>
              )}

            <span className="text-[13px] text-[#64748B]">
              {currentUser?.designation}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#64748B] bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5">
            {new Date().toLocaleDateString(
              "en-US",
              {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }
            )}
          </span>

          <span className="text-[12px] bg-[#FFF7ED] text-[#F97316] border border-[#FED7AA] rounded-lg px-3 py-1.5 font-medium">
            {dashboard.pending_reviews} reviews pending
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Courses Teaching",
            value: String(
              dashboard.courses_teaching
            ),
            sub: "Currently assigned",
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
                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
              </svg>
            ),
          },
          {
            label: "Classes Today",
            value: String(todaySchedule.length),
            sub: "Scheduled today",
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
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="18"
                  rx="2"
                />
                <line
                  x1="16"
                  y1="2"
                  x2="16"
                  y2="6"
                />
                <line
                  x1="8"
                  y1="2"
                  x2="8"
                  y2="6"
                />
                <line
                  x1="3"
                  y1="10"
                  x2="21"
                  y2="10"
                />
              </svg>
            ),
          },
          {
            label: "Pending Reviews",
            value: String(
              dashboard.pending_reviews
            ),
            sub: "Submissions awaiting grade",
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
            label: "Avg. Attendance",
            value: `${dashboard.average_attendance}%`,
            sub:
              dashboard.average_attendance === 0
                ? "No records yet"
                : "Across your classes",
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
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 010 7.75" />
              </svg>
            ),
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border p-4 bg-white hover:shadow-md transition-shadow cursor-default"
            style={{
              borderColor: card.border,
            }}
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

      {/* Today's Schedule + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-[14px] font-semibold text-[#1E293B]">
                Today's Schedule
              </h2>

              <p className="text-[11px] text-[#94A3B8]">
                {todaySchedule.length} classes scheduled today
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {todaySchedule.length === 0 ? (
              <div className="px-5 py-8 text-center text-[12px] text-[#94A3B8]">
                No classes scheduled today
              </div>
            ) : (
              todaySchedule.map((item, index) => (
                <div
                  key={item.timetable_id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div
                    className="w-1 h-10 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        index % 3 === 0
                          ? "#2563EB"
                          : index % 3 === 1
                          ? "#9333EA"
                          : "#F97316",
                    }}
                  />

                  <div className="w-28 flex-shrink-0">
                    <div className="text-[12px] font-semibold text-[#1E293B]">
                      {formatTime(
                        item.start_time
                      )}
                    </div>

                    <div className="text-[11px] text-[#94A3B8]">
                      {formatTime(
                        item.end_time
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1E293B] truncate">
                      {item.course_name}
                    </div>

                    <div className="text-[11px] text-[#94A3B8]">
                      {item.course_id}
                      {" · "}
                      {item.class_type}
                      {" · "}
                      Year {item.year}
                      {" · "}
                      Div {item.div}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-[12px] font-medium text-[#475569]">
                      {item.room_no
                        ? `Room ${item.room_no}`
                        : "Room —"}
                    </div>

                    {item.block && (
                      <div className="text-[10px] text-[#94A3B8]">
                        {item.block}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h2 className="text-[14px] font-semibold text-[#1E293B] mb-4">
            Quick Actions
          </h2>

          <div className="flex flex-col gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() =>
                  onNavigate(action.page)
                }
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:scale-[1.01] transition-transform text-left cursor-pointer"
                style={{
                  backgroundColor: action.bg,
                }}
              >
                <span className="text-[18px]">
                  {action.icon}
                </span>

                <span
                  className="text-[13px] font-semibold"
                  style={{
                    color: action.color,
                  }}
                >
                  {action.label}
                </span>

                <svg
                  className="ml-auto"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  style={{
                    color: action.color,
                    opacity: 0.5,
                  }}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Reviews + Academic Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-semibold text-[#1E293B]">
                Pending Assignment Reviews
              </h2>

              {dashboard.pending_reviews_by_course.length >
                0 && (
                <span className="text-[10px] font-bold bg-[#F97316] text-white rounded-full px-1.5 py-0.5">
                  {
                    dashboard.pending_reviews_by_course
                      .length
                  }
                </span>
              )}
            </div>

            <button
              onClick={() =>
                onNavigate("faculty-assignments")
              }
              className="text-[12px] text-[#2563EB] font-medium hover:underline cursor-pointer"
            >
              All assignments →
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {dashboard.pending_reviews_by_course
              .length === 0 ? (
              <div className="px-5 py-8 text-center text-[12px] text-[#94A3B8]">
                Nothing to grade right now
              </div>
            ) : (
              dashboard.pending_reviews_by_course.map(
                (course) => (
                  <div
                    key={course.course_id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#1E293B]">
                        {course.course_name}
                      </div>

                      <div className="text-[11px] text-[#94A3B8] mt-0.5">
                        {course.course_id}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-[18px] font-bold text-[#F97316]">
                        {course.pending_reviews}
                      </div>

                      <div className="text-[10px] text-[#94A3B8]">
                        awaiting grade
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        onNavigate(
                          "faculty-assignments"
                        )
                      }
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                )
              )
            )}
          </div>
        </div>

        {/* Academic Calendar */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden flex flex-col h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-[14px] font-semibold text-[#1E293B]">
                Academic Calendar
              </h2>

              <p className="text-[11px] text-[#94A3B8]">
                Official academic schedule
              </p>
            </div>

            <button
              onClick={() =>
                setShowFullCalendar(true)
              }
              className="text-[12px] text-[#2563EB] font-medium hover:underline cursor-pointer"
            >
              View full calendar →
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9] flex-1">
            {calendarLoading ? (
              <div className="px-5 py-8 text-center text-[12px] text-[#94A3B8]">
                Loading calendar...
              </div>
            ) : calendarEvents.length === 0 ? (
              <div className="px-5 py-8 text-center text-[12px] text-[#94A3B8]">
                No academic calendar entries available
              </div>
            ) : (
              calendarEvents
                .slice(0, 3)
                .map((item) => {
                  const style =
                    getEventTypeStyle(
                  item.category
                    )

                  return (
                    <button
                      key={item.calendar_id}
                      onClick={() =>
                        setShowFullCalendar(true)
                      }
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#F8FAFC] transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-1 h-7 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              style.color,
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
                          backgroundColor:
                            style.bg,
                          color: style.color,
                        }}
                      >
                        {calendarCategoryLabel(item.category)}
                      </span>
                    </button>
                  )
                })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}