const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface ApiOptions extends RequestInit {
  token?: string
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { token, headers, ...fetchOptions } = options

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data.message || data.detail || "Something went wrong with the request."
    )
  }

  return data as T
}