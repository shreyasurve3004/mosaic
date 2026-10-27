import { useState } from "react"

interface Props {
  children: React.ReactNode
  activePage: string
  onNavigate: (page: string) => void
  onLogout: () => void
  user?: { name: string; avatar: string; subtitle: string }
}

const navItems = [
  {
    id: "admin-dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    id: "admin-academics",
    label: "Academic Management",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    id: "admin-users",
    label: "Users",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    id: "admin-library",
    label: "Library",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
    ),
  },
  {
    id: "admin-notices",
    label: "Notices",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
  },
  {
    id: "admin-events",
    label: "Events",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
  },
  {
    id: "admin-reports",
    label: "Reports",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><rect x="2" y="20" width="20" height="2" rx="1"/>
      </svg>
    ),
  },
  {
    id: "admin-settings",
    label: "Settings",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
]

export default function AdminLayout({ children, activePage, onNavigate, onLogout, user }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState("")
  const [notifOpen, setNotifOpen] = useState(false)

  const notifications = [
    { text: "12 new student registrations pending approval", time: "Just now", dot: "#F97316" },
    { text: "Faculty account request: Dr. Patel (IT Dept.)", time: "15m ago", dot: "#2563EB" },
    { text: "Event approval request: Alumni Meet 2026", time: "1h ago", dot: "#9333EA" },
    { text: "Library: 3 overdue returns flagged", time: "2h ago", dot: "#DC2626" },
  ]

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Light Sidebar following light website theme */}
      <aside
        className={`flex flex-col bg-white border-r border-[#E2E8F0] transition-all duration-200 flex-shrink-0 ${collapsed ? "w-[64px]" : "w-[220px]"}`}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 gap-2.5 flex-shrink-0 border-b border-[#F1F5F9]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </button>
          {!collapsed && (
            <div>
              <div className="font-bold text-[14px] text-[#1E293B] tracking-tight leading-none">Mosaic</div>
              <div className="text-[9px] text-[#94A3B8] font-semibold tracking-widest uppercase mt-0.5">Administrator</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2.5 flex flex-col gap-1 overflow-y-auto">
          {navItems.map(item => {
            const active = activePage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all text-left ${
                  active
                    ? "bg-[#EFF6FF] text-[#2563EB] font-semibold"
                    : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
                }`}
              >
                <span className={`flex-shrink-0 ${active ? "text-[#2563EB]" : "text-[#64748B]"}`}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
                {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2563EB]" />}
              </button>
            )
          })}
        </nav>

        
        {/* User Profile */}
        <div className="py-3 px-2.5 border-t border-[#F1F5F9]">
          <div
            className="w-full flex items-center gap-3 px-2.5 py-2"
            title={collapsed ? user?.name ?? "Admin" : undefined}
          >
            <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold">
              {user?.avatar ?? "A"}
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-[#1E293B] truncate">
                  {user?.name ?? "Admin"}
                </div>
                <div className="text-[10px] text-[#94A3B8] truncate">
                  {user?.subtitle ?? ""}
                </div>
              </div>
            )}
          </div>

          {/* Separate Sign Out Button */}
          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left text-[12px] font-medium text-[#64748B] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-all mt-1"
          >
            <span className="w-7 flex-shrink-0 flex justify-center">
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M12 3h6a2 2 0 012 2v14a2 2 0 01-2 2h-6" />
              </svg>
            </span>
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>

      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-[#E2E8F0] bg-white flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1 max-w-xl relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students, faculty, courses, notices..."
              className="w-full h-9 pl-8 pr-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
            />
            {search && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden">
                {[
                  { section: "Students", items: ["Shreya Surve — CS21047", "Rahul Desai — CS21031"] },
                  { section: "Faculty", items: ["Prof. R. Sharma — CE Dept."] },
                  { section: "Courses", items: ["Database Warehouse & Mining — CE501"] },
                ].filter(g => g.items.some(i => i.toLowerCase().includes(search.toLowerCase()))).map(group => (
                  <div key={group.section}>
                    <div className="px-4 py-2 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-[#F1F5F9]">{group.section}</div>
                    {group.items.filter(i => i.toLowerCase().includes(search.toLowerCase())).map(item => (
                      <button key={item} onClick={() => setSearch("")} className="w-full text-left px-4 py-2.5 text-[13px] text-[#1E293B] hover:bg-[#F8FAFC] transition-colors">{item}</button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notification Popover */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] transition-colors relative"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#F97316]" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#1E293B]">Admin Notifications</span>
                    <button onClick={() => setNotifOpen(false)} className="text-[11px] text-[#2563EB]">Clear all</button>
                  </div>
                  {notifications.map((n, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-[#F8FAFC] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: n.dot }} />
                      <div>
                        <div className="text-[12px] text-[#1E293B] leading-snug">{n.text}</div>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5">{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Role Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[11px] font-semibold border border-[#BFDBFE]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
              Admin
            </div>

            <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-[12px] font-semibold cursor-pointer hover:bg-[#1D4ED8] transition-colors">
              {user?.avatar ?? "A"}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}