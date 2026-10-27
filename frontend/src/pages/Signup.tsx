import { useState } from "react"
import type { Department, AcademicYear, Division } from "../types"
import { registerUser, verifyRegistrationOtp } from "../api/auth"

interface Props {
  onNavigate: (page: string) => void
}

type Role = "student" | "faculty" | "admin"

interface BaseFields {
  firstName: string
  lastName: string
  email: string
  password: string
  mobile: string
}

interface StudentFields {
  department: Department | ""
  year: AcademicYear | ""
  division: Division | ""
  rollNo: string
}

interface FacultyFields {
  employeeId: string
  department: Department | ""
  designation: string
  specialization: string
}

interface AdminFields {
  adminStaffId: string
}

interface Errors {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  mobile?: string
  rollNo?: string
  employeeId?: string
  adminStaffId?: string
  department?: string
  year?: string
  division?: string
  designation?: string
  specialization?: string
  general?: string
}

function getStrength(
  pw: string
): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "" }
  if (pw.length < 6) return { level: 1, label: "Weak", color: "#EF4444" }

  const hasUpper = /[A-Z]/.test(pw)
  const hasNum = /[0-9]/.test(pw)
  const hasSymbol = /[^A-Za-z0-9]/.test(pw)

  const score = [
    pw.length >= 8,
    hasUpper,
    hasNum,
    hasSymbol,
  ].filter(Boolean).length

  if (score <= 2) return { level: 1, label: "Weak", color: "#EF4444" }
  if (score === 3) return { level: 2, label: "Medium", color: "#F97316" }

  return { level: 3, label: "Strong", color: "#10B981" }
}

function validate(
  base: BaseFields,
  role: Role,
  student: StudentFields,
  faculty: FacultyFields,
  admin: AdminFields
): Errors {
  const e: Errors = {}

  if (!base.firstName.trim()) {
    e.firstName = "First name is required."
  } else if (!/^[A-Za-z\s]+$/.test(base.firstName)) {
    e.firstName = "Alphabets only."
  } else if (base.firstName.trim().length < 3) {
    e.firstName = "First name must be at least 3 characters."
  }

  if (!base.lastName.trim()) {
    e.lastName = "Last name is required."
  } else if (base.lastName.trim().length < 3) {
    e.lastName = "Last name must be at least 3 characters."
  }

  if (!base.email.trim()) {
    e.email = "Email is required."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(base.email)) {
    e.email = "Enter a valid email (name@domain.com)."
  }

  if (!base.password) {
    e.password = "Password is required."
  } else if (base.password.length < 6) {
    e.password = "At least 6 characters."
  }

  if (!base.mobile.trim()) {
    e.mobile = "Mobile number is required."
  } else if (!/^\d{10}$/.test(base.mobile.trim())) {
    e.mobile = "Must be exactly 10 digits."
  }

  if (role === "student") {
    if (!student.department) e.department = "Select a department."
    if (!student.year) e.year = "Select your year."
    if (!student.division) e.division = "Select a division."
    if (!student.rollNo.trim()) e.rollNo = "Roll number is required."
  }

  if (role === "faculty") {
    if (!faculty.employeeId.trim()) {
      e.employeeId = "Employee ID is required."
    }

    if (!faculty.department) {
      e.department = "Select a department."
    }

    if (!faculty.designation) {
      e.designation = "Select a designation."
    }

    if (!faculty.specialization.trim()) {
      e.specialization = "Specialization is required."
    }
  }

  if (role === "admin") {
    e.general = "Admin accounts can only be created by an existing administrator."
  }

  return e
}

// ─── Icon atoms ────────────────────────────────────────────────────────────────

const IconUser = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="#93C5FD"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IconMail = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="#93C5FD"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 7l10 7 10-7" />
  </svg>
)

const IconLock = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="#93C5FD"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
)

const IconPhone = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="#93C5FD"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.82a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
)

const IconBadge = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="#93C5FD"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 12h8M8 8h8M8 16h5" />
  </svg>
)

const IconEye = ({ open }: { open: boolean }) =>
  open ? (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

const IconChevron = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="#9CA3AF"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
)

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-[#374151] uppercase tracking-widest">
        {label}
      </label>

      {children}

      {error && (
        <span className="text-[11px] text-[#EF4444] flex items-center gap-1 font-medium">
          <svg
            width="10"
            height="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </span>
      )}
    </div>
  )
}

// ─── Input ─────────────────────────────────────────────────────────────────────

function Input({
  icon,
  error,
  right,
  ...rest
}: {
  icon?: React.ReactNode
  error?: boolean
  right?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          {icon}
        </span>
      )}

      <input
        {...rest}
        className={`w-full h-14 ${
          icon ? "pl-11" : "pl-4"
        } ${
          right ? "pr-12" : "pr-4"
        } rounded-xl border text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none transition-all duration-200 bg-[#F9FAFB] ${
          error
            ? "border-[#FCA5A5] focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/10"
            : "border-[#E5E7EB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
        } shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]`}
      />

      {right && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2">
          {right}
        </span>
      )}
    </div>
  )
}

// ─── Select ────────────────────────────────────────────────────────────────────

function Select({
  icon,
  error,
  children,
  ...rest
}: {
  icon?: React.ReactNode
  error?: boolean
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          {icon}
        </span>
      )}

      <select
        {...rest}
        className={`w-full h-14 ${
          icon ? "pl-11" : "pl-4"
        } pr-10 rounded-xl border text-[14px] text-[#111827] focus:outline-none transition-all duration-200 bg-[#F9FAFB] appearance-none cursor-pointer ${
          error
            ? "border-[#FCA5A5] focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/10"
            : "border-[#E5E7EB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
        } shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]`}
      >
        {children}
      </select>

      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <IconChevron />
      </span>
    </div>
  )
}

// ─── Password strength ─────────────────────────────────────────────────────────

function StrengthMeter({ password }: { password: string }) {
  const { level, label, color } = getStrength(password)

  if (!password) return null

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{
              backgroundColor: i <= level ? color : "#E5E7EB",
              background:
                i <= level && level === 3
                  ? "linear-gradient(90deg, #10B981, #059669)"
                  : i <= level && level === 2
                  ? "linear-gradient(90deg, #F97316, #EF4444)"
                  : i <= level
                  ? color
                  : "#E5E7EB",
            }}
          />
        ))}
      </div>

      {label && (
        <span className="text-[11px] font-semibold" style={{ color }}>
          {label} password
        </span>
      )}
    </div>
  )
}

// ─── Departments shared ────────────────────────────────────────────────────────

const DEPARTMENTS: Department[] = [
  "Information Technology",
  "Computer Engineering",
  "Electronics and Telecommunication",
  "Electronics and Computer Science",
  "Biomedical",
]

const ACADEMIC_YEARS: AcademicYear[] = [
  "First Year",
  "Second Year",
  "Third Year",
  "Fourth Year",
]

const DIVISIONS: Division[] = ["A", "B", "C"]

export default function Signup({ onNavigate }: Props) {
  const [role, setRole] = useState<Role>("student")
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState("")
  const [registrationEmail, setRegistrationEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Errors>({})

  const [base, setBase] = useState<BaseFields>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    mobile: "",
  })

  const [student, setStudent] = useState<StudentFields>({
    department: "Information Technology",
    year: "First Year",
    division: "A",
    rollNo: "",
  })

  const [faculty, setFaculty] = useState<FacultyFields>({
    employeeId: "",
    department: "Information Technology",
    designation: "Assistant Professor",
    specialization: "",
  })

  const [admin, setAdmin] = useState<AdminFields>({
    adminStaffId: "",
  })

  const setB =
    (k: keyof BaseFields) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBase(p => ({ ...p, [k]: e.target.value }))

      if (errors[k]) {
        setErrors(p => {
          const n = { ...p }
          delete n[k]
          return n
        })
      }
    }

  const setS =
    (k: keyof StudentFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setStudent(p => ({
        ...p,
        [k]: e.target.value as StudentFields[typeof k],
      }))

      if (errors[k as keyof Errors]) {
        setErrors(p => {
          const n = { ...p }
          delete n[k as keyof Errors]
          return n
        })
      }
    }

  const setF =
    (k: keyof FacultyFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFaculty(p => ({
        ...p,
        [k]: e.target.value as FacultyFields[typeof k],
      }))

      if (errors[k as keyof Errors]) {
        setErrors(p => {
          const n = { ...p }
          delete n[k as keyof Errors]
          return n
        })
      }
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errs = validate(base, role, student, faculty, admin)

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    if (role === "admin") {
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      await registerUser({
        email: base.email.trim(),
        role,
        firstName: base.firstName.trim(),
        lastName: base.lastName.trim(),
        phone: base.mobile.trim(),
        password: base.password,

        ...(role === "student"
          ? {
              department: student.department,
              year: student.year,
              div: student.division,
              rollNo: student.rollNo.trim(),
            }
          : {
              department: faculty.department,
              employeeId: faculty.employeeId.trim(),
              designation: faculty.designation,
              specialization: faculty.specialization.trim(),
            }),
      })

      setRegistrationEmail(base.email.trim().toLowerCase())
      setShowOtp(true)
    } catch (error) {
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Unable to complete registration.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otp.trim()) {
      setOtpError("Enter the OTP sent to your email.")
      return
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError("OTP must be exactly 6 digits.")
      return
    }

    setSubmitting(true)
    setOtpError("")

    try {
      await verifyRegistrationOtp(registrationEmail, otp.trim())

      setShowOtp(false)
      setSubmitted(true)
    } catch (error) {
      setOtpError(
        error instanceof Error
          ? error.message
          : "Invalid or expired OTP."
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ── OTP screen ──────────────────────────────────────────────────────────────

  if (showOtp) {
    return (
      <div className="min-h-screen flex">
        <div
          className="hidden lg:flex flex-col flex-shrink-0 w-[42%] relative overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, #1E3A8A 0%, #2563EB 45%, #7C3AED 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, white 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          <div className="absolute top-[-100px] right-[-80px] w-[380px] h-[380px] rounded-full bg-white opacity-[0.05]" />
          <div className="absolute bottom-[-60px] left-[-40px] w-[280px] h-[280px] rounded-full bg-[#F97316] opacity-[0.12]" />

          <div className="relative z-10 flex flex-col h-full p-12 justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>

              <span className="font-bold text-white text-[17px] tracking-tight">
                Mosaic
              </span>
            </div>

            <div className="flex flex-col items-center text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <svg
                  width="36"
                  height="36"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 4h16v16H4z" opacity=".25" />
                  <path d="M7 12l3 3 7-7" />
                </svg>
              </div>

              <h2 className="text-[28px] font-bold text-white tracking-tight mb-3">
                Verify your email
              </h2>

              <p className="text-[15px] text-blue-200 leading-relaxed max-w-xs">
                We sent a 6-digit verification code to your institutional
                email address.
              </p>
            </div>

            <div className="text-[11px] text-white/30 text-center">
              Mosaic Smart Campus Platform · 2026
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center bg-white px-10">
          <div className="max-w-sm w-full">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{
                background:
                  "linear-gradient(135deg, #DBEAFE, #BFDBFE)",
              }}
            >
              <svg
                width="28"
                height="28"
                fill="none"
                stroke="#2563EB"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
            </div>

            <h2 className="text-[26px] font-bold text-[#111827] mb-2 tracking-tight text-center">
              Check your email
            </h2>

            <p className="text-[14px] text-[#6B7280] leading-relaxed mb-7 text-center">
              Enter the verification code sent to
              <br />
              <span className="font-semibold text-[#111827]">
                {registrationEmail}
              </span>
            </p>

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <Field label="Verification OTP" error={otpError}>
                <Input
                  icon={<IconBadge />}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, "")
                    setOtp(value)
                    setOtpError("")
                  }}
                  error={!!otpError}
                />
              </Field>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl text-white text-[14px] font-semibold transition-all duration-200 disabled:opacity-60"
                style={{
                  background:
                    "linear-gradient(135deg, #3B82F6, #2563EB)",
                  boxShadow:
                    "0 4px 16px rgba(37,99,235,0.3)",
                }}
              >
                {submitting ? "Verifying..." : "Verify Email"}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setShowOtp(false)
                  setOtp("")
                  setOtpError("")
                }}
                className="text-[13px] text-[#6B7280] hover:text-[#2563EB] transition-colors"
              >
                Back to registration
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen flex">
        <div
          className="hidden lg:flex flex-col flex-shrink-0 w-[42%] relative overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, #1E3A8A 0%, #2563EB 45%, #7C3AED 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, white 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          <div className="absolute top-[-100px] right-[-80px] w-[380px] h-[380px] rounded-full bg-white opacity-[0.05]" />
          <div className="absolute bottom-[-60px] left-[-40px] w-[280px] h-[280px] rounded-full bg-[#F97316] opacity-[0.12]" />

          <div className="relative z-10 flex flex-col h-full p-12 justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>

              <span className="font-bold text-white text-[17px] tracking-tight">
                Mosaic
              </span>
            </div>

            <div className="flex flex-col items-center text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <svg
                  width="36"
                  height="36"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              <h2 className="text-[28px] font-bold text-white tracking-tight mb-3">
                Registration submitted!
              </h2>

              <p className="text-[15px] text-blue-200 leading-relaxed max-w-xs">
                Your Mosaic account is now awaiting administrator approval.
              </p>
            </div>

            <div className="text-[11px] text-white/30 text-center">
              Mosaic Smart Campus Platform · 2026
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center bg-white px-10">
          <div className="max-w-sm w-full text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{
                background:
                  "linear-gradient(135deg, #D1FAE5, #A7F3D0)",
              }}
            >
              <svg
                width="28"
                height="28"
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>

            <h2 className="text-[26px] font-bold text-[#111827] mb-2 tracking-tight">
              Email verified!
            </h2>

            <p className="text-[14px] text-[#6B7280] leading-relaxed mb-8">
              Your registration has been verified successfully. An
              administrator must activate your account before you can sign in.
            </p>

            <button
              onClick={() => onNavigate("login")}
              className="w-full h-12 rounded-xl text-white text-[14px] font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
              style={{
                background:
                  "linear-gradient(135deg, #3B82F6, #2563EB)",
                boxShadow:
                  "0 4px 16px rgba(37,99,235,0.3)",
              }}
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main landscape layout ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* ══ LEFT PANEL — branding ══════════════════════════════════════════════ */}

      <div
        className="hidden lg:flex flex-col flex-shrink-0 w-[42%] relative overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #1E3A8A 0%, #2563EB 45%, #7C3AED 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, white 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="absolute top-[-100px] right-[-80px] w-[380px] h-[380px] rounded-full bg-white opacity-[0.05]" />

        <div className="absolute bottom-[-60px] left-[-40px] w-[280px] h-[280px] rounded-full bg-[#F97316] opacity-[0.12]" />

        <div
          className="absolute top-[38%] left-[20%] w-[220px] h-[220px] rounded-full opacity-[0.06]"
          style={{
            background:
              "radial-gradient(circle, #A5F3FC, transparent)",
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-12">

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>

            <span className="font-bold text-white text-[17px] tracking-tight">
              Mosaic
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center">

            <svg
              viewBox="0 0 320 220"
              fill="none"
              className="w-full max-w-xs mx-auto mb-8 opacity-90"
            >
              <rect x="20" y="90" width="70" height="120" rx="4" fill="white" fillOpacity="0.10" />
              <rect x="30" y="102" width="16" height="20" rx="2" fill="white" fillOpacity="0.22" />
              <rect x="54" y="102" width="16" height="20" rx="2" fill="white" fillOpacity="0.22" />
              <rect x="30" y="134" width="16" height="20" rx="2" fill="white" fillOpacity="0.22" />
              <rect x="54" y="134" width="16" height="20" rx="2" fill="white" fillOpacity="0.22" />
              <rect x="40" y="176" width="26" height="34" rx="3" fill="white" fillOpacity="0.26" />

              <line x1="55" y1="72" x2="55" y2="92" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
              <rect x="55" y="72" width="18" height="11" rx="1" fill="#F97316" fillOpacity="0.85" />

              <rect x="120" y="48" width="80" height="162" rx="4" fill="white" fillOpacity="0.16" />
              <path d="M120 48 Q160 18 200 48" fill="white" fillOpacity="0.10" />
              <rect x="132" y="66" width="18" height="22" rx="2" fill="white" fillOpacity="0.28" />
              <rect x="162" y="66" width="18" height="22" rx="2" fill="white" fillOpacity="0.28" />
              <rect x="132" y="100" width="18" height="22" rx="2" fill="white" fillOpacity="0.28" />
              <rect x="162" y="100" width="18" height="22" rx="2" fill="white" fillOpacity="0.28" />
              <rect x="132" y="134" width="18" height="22" rx="2" fill="white" fillOpacity="0.28" />
              <rect x="162" y="134" width="18" height="22" rx="2" fill="white" fillOpacity="0.28" />
              <rect x="148" y="176" width="24" height="34" rx="3" fill="white" fillOpacity="0.30" />

              <rect x="230" y="100" width="70" height="110" rx="4" fill="white" fillOpacity="0.10" />
              <rect x="240" y="114" width="16" height="20" rx="2" fill="white" fillOpacity="0.22" />
              <rect x="266" y="114" width="16" height="20" rx="2" fill="white" fillOpacity="0.22" />
              <rect x="240" y="146" width="16" height="20" rx="2" fill="white" fillOpacity="0.22" />
              <rect x="266" y="146" width="16" height="20" rx="2" fill="white" fillOpacity="0.22" />
              <rect x="248" y="176" width="26" height="34" rx="3" fill="white" fillOpacity="0.26" />

              <line x1="0" y1="210" x2="320" y2="210" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
              <circle cx="14" cy="200" r="10" fill="white" fillOpacity="0.10" />
              <circle cx="305" cy="203" r="8" fill="white" fillOpacity="0.10" />
              <circle cx="108" cy="205" r="6" fill="white" fillOpacity="0.10" />
              <circle cx="212" cy="205" r="6" fill="white" fillOpacity="0.10" />
            </svg>

            <h2 className="text-[30px] font-bold text-white tracking-tight leading-tight mb-4">
              Join your campus
              <br />
              community.
            </h2>

            <p className="text-[14px] text-blue-200 leading-relaxed max-w-[280px] mb-8">
              One unified platform for academics, assignments, events,
              notices, and every campus service — built for everyone on
              campus.
            </p>

            <div className="flex flex-col gap-3">
              {[
                {
                  icon: "📊",
                  text: "Real-time attendance & grade tracking",
                },
                {
                  icon: "📌",
                  text: "Kanban assignment board for students",
                },
                {
                  icon: "🎓",
                  text: "Faculty workbench with course management",
                },
                {
                  icon: "🔔",
                  text: "Campus-wide notices & event discovery",
                },
              ].map(item => (
                <div
                  key={item.text}
                  className="flex items-center gap-3 text-[13px] text-blue-100"
                >
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-[14px]">
                    {item.icon}
                  </div>

                  {item.text}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-white/30">
            Mosaic Smart Campus Platform · 2026
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL — form ════════════════════════════════════════════════ */}

      <div
        className="flex-1 flex flex-col overflow-y-auto relative"
        style={{
          background:
            "linear-gradient(150deg, #F0F9FF 0%, #F9FAFB 40%, #F5F3FF 80%, #FFF7ED 100%)",
        }}
      >

        <div
          className="absolute top-[-60px] right-[-40px] w-[340px] h-[340px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, #BFDBFE, transparent 70%)",
            filter: "blur(60px)",
            opacity: 0.5,
          }}
        />

        <div
          className="absolute bottom-[-40px] left-[-20px] w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, #E9D5FF, transparent 70%)",
            filter: "blur(50px)",
            opacity: 0.4,
          }}
        />

        <div className="lg:hidden flex items-center gap-2.5 p-6">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #3B82F6, #2563EB)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>

          <span className="font-bold text-[#111827] text-[16px]">
            Mosaic
          </span>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-8 py-10">
          <div className="w-full max-w-[520px]">

            <div
              className="rounded-3xl p-10"
              style={{
                background: "rgba(255,255,255,0.78)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                border: "1px solid rgba(255,255,255,0.65)",
                boxShadow:
                  "0 32px 64px rgba(37,99,235,0.06), 0 8px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)",
              }}
            >

              <div className="mb-7">
                <h1 className="text-[26px] font-bold text-[#111827] tracking-tight leading-tight mb-1.5">
                  Create your institutional account
                </h1>

                <p className="text-[14px] text-[#6B7280]">
                  Select your role to customise your workspace.
                </p>
              </div>

              {/* Role switcher */}

              <div
                className="flex p-1 mb-7 rounded-2xl"
                style={{
                  background: "#F3F4F6",
                  boxShadow:
                    "inset 0 1px 3px rgba(0,0,0,0.07)",
                }}
              >
                {(["student", "faculty", "admin"] as Role[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r)
                      setErrors({})
                    }}
                    className="flex-1 py-2.5 text-[12px] font-semibold capitalize transition-all duration-200"
                    style={
                      role === r
                        ? {
                            background: "#FFFFFF",
                            color: "#2563EB",
                            boxShadow:
                              "0 2px 8px rgba(0,0,0,0.10)",
                            borderRadius: "10px",
                          }
                        : {
                            color: "#6B7280",
                          }
                    }
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>

              {errors.general && (
                <div className="mb-5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#B91C1C]">
                  {errors.general}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                noValidate
                className="flex flex-col gap-4"
              >

                {/* Name row */}

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="First Name"
                    error={errors.firstName}
                  >
                    <Input
                      icon={<IconUser />}
                      type="text"
                      placeholder="Shreya"
                      value={base.firstName}
                      onChange={setB("firstName")}
                      error={!!errors.firstName}
                    />
                  </Field>

                  <Field
                    label="Last Name"
                    error={errors.lastName}
                  >
                    <Input
                      icon={<IconUser />}
                      type="text"
                      placeholder="Surve"
                      value={base.lastName}
                      onChange={setB("lastName")}
                      error={!!errors.lastName}
                    />
                  </Field>
                </div>

                {/* Email + Mobile row */}

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Email Address"
                    error={errors.email}
                  >
                    <Input
                      icon={<IconMail />}
                      type="email"
                      placeholder="shreya.surve@vit.edu.in"
                      value={base.email}
                      onChange={setB("email")}
                      error={!!errors.email}
                    />
                  </Field>

                  <Field
                    label="Mobile Number"
                    error={errors.mobile}
                  >
                    <Input
                      icon={<IconPhone />}
                      type="tel"
                      placeholder="10-digit number"
                      value={base.mobile}
                      onChange={setB("mobile")}
                      maxLength={10}
                      error={!!errors.mobile}
                    />
                  </Field>
                </div>

                {/* Password */}

                <Field
                  label="Password"
                  error={errors.password}
                >
                  <Input
                    icon={<IconLock />}
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={base.password}
                    onChange={setB("password")}
                    error={!!errors.password}
                    right={
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(p => !p)
                        }
                        className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                      >
                        <IconEye open={showPassword} />
                      </button>
                    }
                  />

                  <StrengthMeter password={base.password} />
                </Field>

                {/* Student extras */}

                {role === "student" && (
                  <>
                    <div className="grid grid-cols-3 gap-3">

                      <Field
                        label="Department"
                        error={errors.department}
                      >
                        <Select
                          icon={
                            <svg
                              width="15"
                              height="15"
                              fill="none"
                              stroke="#93C5FD"
                              strokeWidth="1.8"
                              viewBox="0 0 24 24"
                            >
                              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                          }
                          value={student.department}
                          onChange={setS("department")}
                          error={!!errors.department}
                        >

                          {DEPARTMENTS.map(d => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field
                        label="Year"
                        error={errors.year}
                      >
                        <Select
                          icon={
                            <svg
                              width="15"
                              height="15"
                              fill="none"
                              stroke="#93C5FD"
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
                              <path d="M16 2v4M8 2v4M3 10h18" />
                            </svg>
                          }
                          value={student.year}
                          onChange={setS("year")}
                          error={!!errors.year}
                        >
                        

                          {ACADEMIC_YEARS.map(y => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field
                        label="Division"
                        error={errors.division}
                      >
                        <Select
                          icon={
                            <svg
                              width="15"
                              height="15"
                              fill="none"
                              stroke="#93C5FD"
                              strokeWidth="1.8"
                              viewBox="0 0 24 24"
                            >
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                              <circle
                                cx="9"
                                cy="7"
                                r="4"
                              />
                            </svg>
                          }
                          value={student.division}
                          onChange={setS("division")}
                          error={!!errors.division}
                        >
                  

                          {DIVISIONS.map(div => (
                            <option key={div} value={div}>
                              {div}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <Field
                      label="Roll No."
                      error={errors.rollNo}
                    >
                      <Input
                        icon={<IconBadge />}
                        type="text"
                        placeholder="e.g. IT21047"
                        value={student.rollNo}
                        onChange={e => {
                          setStudent(p => ({
                            ...p,
                            rollNo: e.target.value,
                          }))

                          if (errors.rollNo) {
                            setErrors(p => {
                              const n = { ...p }
                              delete n.rollNo
                              return n
                            })
                          }
                        }}
                        error={!!errors.rollNo}
                      />
                    </Field>
                  </>
                )}

                {/* Faculty extras */}

                {role === "faculty" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">

                      <Field
                        label="Employee / Faculty ID"
                        error={errors.employeeId}
                      >
                        <Input
                          icon={<IconBadge />}
                          type="text"
                          placeholder="FAC-2024-087"
                          value={faculty.employeeId}
                          onChange={e => {
                            setFaculty(p => ({
                              ...p,
                              employeeId: e.target.value,
                            }))

                            if (errors.employeeId) {
                              setErrors(p => {
                                const n = { ...p }
                                delete n.employeeId
                                return n
                              })
                            }
                          }}
                          error={!!errors.employeeId}
                        />
                      </Field>

                      <Field
                        label="Department"
                        error={errors.department}
                      >
                        <Select
                          icon={
                            <svg
                              width="15"
                              height="15"
                              fill="none"
                              stroke="#93C5FD"
                              strokeWidth="1.8"
                              viewBox="0 0 24 24"
                            >
                              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                          }
                          value={faculty.department}
                          onChange={setF("department")}
                          error={!!errors.department}
                        >
                         

                          {DEPARTMENTS.map(d => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">

                      <Field
                        label="Designation"
                        error={errors.designation}
                      >
                        <Select
                          icon={
                            <svg
                              width="15"
                              height="15"
                              fill="none"
                              stroke="#93C5FD"
                              strokeWidth="1.8"
                              viewBox="0 0 24 24"
                            >
                              <circle cx="12" cy="8" r="4" />
                              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                            </svg>
                          }
                          value={faculty.designation}
                          onChange={setF("designation")}
                          error={!!errors.designation}
                        >
                          <option value="Assistant Professor">
                            Assistant Professor
                          </option>

                          <option value="Associate Professor">
                            Associate Professor
                          </option>

                          <option value="Professor">
                            Professor
                          </option>

                          <option value="Head of Department">
                            Head of Department
                          </option>

                          <option value="Visiting Faculty">
                            Visiting Faculty
                          </option>
                        </Select>
                      </Field>

                      <Field
                        label="Specialization"
                        error={errors.specialization}
                      >
                        <Input
                          icon={
                            <svg
                              width="15"
                              height="15"
                              fill="none"
                              stroke="#93C5FD"
                              strokeWidth="1.8"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                cx="11"
                                cy="11"
                                r="8"
                              />
                              <path d="m21 21-4.35-4.35" />
                            </svg>
                          }
                          type="text"
                          placeholder="e.g. Machine Learning"
                          value={faculty.specialization}
                          onChange={e => {
                            setFaculty(p => ({
                              ...p,
                              specialization: e.target.value,
                            }))

                            if (errors.specialization) {
                              setErrors(p => {
                                const n = { ...p }
                                delete n.specialization
                                return n
                              })
                            }
                          }}
                          error={!!errors.specialization}
                        />
                      </Field>
                    </div>
                  </>
                )}

                {/* Admin */}

                {role === "admin" && (
                  <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg
                          width="18"
                          height="18"
                          fill="none"
                          stroke="#D97706"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                          />
                          <path d="M12 8v4M12 16h.01" />
                        </svg>
                      </div>

                      <div>
                        <p className="text-[13px] font-semibold text-[#92400E]">
                          Administrator accounts are created by an existing admin.
                        </p>

                        <p className="text-[12px] text-[#A16207] mt-1 leading-relaxed">
                          Self-registration is not available for Admin accounts.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit */}

                <button
                  type="submit"
                  disabled={submitting || role === "admin"}
                  className="w-full h-14 rounded-xl text-white text-[15px] font-bold tracking-tight transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] mt-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    background:
                      "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                    boxShadow:
                      "0 4px 16px rgba(37,99,235,0.35)",
                  }}
                  onMouseEnter={e => {
                    if (!submitting && role !== "admin") {
                      e.currentTarget.style.boxShadow =
                        "0 8px 28px rgba(37,99,235,0.52)"
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow =
                      "0 4px 16px rgba(37,99,235,0.35)"
                  }}
                >
                  {submitting
                    ? "Processing..."
                    : role === "admin"
                    ? "Admin Registration Unavailable"
                    : "Create Account"}
                </button>
              </form>

              <p className="text-center text-[13px] text-[#6B7280] mt-6">
                Already part of the Mosaic community?{" "}
                <button
                  type="button"
                  onClick={() => onNavigate("login")}
                  className="font-bold text-[#2563EB] hover:underline"
                >
                  Sign In.
                </button>
              </p>
            </div>

            <button
              onClick={() => onNavigate("landing")}
              className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors mx-auto mt-5"
            >
              <svg
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M19 12H5M5 12l7 7M5 12l7-7" />
              </svg>
              Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}