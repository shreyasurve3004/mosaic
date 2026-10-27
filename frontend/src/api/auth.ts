import { apiRequest } from "./client"

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName?: string
  role: "student" | "faculty" | "admin"
  status: "active" | "pending" | "inactive" | "suspended"
}

export interface LoginResponse {
  message: string
  access: string
  refresh: string
  user: AuthUser
}

export async function loginUser(
  email: string,
  password: string,
  role: "student" | "faculty" | "admin"
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/users/login/", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      role,
    }),
  })
}

// ─────────────────────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────────────────────

export interface RegisterResponse {
  message: string
}

export interface RegisterData {
  email: string
  role: "student" | "faculty"

  firstName: string
  lastName: string
  phone: string
  password: string

  // Student fields
  department?: string
  year?: string
  div?: string
  rollNo?: string

  // Faculty fields
  employeeId?: string
  designation?: string
  specialization?: string
}

export async function registerUser(
  data: RegisterData
): Promise<RegisterResponse> {
  const backendRole =
    data.role === "faculty" ? "faculty" : "student"

  return apiRequest<RegisterResponse>("/api/users/register/", {
    method: "POST",
    body: JSON.stringify({
      email: data.email,
      role: backendRole,

      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      password: data.password,

      // Student fields
      department: data.department,
      year: data.year,
      div: data.div,
      rollNo: data.rollNo,

      // Faculty fields
      employeeId: data.employeeId,
      designation: data.designation,
      specialization: data.specialization,
    }),
  })
}

// ─────────────────────────────────────────────────────────────
// Registration OTP verification
// ─────────────────────────────────────────────────────────────

export interface VerifyOtpResponse {
  message: string
}

export async function verifyRegistrationOtp(
  email: string,
  otp: string
): Promise<VerifyOtpResponse> {
  return apiRequest<VerifyOtpResponse>("/api/users/verify-otp/", {
    method: "POST",
    body: JSON.stringify({
      email,
      otp,
      type: "verification",
    }),
  })
}

// ─────────────────────────────────────────────────────────────
// Forgot password
// ─────────────────────────────────────────────────────────────

export interface ForgotPasswordResponse {
  message: string
}

export async function forgotPassword(
  email: string
): Promise<ForgotPasswordResponse> {
  return apiRequest<ForgotPasswordResponse>(
    "/api/users/forgot-password/",
    {
      method: "POST",
      body: JSON.stringify({
        email,
      }),
    }
  )
}

// ─────────────────────────────────────────────────────────────
// Reset password
// ─────────────────────────────────────────────────────────────

export interface ResetPasswordResponse {
  message: string
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string
): Promise<ResetPasswordResponse> {
  return apiRequest<ResetPasswordResponse>(
    "/api/users/reset-password/",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        otp,
        newPassword,
      }),
    }
  )
}