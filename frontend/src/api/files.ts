
import { getAccessToken } from "./session"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

async function fetchFile(endpoint: string): Promise<Response> {
  const token = getAccessToken()

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))

    throw new Error(
      data.detail ||
        data.error ||
        data.message ||
        "Unable to retrieve this file."
    )
  }

  return response
}

function getResponseFilename(response: Response, fallback: string) {
  const disposition = response.headers.get("Content-Disposition") || ""

  // Handles Content-Disposition: filename*=UTF-8''...
  const encodedName = disposition.match(
    /filename\*=UTF-8''([^;]+)/i
  )?.[1]

  if (encodedName) {
    try {
      return decodeURIComponent(encodedName)
    } catch {
      return encodedName
    }
  }

  // Handles Content-Disposition: filename="report.pdf"
  const quotedName = disposition.match(
    /filename="([^"]*)"/i
  )?.[1]

  const plainName = disposition.match(
    /filename=([^;]+)/i
  )?.[1]?.trim()

  return (
    quotedName ||
    plainName?.replace(/^["']|["']$/g, "") ||
    fallback
  )
}

function createObjectUrl(blob: Blob) {
  return URL.createObjectURL(blob)
}

export async function previewFile(
  endpoint: string,
  filename: string
) {
  const previewWindow = window.open("about:blank", "_blank")

  if (!previewWindow) {
    throw new Error("Please allow pop-ups to preview files.")
  }

  previewWindow.document.title = "Loading file..."
  previewWindow.document.body.innerHTML =
    '<p style="font:16px sans-serif;margin:2rem;color:#475569">Loading preview...</p>'

  let objectUrl: string | null = null

  try {
    const response = await fetchFile(endpoint)
    const blob = await response.blob()

    if (!blob.size) {
      throw new Error("The server returned an empty file.")
    }

    const extension = filename.split(".").pop()?.toLowerCase() ?? ""

    const officeExtensions = [
      "doc",
      "docx",
      "odt",
      "rtf",
      "xls",
      "xlsx",
      "ods",
      "ppt",
      "pptx",
      "odp",
    ]

    const previewableExtensions = [
      "pdf",
      "png",
      "jpg",
      "jpeg",
      "gif",
      "webp",
      "svg",
      ...officeExtensions,
    ]

    if (!previewableExtensions.includes(extension)) {
      throw new Error(
        "Preview is supported for PDF, image, and Office documents."
      )
    }

    const contentType = (
      response.headers.get("Content-Type") ?? ""
    )
      .split(";")[0]
      .trim()
      .toLowerCase()

    // Office documents must be converted to PDF by the backend.
    if (
      officeExtensions.includes(extension) &&
      contentType !== "application/pdf"
    ) {
      throw new Error(
        "The server did not return a converted PDF. Check LibreOffice and the file preview endpoint."
      )
    }

    if (
      extension === "pdf" &&
      contentType &&
      contentType !== "application/pdf"
    ) {
      throw new Error(
        "The server returned an unexpected file type instead of a PDF."
      )
    }

    objectUrl = createObjectUrl(blob)
    previewWindow.location.replace(objectUrl)

    const urlToRevoke = objectUrl

    const revokeWhenClosed = window.setInterval(() => {
      if (previewWindow.closed) {
        URL.revokeObjectURL(urlToRevoke)
        window.clearInterval(revokeWhenClosed)
      }
    }, 1000)
  } catch (error) {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }

    if (!previewWindow.closed) {
      previewWindow.document.title = "Unable to preview file"
      previewWindow.document.body.textContent =
        error instanceof Error
          ? error.message
          : "Unable to retrieve this file."
    }

    throw error
  }
}

export async function downloadFile(
  endpoint: string,
  fallbackName: string
) {
  const response = await fetchFile(endpoint)
  const objectUrl = createObjectUrl(await response.blob())

  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = getResponseFilename(response, fallbackName)

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}
