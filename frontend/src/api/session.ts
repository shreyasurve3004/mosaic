const ACCESS_TOKEN_KEY = "mosaic:accessToken"
const REFRESH_TOKEN_KEY = "mosaic:refreshToken"
const USER_KEY = "mosaic:authUser"

export function saveAuthSession(
  accessToken: string,
  refreshToken: string,
  user: unknown
) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getAuthUser<T>(): T | null {
  const raw = localStorage.getItem(USER_KEY)

  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}