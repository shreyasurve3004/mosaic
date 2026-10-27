import { useEffect, useState } from "react"
import { fetchFilePreview } from "../../api/filePreview"

type FileType =
  | "resource"
  | "assignment"
  | "submission"
  | "pending"
  | "book"

interface FilePreviewProps {
  fileType: FileType
  fileId: number
  token: string
  fileName: string
  onClose: () => void
}

export default function FilePreview({
  fileType,
  fileId,
  token,
  fileName,
  onClose,
}: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null

    setLoading(true)
    setError("")
    setPreviewUrl(null)

    fetchFilePreview(fileType, fileId, token)
      .then((blob) => {
        if (!active) return

        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load the preview."
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileType, fileId, token])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${fileName}`}
    >
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
          <h2 className="truncate text-sm font-semibold text-slate-800">
            {fileName}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Close
          </button>
        </header>

        <main className="min-h-0 flex-1 bg-slate-100">
          {loading && (
            <p className="p-6 text-center text-sm text-slate-600">
              Preparing preview…
            </p>
          )}

          {!loading && error && (
            <div className="p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && previewUrl && (
            <iframe
              title={`Preview of ${fileName}`}
              src={previewUrl}
              className="h-full w-full border-0"
            />
          )}
        </main>
      </div>
    </div>
  )
}
