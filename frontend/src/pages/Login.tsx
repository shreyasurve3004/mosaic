import { useState } from "react"
import { useAuth } from "../store/AuthContext"

interface Props {
  onNavigate: (page: string) => void
}

export default function Login({ onNavigate }: Props) {
  const { login, forgotPassword, resetPassword } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<"student" | "faculty" | "admin">("student")
  const [error, setError] = useState("")

  const [forgotMode, setForgotMode] = useState(false)
  const [resetStep, setResetStep] = useState<"email" | "otp">("email")
  const [resetEmail, setResetEmail] = useState("")
  const [resetOtp, setResetOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetMessage, setResetMessage] = useState("")
  const [resetLoading, setResetLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !password) {
      setError("Please enter your email and password.")
      return
    }

    const result = await login(email, password, role)

    if (!result.ok) {
      setError(result.error ?? "Unable to sign in.")
      return
    }

    onNavigate(
      role === "faculty"
        ? "faculty-dashboard"
        : role === "admin"
          ? "admin-dashboard"
          : "dashboard",
    )
  }

  const handleForgotPassword = () => {
    setForgotMode(true)
    setResetStep("email")
    setResetEmail(email)
    setResetOtp("")
    setNewPassword("")
    setConfirmPassword("")
    setError("")
    setResetMessage("")
  }

  const handleBackToLogin = () => {
    setForgotMode(false)
    setResetStep("email")
    setResetOtp("")
    setNewPassword("")
    setConfirmPassword("")
    setError("")
    setResetMessage("")
  }

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResetMessage("")

    const normalizedEmail = resetEmail.trim().toLowerCase()

    if (!normalizedEmail) {
      setError("Please enter your email address.")
      return
    }

    if (!normalizedEmail.endsWith("@vit.edu.in")) {
      setError("Please use your @vit.edu.in institutional email address.")
      return
    }

    setResetLoading(true)

    const result = await forgotPassword(normalizedEmail)

    setResetLoading(false)

    if (!result.ok) {
      setError(result.error ?? "Unable to send password reset code.")
      return
    }

    setResetEmail(normalizedEmail)
    setResetStep("otp")
    setResetMessage(
      result.message ?? "A password reset code has been sent to your email.",
    )
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResetMessage("")

    if (!resetOtp.trim()) {
      setError("Please enter the OTP sent to your email.")
      return
    }

    if (!newPassword) {
      setError("Please enter a new password.")
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setResetLoading(true)

    const result = await resetPassword(resetEmail, resetOtp.trim(), newPassword)

    setResetLoading(false)

    if (!result.ok) {
      setError(result.error ?? "Unable to reset password.")
      return
    }

    setEmail(resetEmail)
    setPassword("")
    setForgotMode(false)
    setResetStep("email")
    setResetOtp("")
    setNewPassword("")
    setConfirmPassword("")
    setResetMessage(
      result.message ?? "Password updated successfully. You can now log in.",
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — illustration panel */}
      <div className="hidden lg:flex flex-col w-[52%] bg-[#2563EB] relative overflow-hidden">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Decorative blobs */}
        <div className="absolute top-[-80px] right-[-80px] w-[360px] h-[360px] rounded-full bg-white opacity-[0.06]" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] rounded-full bg-[#F97316] opacity-[0.15]" />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
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
            <span className="font-bold text-white text-[16px]">Mosaic</span>
          </div>

          {/* Center content */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-10">
              {/* Stylized campus illustration */}
              <div className="w-full max-w-sm mx-auto">
                <svg
                  viewBox="0 0 340 260"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full opacity-90"
                >
                  {/* Building 1 */}
                  <rect
                    x="40"
                    y="100"
                    width="80"
                    height="140"
                    rx="4"
                    fill="white"
                    fillOpacity="0.12"
                  />
                  <rect
                    x="52"
                    y="112"
                    width="16"
                    height="20"
                    rx="2"
                    fill="white"
                    fillOpacity="0.25"
                  />
                  <rect
                    x="76"
                    y="112"
                    width="16"
                    height="20"
                    rx="2"
                    fill="white"
                    fillOpacity="0.25"
                  />
                  <rect
                    x="100"
                    y="112"
                    width="12"
                    height="20"
                    rx="2"
                    fill="white"
                    fillOpacity="0.25"
                  />
                  <rect
                    x="52"
                    y="144"
                    width="16"
                    height="20"
                    rx="2"
                    fill="white"
                    fillOpacity="0.25"
                  />
                  <rect
                    x="76"
                    y="144"
                    width="16"
                    height="20"
                    rx="2"
                    fill="white"
                    fillOpacity="0.25"
                  />
                  <rect
                    x="100"
                    y="144"
                    width="12"
                    height="20"
                    rx="2"
                    fill="white"
                    fillOpacity="0.25"
                  />

                  {/* Door */}
                  <rect
                    x="66"
                    y="216"
                    width="28"
                    height="24"
                    rx="3"
                    fill="white"
                    fillOpacity="0.3"
                  />

                  {/* Flag */}
                  <line
                    x1="80"
                    y1="80"
                    x2="80"
                    y2="100"
                    stroke="white"
                    strokeOpacity="0.4"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="80"
                    y="80"
                    width="20"
                    height="12"
                    rx="1"
                    fill="#F97316"
                    fillOpacity="0.8"
                  />

                  {/* Building 2 — center, taller */}
                  <rect
                    x="140"
                    y="60"
                    width="60"
                    height="180"
                    rx="4"
                    fill="white"
                    fillOpacity="0.18"
                  />
                  <rect
                    x="152"
                    y="76"
                    width="14"
                    height="18"
                    rx="2"
                    fill="white"
                    fillOpacity="0.3"
                  />
                  <rect
                    x="174"
                    y="76"
                    width="14"
                    height="18"
                    rx="2"
                    fill="white"
                    fillOpacity="0.3"
                  />
                  <rect
                    x="152"
                    y="106"
                    width="14"
                    height="18"
                    rx="2"
                    fill="white"
                    fillOpacity="0.3"
                  />
                  <rect
                    x="174"
                    y="106"
                    width="14"
                    height="18"
                    rx="2"
                    fill="white"
                    fillOpacity="0.3"
                  />
                  <rect
                    x="152"
                    y="136"
                    width="14"
                    height="18"
                    rx="2"
                    fill="white"
                    fillOpacity="0.3"
                  />
                  <rect
                    x="174"
                    y="136"
                    width="14"
                    height="18"
                    rx="2"
                    fill="white"
                    fillOpacity="0.3"
                  />
                  <rect
                    x="160"
                    y="216"
                    width="20"
                    height="24"
                    rx="3"
                    fill="white"
                    fillOpacity="0.3"
                  />

                  {/* Arch top */}
                  <path
                    d="M140 60 Q170 30 200 60"
                    fill="white"
                    fillOpacity="0.12"
                  />

                  {/* Building 3 */}
                  <rect
                    x="220"
                    y="110"
                    width="80"
                    height="130"
                    rx="4"
                    fill="white"
                    fillOpacity="0.12"
                  />
                  <rect
                    x="232"
                    y="124"
                    width="16"
                    height="20"
                    rx="2"
                    fill="white"
                    fillOpacity="0.25"
                  />
                  <rect
                    x="256"
                    y="124"
                    width="16"
                    height="20"
                    rx="2"
                    fill="white"
                    fillOpacity="0.25"
                  />
                  <rect
                    x="280"
                    y="124"
                    width="12"
                    height="20"
                    rx="2"
                    fill="white"
                    fillOpacity="0.25"
                  />
                  <rect
                    x="232"
                    y="156"
                    width="16"
                    height="20"
                    rx="2"
                    fill="white"
                    fillOpacity="0.25"
                  />
                  <rect
                    x="256"
                    y="156"
                    width="16"
                    height="20"
                    rx="2"
                    fill="white"
                    fillOpacity="0.25"
                  />
                  <rect
                    x="280"
                    y="156"
                    width="12"
                    height="20"
                    rx="2"
                    fill="white"
                    fillOpacity="0.25"
                  />
                  <rect
                    x="246"
                    y="216"
                    width="28"
                    height="24"
                    rx="3"
                    fill="white"
                    fillOpacity="0.3"
                  />

                  {/* Ground line */}
                  <line
                    x1="20"
                    y1="240"
                    x2="320"
                    y2="240"
                    stroke="white"
                    strokeOpacity="0.2"
                    strokeWidth="1"
                  />

                  {/* Trees */}
                  <circle
                    cx="30"
                    cy="228"
                    r="10"
                    fill="white"
                    fillOpacity="0.12"
                  />
                  <line
                    x1="30"
                    y1="238"
                    x2="30"
                    y2="248"
                    stroke="white"
                    strokeOpacity="0.2"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="310"
                    cy="232"
                    r="8"
                    fill="white"
                    fillOpacity="0.12"
                  />
                  <line
                    x1="310"
                    y1="240"
                    x2="310"
                    y2="248"
                    stroke="white"
                    strokeOpacity="0.2"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
              Your campus, unified.
            </h2>

            <p className="text-[#BFDBFE] text-[15px] leading-relaxed max-w-xs">
              Access academics, assignments, events, and more — from a single
              platform designed for students.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              {[
                "87% average attendance tracked",
                "2,400+ resources uploaded",
                "340+ events this semester",
              ].map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-3 text-[13px] text-[#BFDBFE]"
                >
                  <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                    >
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  </div>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right — login / password reset form */}
      <div className="relative flex-1 flex flex-col items-center px-8 py-12 bg-white">
        <div className="w-full flex-1 flex flex-col items-center justify-center">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center">
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
            <span className="font-bold text-[#1E293B] text-[16px]">Mosaic</span>
          </div>

          <div className="w-full max-w-[380px]">
            {!forgotMode ? (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight mb-1">
                    Welcome back
                  </h1>
                  <p className="text-[14px] text-[#64748B]">
                    Sign in to your Mosaic account
                  </p>
                </div>

                {/* Role selector */}
                <div className="flex gap-1 mb-6 bg-[#F1F5F9] rounded-xl p-1">
                  {(["student", "faculty", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all capitalize ${
                        role === r
                          ? "bg-white text-[#1E293B] shadow-sm"
                          : "text-[#64748B] hover:text-[#1E293B]"
                      }`}
                    >
                      {r === "student"
                        ? "Student"
                        : r === "faculty"
                          ? "Faculty"
                          : "Admin"}
                    </button>
                  ))}
                </div>

                {resetMessage && (
                  <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[12.5px] text-[#15803D] font-medium">
                    {resetMessage}
                  </div>
                )}

                {error && (
                  <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[12.5px] text-[#DC2626] font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                      Email address
                    </label>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="shreya.surve@vit.edu.in"
                      className="w-full h-10 px-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                      Password
                    </label>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 px-3.5 pr-10 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                      >
                        {showPassword ? (
                          <svg
                            width="16"
                            height="16"
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
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            viewBox="0 0 24 24"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <div className="flex justify-end mt-1.5">
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[12px] text-[#2563EB] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-1 h-10 rounded-lg bg-[#2563EB] text-white text-[14px] font-semibold hover:bg-[#1D4ED8] transition-colors shadow-sm"
                  >
                    Sign in
                  </button>
                </form>

                <p className="text-center text-[13px] text-[#94A3B8] mt-6">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => onNavigate("signup")}
                    className="text-[#2563EB] font-medium hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight mb-1">
                    {resetStep === "email"
                      ? "Forgot password?"
                      : "Reset your password"}
                  </h1>

                  <p className="text-[14px] text-[#64748B]">
                    {resetStep === "email"
                      ? "Enter your institutional email to receive a reset code."
                      : "Enter the code sent to your email and choose a new password."}
                  </p>
                </div>

                {resetMessage && (
                  <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[12.5px] text-[#15803D] font-medium">
                    {resetMessage}
                  </div>
                )}

                {error && (
                  <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[12.5px] text-[#DC2626] font-medium">
                    {error}
                  </div>
                )}

                {resetStep === "email" ? (
                  <form
                    onSubmit={handleSendResetCode}
                    className="flex flex-col gap-4"
                  >
                    <div>
                      <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                        Institutional email
                      </label>

                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="shreya.surve@vit.edu.in"
                        autoFocus
                        className="w-full h-10 px-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="mt-1 h-10 rounded-lg bg-[#2563EB] text-white text-[14px] font-semibold hover:bg-[#1D4ED8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {resetLoading ? "Sending code..." : "Send reset code"}
                    </button>

                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      className="text-[13px] text-[#64748B] hover:text-[#2563EB] transition-colors"
                    >
                      Back to login
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={handleResetPassword}
                    className="flex flex-col gap-4"
                  >
                    <div>
                      <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                        Reset code
                      </label>

                      <input
                        type="text"
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        inputMode="numeric"
                        maxLength={6}
                        autoFocus
                        className="w-full h-10 px-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                        New password
                      </label>

                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full h-10 px-3.5 pr-10 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                        />

                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                        >
                          {showNewPassword ? (
                            <svg
                              width="16"
                              height="16"
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
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              viewBox="0 0 24 24"
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                        Confirm new password
                      </label>

                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          className="w-full h-10 px-3.5 pr-10 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                        >
                          {showConfirmPassword ? (
                            <svg
                              width="16"
                              height="16"
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
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              viewBox="0 0 24 24"
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="mt-1 h-10 rounded-lg bg-[#2563EB] text-white text-[14px] font-semibold hover:bg-[#1D4ED8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {resetLoading
                        ? "Resetting password..."
                        : "Reset password"}
                    </button>

                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      className="text-[13px] text-[#64748B] hover:text-[#2563EB] transition-colors"
                    >
                      Back to login
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => onNavigate("landing")}
          className="mt-auto pt-8 text-[12px] text-[#94A3B8] hover:text-[#64748B] transition-colors flex items-center gap-1.5"
        >
          <svg
            width="12"
            height="12"
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
  )
}
