const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function fetchFilePreview(
  fileType: "resource" | "assignment" | "submission" | "pending" | "book",
  fileId: number,
  token: string
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/api/files/${fileType}/${fileId}/preview/`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      error.detail || error.message || "Unable to preview this file."
    )
  }

  const blob = await response.blob()

  if (blob.type !== "application/pdf") {
    throw new Error("The server did not return a valid PDF preview.")
  }

  return blob
}
