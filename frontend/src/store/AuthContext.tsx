import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { Account, Role } from "../types"
import {
  loginUser,
  registerUser,
  forgotPassword as forgotPasswordRequest,
  resetPassword as resetPasswordRequest,
} from "../api/auth"
import {
  clearAuthSession,
  getAuthUser,
  saveAuthSession,
} from "../api/session"

interface BackendAuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName?: string
  role: "student" | "faculty" | "admin"
  status: "active" | "pending" | "inactive" | "suspended"
}

interface AuthValue {
  currentUser: Account | null

  login: (
    email: string,
    password: string,
    role: Role
  ) => Promise<{ ok: boolean; error?: string }>

  forgotPassword: (
    email: string
  ) => Promise<{ ok: boolean; message?: string; error?: string }>

  resetPassword: (
    email: string,
    otp: string,
    newPassword: string
  ) => Promise<{ ok: boolean; message?: string; error?: string }>

  signup: (
    data: Omit<Account, "id" | "createdAt" | "status">
  ) => Promise<{ ok: boolean; message?: string; error?: string }>

  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

function mapBackendUser(user: BackendAuthUser): Account {
  const name =
    user.fullName?.trim() ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.email

  return {
    id: -1,
    backendId: user.id,
    name,
    role: user.role,
    email: user.email,
    password: "",
    department: user.role === "admin" ? "Computer Engineering" : "Computer Engineering",
    status:
      user.status === "active"
        ? "active"
        : user.status === "pending"
          ? "pending"
          : "inactive",
    avatar: name.charAt(0).toUpperCase(),
    createdAt: "",
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [backendUser, setBackendUser] =
    useState<BackendAuthUser | null>(() =>
      getAuthUser<BackendAuthUser>()
    )

  useEffect(() => {
    // Re-read the persisted authenticated user when the provider mounts.
    setBackendUser(getAuthUser<BackendAuthUser>())
  }, [])

  const currentUser = backendUser ? mapBackendUser(backendUser) : null

  const login: AuthValue["login"] = async (email, password, role) => {
    try {
      const response = await loginUser(email.trim(), password, role)

      saveAuthSession(
        response.access,
        response.refresh,
        response.user
      )

      setBackendUser(response.user)

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to log in.",
      }
    }
  }

  const forgotPassword: AuthValue["forgotPassword"] = async email => {
    try {
      const response = await forgotPasswordRequest(email.trim())

      return {
        ok: true,
        message: response.message,
      }
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to send password reset code.",
      }
    }
  }

  const resetPassword: AuthValue["resetPassword"] = async (
    email,
    otp,
    newPassword
  ) => {
    try {
      const response = await resetPasswordRequest(
        email.trim(),
        otp,
        newPassword
      )

      return {
        ok: true,
        message: response.message,
      }
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to reset password.",
      }
    }
  }

  const signup: AuthValue["signup"] = async data => {
    try {
      const nameParts = data.name.trim().split(/\s+/)
      const firstName = nameParts.shift() ?? ""
      const lastName = nameParts.join(" ")

      if (!firstName || !data.email.trim() || !data.password) {
        return {
          ok: false,
          error: "Name, email, and password are required.",
        }
      }

      if (data.role === "admin") {
        return {
          ok: false,
          error: "Administrator self-registration is not allowed.",
        }
      }

      await registerUser({
        email: data.email.trim(),
        role: data.role,
        firstName,
        lastName,
        phone: data.phone ?? "",
        password: data.password,
        department: data.department,
      })

      return {
        ok: true,
        message: "Registration submitted. Verify your email to continue.",
      }
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to register.",
      }
    }
  }

  const logout = () => {
    clearAuthSession()
    setBackendUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        forgotPassword,
        resetPassword,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return ctx
}