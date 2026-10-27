import { useEffect, useState, type ReactNode } from "react"
import { useAuth } from "../../store/AuthContext"
import { useToast } from "../../components/ui/ToastContext"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import {
  getAdminDashboard,
  getAdminNotices,
  getAdminUpcomingEvents,
  archiveAdminNotice,
  deleteAdminNotice,
  type AdminDashboardStats,
  type AdminNotice,
  type AdminEvent,
} from "../../api/admin"
import { getAdminUsers, type AdminUser } from "../../api/users"
import { getAccessToken } from "../../api/session"

interface Props {
  onNavigate: (page: string) => void
}

const quickActions = [
  {
    label: "Add Student",
    icon: "👤",
    color: "#2563EB",
    bg: "#EFF6FF",
    page: "admin-users",
  },
  {
    label: "Add Faculty",
    icon: "🎓",
    color: "#9333EA",
    bg: "#FDF4FF",
    page: "admin-users",
  },
  {
    label: "Publish Notice",
    icon: "📢",
    color: "#F97316",
    bg: "#FFF7ED",
    page: "admin-notices",
  },
  {
    label: "Create Event",
    icon: "🗓️",
    color: "#16A34A",
    bg: "#F0FDF4",
    page: "admin-events",
  },
  {
    label: "View Reports",
    icon: "📊",
    color: "#0891B2",
    bg: "#ECFEFF",
    page: "admin-reports",
  },
]

function StatCard({
  label,
  value,
  sub,
  icon,
  bg,
  text,
  border,
}: {
  label: string
  value: string
  sub: string
  icon: ReactNode
  bg: string
  text: string
  border: string
}) {
  return (
    <div
      className="rounded-xl border p-4 bg-white hover:shadow-md transition-shadow"
      style={{ borderColor: border }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-[12px] font-medium text-[#64748B]">
          {label}
        </div>

        <div
          className="rounded-lg p-1.5"
          style={{
            backgroundColor: bg,
            color: text,
          }}
        >
          {icon}
        </div>
      </div>

      <div
        className="text-[26px] font-bold tracking-tight"
        style={{ color: text }}
      >
        {value}
      </div>

      <div className="text-[11px] text-[#94A3B8] mt-1">
        {sub}
      </div>
    </div>
  )
}

export default function AdminDashboard({ onNavigate }: Props) {
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [notices, setNotices] = useState<AdminNotice[]>([])
  const [events, setEvents] = useState<AdminEvent[]>([])

  const [loading, setLoading] = useState(true)
  const [toDelete, setToDelete] = useState<AdminNotice | null>(null)

  const token = getAccessToken()

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const [
        dashboardData,
        usersData,
        noticesData,
        eventsData,
      ] = await Promise.all([
        getAdminDashboard(token),
        getAdminUsers(token),
        getAdminNotices(token),
        getAdminUpcomingEvents(token),
      ])

      setStats(dashboardData)
      setUsers(usersData)
      setNotices(noticesData)
      setEvents(eventsData)
    } catch (error) {
      console.error("Failed to load admin dashboard:", error)
      showToast("Failed to load dashboard data", "error")
    } finally {
      setLoading(false)
    }
  }

  const students = users.filter(
    user => user.role === "student"
  )

  const facultyList = users.filter(
    user => user.role === "faculty"
  )

  const pendingStudents = students.filter(
    user => user.status === "pending"
  ).length

  const pendingFaculty = facultyList.filter(
    user => user.status === "pending"
  ).length

  const upcomingEvents = events
    .filter(event => event.status === "Upcoming")
    .slice(0, 3)

  const recentNotices = [...notices]
    .filter(notice => notice.status === "Published")
    .sort((a, b) => {
      const first = a.published_date
        ? new Date(a.published_date).getTime()
        : 0

      const second = b.published_date
        ? new Date(b.published_date).getTime()
        : 0

      return second - first
    })
    .slice(0, 3)

  const totalPending =
    pendingStudents +
    pendingFaculty

  const pendingActions = [
    {
      label: "New Student Registrations",
      count: pendingStudents,
      color: "#2563EB",
      bg: "#EFF6FF",
      page: "admin-users",
    },
    {
      label: "Faculty Account Approvals",
      count: pendingFaculty,
      color: "#9333EA",
      bg: "#FDF4FF",
      page: "admin-users",
    },
    {
      label: "Upcoming Events",
      count: events.filter(
        event => event.status === "Upcoming"
      ).length,
      color: "#F97316",
      bg: "#FFF7ED",
      page: "admin-events",
    },
  ]

  const activityTimeline = [
    {
      icon: "👤",
      text: `${students.length} student accounts are registered in the system`,
    },
    {
      icon: "🎓",
      text: `${facultyList.length} faculty accounts are registered in the system`,
    },
    {
      icon: "📢",
      text: `${notices.length} published notices are currently available`,
    },
    {
      icon: "🗓️",
      text: `${events.filter(
        event => event.status === "Upcoming"
      ).length} upcoming events are scheduled`,
    },
  ]

  const archiveNotice = async (id: number) => {
    if (!token) return

    try {
      await archiveAdminNotice(token, id)

      setNotices(prev =>
        prev.filter(notice => notice.notice_id !== id)
      )

      showToast("Notice archived", "info")
    } catch (error) {
      console.error("Failed to archive notice:", error)
      showToast("Failed to archive notice", "error")
    }
  }

  const confirmDeleteNotice = async () => {
    if (!toDelete || !token) return

    try {
      await deleteAdminNotice(
        token,
        toDelete.notice_id
      )

      setNotices(prev =>
        prev.filter(
          notice =>
            notice.notice_id !== toDelete.notice_id
        )
      )

      showToast("Notice deleted", "info")
    } catch (error) {
      console.error("Failed to delete notice:", error)
      showToast("Failed to delete notice", "error")
    } finally {
      setToDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="text-[13px] text-[#64748B]">
          Loading admin dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            Good day,{" "}
            {currentUser?.name
              ?.split(" ")
              .slice(-1)[0] ?? "Admin"}{" "}
            👋
          </h1>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13px] text-[#64748B]">
              System Administrator
            </span>

            <span className="text-[#CBD5E1]">·</span>

            <span className="text-[13px] text-[#64748B]">
              Mosaic University
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#64748B] bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>

          <span className="text-[12px] bg-[#FFF7ED] text-[#F97316] border border-[#FED7AA] rounded-lg px-3 py-1.5 font-medium">
            {totalPending} actions pending
          </span>
        </div>
      </div>

      {/* Institution Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Students"
          value={String(stats?.total_students ?? 0)}
          sub={`${pendingStudents} pending approval`}
          bg="#EFF6FF"
          text="#2563EB"
          border="#BFDBFE"
          icon={
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
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
        />

        <StatCard
          label="Total Faculty"
          value={String(stats?.total_faculty ?? 0)}
          sub={`${pendingFaculty} approvals pending`}
          bg="#FDF4FF"
          text="#9333EA"
          border="#E9D5FF"
          icon={
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          }
        />

        <StatCard
          label="Departments"
          value={String(stats?.total_departments ?? 0)}
          sub={`${stats?.active_courses ?? 0} active courses`}
          bg="#F0FDF4"
          text="#16A34A"
          border="#BBF7D0"
          icon={
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
        />

        <StatCard
          label="Active Courses"
          value={String(stats?.active_courses ?? 0)}
          sub="Across all departments"
          bg="#FFF7ED"
          text="#F97316"
          border="#FED7AA"
          icon={
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
          }
        />
      </div>

      {/* Pending Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {pendingActions.map(action => (
          <button
            key={action.label}
            onClick={() => onNavigate(action.page)}
            className="bg-white rounded-xl border p-4 hover:shadow-md transition-all text-left group"
            style={{
              borderColor: action.color + "30",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-medium text-[#64748B]">
                {action.label}
              </div>

              <svg
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                width="14"
                height="14"
                fill="none"
                stroke={action.color}
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>

            <div className="flex items-end gap-2 mt-2">
              <div
                className="text-[28px] font-bold"
                style={{ color: action.color }}
              >
                {action.count}
              </div>

              <span className="text-[11px] text-[#94A3B8] mb-1">
                {action.label === "Upcoming Events"
                  ? "scheduled"
                  : "awaiting action"}
              </span>
            </div>

            <div
              className="mt-2 h-1 rounded-full"
              style={{
                backgroundColor: action.bg,
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width:
                    action.count > 0
                      ? "75%"
                      : "0%",
                  backgroundColor: action.color,
                  opacity: 0.5,
                }}
              />
            </div>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* System Overview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
            <h2 className="text-[14px] font-semibold text-[#1E293B]">
              System Overview
            </h2>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {activityTimeline.map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[15px] flex-shrink-0 bg-[#F8FAFC]">
                  {activity.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[#1E293B] leading-snug">
                    {activity.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h2 className="text-[14px] font-semibold text-[#1E293B] mb-4">
            Quick Actions
          </h2>

          <div className="flex flex-col gap-2">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => onNavigate(action.page)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:scale-[1.01] transition-transform text-left"
                style={{
                  backgroundColor: action.bg,
                }}
              >
                <span className="text-[18px]">
                  {action.icon}
                </span>

                <span
                  className="text-[13px] font-semibold flex-1"
                  style={{
                    color: action.color,
                  }}
                >
                  {action.label}
                </span>

                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke={action.color}
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  style={{ opacity: 0.4 }}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Notices */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
            <h2 className="text-[14px] font-semibold text-[#1E293B]">
              Recent Notices
            </h2>

            <button
              onClick={() =>
                onNavigate("admin-notices")
              }
              className="text-[12px] text-[#2563EB] font-medium hover:underline"
            >
              Manage →
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {recentNotices.length === 0 && (
              <div className="px-5 py-6 text-center text-[12px] text-[#94A3B8]">
                No notices published yet
              </div>
            )}

            {recentNotices.map(notice => (
              <div
                key={notice.notice_id}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#1E293B] truncate">
                    {notice.title}
                  </div>

                  <div className="text-[11px] text-[#94A3B8]">
                    {notice.category}
                    {notice.published_date
                      ? ` · ${new Date(
                          notice.published_date
                        ).toLocaleDateString()}`
                      : ""}
                  </div>
                </div>

                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() =>
                      archiveNotice(
                        notice.notice_id
                      )
                    }
                    className="text-[11px] px-2 py-0.5 rounded text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                  >
                    Archive
                  </button>

                  <button
                    onClick={() =>
                      setToDelete(notice)
                    }
                    className="text-[11px] px-2 py-0.5 rounded text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
            <h2 className="text-[14px] font-semibold text-[#1E293B]">
              Upcoming Events
            </h2>

            <button
              onClick={() =>
                onNavigate("admin-events")
              }
              className="text-[12px] text-[#2563EB] font-medium hover:underline"
            >
              Manage →
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {upcomingEvents.length === 0 && (
              <div className="px-5 py-6 text-center text-[12px] text-[#94A3B8]">
                No upcoming events
              </div>
            )}

            {upcomingEvents.map(event => {
              const registered = event.registered_count
              const capacity = event.capacity

              const percentage =
                capacity > 0
                  ? Math.round(
                      (registered / capacity) * 100
                    )
                  : 0

              return (
                <div
                  key={event.event_id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="w-2 h-10 rounded-full flex-shrink-0 bg-[#2563EB]" />

                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#1E293B]">
                      {event.event_name}
                    </div>

                    <div className="text-[11px] text-[#94A3B8]">
                      {event.event_date} ·{" "}
                      {event.event_type}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-24 h-1 rounded-full bg-[#F1F5F9] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#2563EB]"
                          style={{
                            width: `${Math.min(
                              percentage,
                              100
                            )}%`,
                          }}
                        />
                      </div>

                      <span className="text-[10px] text-[#94A3B8]">
                        {registered}/{capacity}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      onNavigate("admin-events")
                    }
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-all flex-shrink-0"
                  >
                    View
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this notice?"
        message={`"${toDelete?.title}" will be permanently removed for everyone.`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteNotice}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}