import React, { useState, useEffect } from "react"
import { useAuth } from "../store/AuthContext"
import { useToast } from "../components/ui/ToastContext"
import { Field, TextInput, Button } from "../components/ui/FormControls"

export default function Settings() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  // Guard: Settings page is strictly for Student and Faculty roles
  if (currentUser?.role === "admin") {
    return (
      <div className="p-8 max-w-[800px] mx-auto text-center">
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-8 shadow-sm">
          <div className="w-12 h-12 bg-[#FEF2F2] text-[#EF4444] rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
            !
          </div>
          <h2 className="text-[18px] font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-2">Admin Settings Unavailable</h2>
          <p className="text-[13px] text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto">
            This settings panel is designed for Student and Faculty portal accounts. System administrators should manage global configurations through the Admin Console.
          </p>
        </div>
      </div>
    )
  }

  // Tab State
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "security" | "preferences">("profile")

  // Notification States
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    eventReminders: true,
    assignmentUpdates: true,
    weeklyDigest: false,
  })

  // Security Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Theme Initializer
  const [preferences, setPreferences] = useState(() => {
    const savedTheme = localStorage.getItem("theme") || "light"
    return {
      theme: savedTheme,
      compactView: false,
      language: "English (US)",
      showOnlineStatus: true,
    }
  })

  // Sync theme with HTML document root
  useEffect(() => {
    const root = document.documentElement
    if (preferences.theme === "dark") {
      root.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else if (preferences.theme === "light") {
      root.classList.remove("dark")
      localStorage.setItem("theme", "light")
    } else if (preferences.theme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (systemDark) root.classList.add("dark")
      else root.classList.remove("dark")
      localStorage.setItem("theme", "system")
    }
  }, [preferences.theme])

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] }
      showToast("Notification preferences updated", "info")
      return updated
    })
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordForm.currentPassword) {
      showToast("Please enter your current password", "error")
      return
    }
    if (passwordForm.newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error")
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("New passwords do not match", "error")
      return
    }

    showToast("Password updated successfully", "success")
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
  }

  const handlePreferenceChange = (key: keyof typeof preferences, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
    showToast("Settings saved", "success")
  }

  return (
    <div className="p-6 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#1E293B] dark:text-[#F8FAFC] tracking-tight">Settings</h1>
        <p className="text-[13px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">Manage your account preferences, privacy, and system notifications.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E2E8F0] dark:border-[#334155] mb-6">
        {[
          { id: "profile", label: "Profile Overview" },
          { id: "notifications", label: "Notifications" },
          { id: "security", label: "Security & Password" },
          { id: "preferences", label: "App Preferences" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-2 text-[13px] font-medium transition-all relative ${
              activeTab === tab.id ? "text-[#2563EB] font-semibold" : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B]"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-t-md" />}
          </button>
        ))}
      </div>

      {/* Profile Overview Tab */}
      {activeTab === "profile" && (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-6 space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-[#F1F5F9] dark:border-[#334155]">
            <div className="w-16 h-16 rounded-full bg-[#2563EB] text-white font-bold text-xl flex items-center justify-center uppercase">
              {currentUser?.avatar || currentUser?.name?.[0] || "U"}
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">{currentUser?.name || "User Name"}</h2>
              <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8] capitalize">
                {currentUser?.role} {currentUser?.department ? `· ${currentUser.department}` : ""}
              </p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-[#F0FDF4] dark:bg-[#064E3B] text-[#16A34A] dark:text-[#4ADE80] border border-[#BBF7D0] dark:border-[#166534] rounded-full text-[10px] font-semibold">
                Active Account
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name">
              <TextInput value={currentUser?.name || ""} disabled className="bg-[#F8FAFC] dark:bg-[#0F172A] dark:text-[#94A3B8] cursor-not-allowed" />
            </Field>

            <Field label="Email Address">
              <TextInput value={currentUser?.email || ""} disabled className="bg-[#F8FAFC] dark:bg-[#0F172A] dark:text-[#94A3B8] cursor-not-allowed" />
            </Field>

            <Field label="Department">
              <TextInput value={currentUser?.department || "N/A"} disabled className="bg-[#F8FAFC] dark:bg-[#0F172A] dark:text-[#94A3B8] cursor-not-allowed" />
            </Field>

            <Field label="Role">
              <TextInput value={currentUser?.role || ""} disabled className="bg-[#F8FAFC] dark:bg-[#0F172A] dark:text-[#94A3B8] cursor-not-allowed capitalize" />
            </Field>

            {currentUser?.role === "student" && (
              <>
                <Field label="Academic Year">
                  <TextInput value={currentUser?.year || "N/A"} disabled className="bg-[#F8FAFC] dark:bg-[#0F172A] dark:text-[#94A3B8] cursor-not-allowed" />
                </Field>

                <Field label="Division / Semester">
                  <TextInput
                    value={currentUser?.division ? `Div ${currentUser.division} (Sem ${currentUser.sem || "N/A"})` : "N/A"}
                    disabled
                    className="bg-[#F8FAFC] dark:bg-[#0F172A] dark:text-[#94A3B8] cursor-not-allowed"
                  />
                </Field>
              </>
            )}

            {currentUser?.role === "faculty" && (
              <Field label="Designation">
                <TextInput value={currentUser?.designation || "Faculty Member"} disabled className="bg-[#F8FAFC] dark:bg-[#0F172A] dark:text-[#94A3B8] cursor-not-allowed" />
              </Field>
            )}
          </div>

          <div className="bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg p-4 text-[12px] text-[#64748B] dark:text-[#94A3B8]">
            Primary account attributes (Name, Email, Department) are managed centrally. Please reach out to administrative staff for updates.
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-6 space-y-6">
          <h3 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Notification Preferences</h3>

          {[
            { key: "emailAlerts", label: "Email Notifications", desc: "Receive email notifications for announcements and updates." },
            { key: "pushNotifications", label: "Browser Alerts", desc: "Enable direct desktop popups for critical deadlines." },
            { key: "eventReminders", label: "Event Notifications", desc: "Reminders for campus workshops, seminars, and registered events." },
            {
              key: "assignmentUpdates",
              label: currentUser?.role === "faculty" ? "Submission Alerts" : "Assignment & Grade Notifications",
              desc: currentUser?.role === "faculty" ? "Alerts when students turn in assignments." : "Alerts when new assignments are posted or graded.",
            },
            { key: "weeklyDigest", label: "Weekly Digest", desc: "Summary of weekly schedules and campus news every Monday." },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-[#F1F5F9] dark:border-[#334155] last:border-b-0">
              <div>
                <div className="text-[13px] font-medium text-[#1E293B] dark:text-[#F8FAFC]">{item.label}</div>
                <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">{item.desc}</div>
              </div>
              <button
                type="button"
                onClick={() => handleNotificationToggle(item.key as keyof typeof notifications)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  notifications[item.key as keyof typeof notifications] ? "bg-[#2563EB]" : "bg-[#CBD5E1] dark:bg-[#475569]"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications[item.key as keyof typeof notifications] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-6 space-y-6">
          <h3 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Change Password</h3>
          <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
            <Field label="Current Password" required>
              <TextInput
                type="password"
                placeholder="••••••••"
                value={passwordForm.currentPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
            </Field>

            <Field label="New Password" required>
              <TextInput
                type="password"
                placeholder="At least 6 characters"
                value={passwordForm.newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
            </Field>

            <Field label="Confirm New Password" required>
              <TextInput
                type="password"
                placeholder="Re-enter new password"
                value={passwordForm.confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </Field>

            <div className="pt-2">
              <Button type="submit" variant="primary">Update Password</Button>
            </div>
          </form>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === "preferences" && (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-6 space-y-6">
          <h3 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Display & Localization</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Interface Theme">
              <select
                value={preferences.theme}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePreferenceChange("theme", e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#334155] text-[13px] bg-[#F8FAFC] dark:bg-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode (Beta)</option>
                <option value="system">Sync with System</option>
              </select>
            </Field>

            <Field label="Language">
              <select
                value={preferences.language}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePreferenceChange("language", e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#334155] text-[13px] bg-[#F8FAFC] dark:bg-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              >
                <option>English (US)</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </Field>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-[#F1F5F9] dark:border-[#334155]">
            <div>
              <div className="text-[13px] font-medium text-[#1E293B] dark:text-[#F8FAFC]">Show Active Status</div>
              <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">Allow peers to see when you are active on the portal.</div>
            </div>
            <button
              type="button"
              onClick={() => handlePreferenceChange("showOnlineStatus", !preferences.showOnlineStatus)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                preferences.showOnlineStatus ? "bg-[#2563EB]" : "bg-[#CBD5E1] dark:bg-[#475569]"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  preferences.showOnlineStatus ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}