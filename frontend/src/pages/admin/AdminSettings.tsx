import { useState } from "react"
import { useToast } from "../../components/ui/ToastContext"

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${on ? "bg-[#2563EB]" : "bg-[#CBD5E1]"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden mb-5">
      <div className="px-5 py-3.5 border-b border-[#F1F5F9]">
        <h2 className="text-[14px] font-bold text-[#1E293B]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function AdminSettings() {
  const { showToast } = useToast()
  const [saved, setSaved] = useState(false)
  const [instName, setInstName] = useState("Mosaic University")
  const [instCode, setInstCode] = useState("MU-2026")
  const [instEmail, setInstEmail] = useState("admin@mosaic.edu")
  const [instPhone, setInstPhone] = useState("+91 98765 43210")
  const [instAddr, setInstAddr] = useState("Andheri East, Mumbai, Maharashtra 400093")
  const [acadYear, setAcadYear] = useState("2026–2027")
  const [semStart, setSemStart] = useState("2026-08-01")
  const [semEnd, setSemEnd] = useState("2026-11-30")
  const [primaryColor, setPrimaryColor] = useState("#2563EB")
  const [accentColor, setAccentColor] = useState("#F97316")

  const [emailNotif, setEmailNotif] = useState(true)
  const [smsNotif, setSmsNotif] = useState(false)
  const [inAppNotif, setInAppNotif] = useState(true)
  const [notifOnReg, setNotifOnReg] = useState(true)
  const [notifOnFee, setNotifOnFee] = useState(true)
  const [notifOnAttend, setNotifOnAttend] = useState(false)

  const [twoFA, setTwoFA] = useState(false)
  const [passExpiry, setPassExpiry] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState(true)
  const [auditLog, setAuditLog] = useState(true)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 max-w-[900px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">Settings</h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">Institution configuration and preferences</p>
        </div>
        <button onClick={save} className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] transition-colors">
          Save Changes
        </button>
      </div>

      {saved && (
        <div className="mb-5 px-4 py-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-[13px] text-[#16A34A] font-medium flex items-center gap-2">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Settings saved successfully
        </div>
      )}

      {/* Institution Details */}
      <SectionCard title="Institution Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Institution Name</label>
            <input value={instName} onChange={e => setInstName(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Institution Code</label>
            <input value={instCode} onChange={e => setInstCode(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Email</label>
            <input value={instEmail} onChange={e => setInstEmail(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Phone</label>
            <input value={instPhone} onChange={e => setInstPhone(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Address</label>
            <input value={instAddr} onChange={e => setInstAddr(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]" />
          </div>
        </div>
      </SectionCard>

      {/* Academic Year */}
      <SectionCard title="Academic Year & Calendar">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Academic Year</label>
            <input value={acadYear} onChange={e => setAcadYear(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Semester Start</label>
            <input type="date" value={semStart} onChange={e => setSemStart(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Semester End</label>
            <input type="date" value={semEnd} onChange={e => setSemEnd(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Attendance Threshold (%)</label>
            <input type="number" defaultValue={75} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Lectures Per Day (max)</label>
            <input type="number" defaultValue={8} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]" />
          </div>
        </div>
      </SectionCard>

      {/* Branding */}
      <SectionCard title="Branding">
        <div className="flex flex-wrap items-start gap-5">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-9 h-9 rounded-lg border border-[#E2E8F0] cursor-pointer bg-transparent" />
              <span className="text-[12px] font-mono text-[#64748B]">{primaryColor.toUpperCase()}</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Accent Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-9 h-9 rounded-lg border border-[#E2E8F0] cursor-pointer bg-transparent" />
              <span className="text-[12px] font-mono text-[#64748B]">{accentColor.toUpperCase()}</span>
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Logo Upload</label>
            <div className="h-9 px-3 rounded-lg border border-dashed border-[#CBD5E1] flex items-center gap-2 cursor-pointer hover:border-[#2563EB] transition-colors bg-[#F8FAFC]">
              <svg width="12" height="12" fill="none" stroke="#94A3B8" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span className="text-[12px] text-[#94A3B8]">Upload PNG or SVG (max 1 MB)</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title="Notification Preferences">
        <div className="flex flex-col gap-4">
          {[
            { label: "Email Notifications", sub: "Send notifications via email to students and faculty", val: emailNotif, toggle: () => setEmailNotif(!emailNotif) },
            { label: "SMS Notifications", sub: "Send SMS alerts for critical events (fees, exams)", val: smsNotif, toggle: () => setSmsNotif(!smsNotif) },
            { label: "In-App Notifications", sub: "Push notifications within the Mosaic platform", val: inAppNotif, toggle: () => setInAppNotif(!inAppNotif) },
            { label: "Notify on Registration", sub: "Alert admin on new student/faculty registrations", val: notifOnReg, toggle: () => setNotifOnReg(!notifOnReg) },
            { label: "Fee Reminders", sub: "Automatic reminders before fee deadline", val: notifOnFee, toggle: () => setNotifOnFee(!notifOnFee) },
            { label: "Low Attendance Alerts", sub: "Alert students when attendance falls below threshold", val: notifOnAttend, toggle: () => setNotifOnAttend(!notifOnAttend) },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#1E293B]">{item.label}</div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">{item.sub}</div>
              </div>
              <Toggle on={item.val} onChange={item.toggle} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Security */}
      <SectionCard title="Security Settings">
        <div className="flex flex-col gap-4">
          {[
            { label: "Two-Factor Authentication", sub: "Require 2FA for admin accounts", val: twoFA, toggle: () => setTwoFA(!twoFA) },
            { label: "Password Expiry (90 days)", sub: "Force password reset every 90 days", val: passExpiry, toggle: () => setPassExpiry(!passExpiry) },
            { label: "Session Timeout", sub: "Auto-logout after 30 minutes of inactivity", val: sessionTimeout, toggle: () => setSessionTimeout(!sessionTimeout) },
            { label: "Audit Log", sub: "Log all admin actions for compliance", val: auditLog, toggle: () => setAuditLog(!auditLog) },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#1E293B]">{item.label}</div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">{item.sub}</div>
              </div>
              <Toggle on={item.val} onChange={item.toggle} />
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex gap-3">
          <button onClick={() => showToast("Audit log viewer coming soon", "info")} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[12px] font-medium text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-all">View Audit Log</button>
          <button onClick={() => showToast("All active sessions have been logged out", "success")} className="px-4 py-2 rounded-lg border border-[#FEE2E2] text-[12px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors">Force All Logouts</button>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button onClick={save} className="px-6 py-2.5 rounded-lg bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] transition-colors">
          Save All Settings
        </button>
      </div>
    </div>
  )
}
