import { useEffect, useMemo, useRef, useState } from "react"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import {
  Field,
  TextInput,
  TextArea,
  Select,
  Button,
} from "../../components/ui/FormControls"
import { useToast } from "../../components/ui/ToastContext"
import {
  createNotice,
  deleteNotice,
  deleteNoticeAttachment,
  getAllNotices,
  renewNotice,
  updateNotice,
  uploadNoticeAttachments,
} from "../../api/notices"
import type {
  CreateNoticeData,
  Notice,
} from "../../api/notices"

const categories = [
  "Academic",
  "Examinations",
  "Finance",
  "Infrastructure",
  "Library",
  "Events",
]

const priorityStyle: Record<
  Notice["priority"],
  { bg: string; text: string }
> = {
  High: { bg: "#FEF2F2", text: "#DC2626" },
  Medium: { bg: "#FFF7ED", text: "#F97316" },
  Low: { bg: "#F0FDF4", text: "#16A34A" },
}

const statusStyle: Record<
  Notice["status"],
  { bg: string; text: string }
> = {
  Published: { bg: "#F0FDF4", text: "#16A34A" },
  Draft: { bg: "#F8FAFC", text: "#64748B" },
  Archived: { bg: "#F1F5F9", text: "#94A3B8" },
}

const emptyForm: CreateNoticeData = {
  title: "",
  category: "Academic",
  priority: "Medium",
  content: "",
  published_date: null,
  expiry_date: null,
  status: "Published",
  target_year: "ALL",
}

function formatDate(value: string | null) {
  if (!value) return "Not published"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function toDateInputValue(value: string | null) {
  if (!value) return ""

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function dateToISOString(value: string) {
  if (!value) return null

  return new Date(`${value}T23:59:59`).toISOString()
}

function getTargetLabel(targetYear: Notice["target_year"]) {
  if (targetYear === "ALL") return "Everyone"
  return `Year ${targetYear}`
}

export default function AdminNotices() {
  const { showToast } = useToast()

  const [notices, setNotices] = useState<Notice[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Notice | null>(null)
  const [toDelete, setToDelete] = useState<Notice | null>(null)

  const [catFilter, setCatFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [form, setForm] = useState<CreateNoticeData>(emptyForm)
  const [createFiles, setCreateFiles] = useState<File[]>([])

  const createFileInputRef = useRef<HTMLInputElement | null>(null)
  const detailFileInputRef = useRef<HTMLInputElement | null>(null)
  const editFileInputRef = useRef<HTMLInputElement | null>(null)

  const loadNotices = async () => {
    try {
      setLoading(true)

      const data = await getAllNotices()

      setNotices(data)

      setSelectedId(current => {
        if (current && data.some(notice => notice.notice_id === current)) {
          return current
        }

        return data[0]?.notice_id ?? null
      })
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to load notices",
        "error"
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotices()
  }, [])

  const selected = useMemo(
    () =>
      notices.find(notice => notice.notice_id === selectedId) ?? null,
    [notices, selectedId]
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return notices.filter(notice => {
      const matchesSearch =
        !query ||
        notice.title.toLowerCase().includes(query) ||
        notice.content.toLowerCase().includes(query) ||
        notice.category.toLowerCase().includes(query)

      const matchesCategory =
        catFilter === "All" || notice.category === catFilter

      const matchesStatus =
        statusFilter === "all" ||
        notice.status.toLowerCase() === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [notices, search, catFilter, statusFilter])

  const publishedCount = notices.filter(
    notice => notice.status === "Published"
  ).length

  const activeCount = notices.filter(
    notice => notice.is_active
  ).length

  const createNewNotice = async () => {
    if (!form.title.trim()) {
      showToast("Please enter a notice title", "error")
      return
    }

    if (!form.content.trim()) {
      showToast("Please enter notice content", "error")
      return
    }

    try {
      setSaving(true)

      const payload: CreateNoticeData = {
        ...form,
        title: form.title.trim(),
        content: form.content.trim(),
        published_date:
          form.status === "Published"
            ? new Date().toISOString()
            : null,
        expiry_date: form.expiry_date || null,
      }

      let created = await createNotice(payload)

      if (createFiles.length > 0) {
        created = await uploadNoticeAttachments(
          created.notice_id,
          createFiles
        )
      }

      setNotices(current => [created, ...current])
      setSelectedId(created.notice_id)

      setForm(emptyForm)
      setCreateFiles([])
      setShowForm(false)

      showToast(
        created.status === "Published"
          ? "Notice published"
          : "Notice saved as draft",
        "success"
      )
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to create notice",
        "error"
      )
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (notice: Notice) => {
    setEditing({
      ...notice,
      title: notice.title,
      category: notice.category,
      priority: notice.priority,
      content: notice.content,
      published_date: notice.published_date,
      expiry_date: notice.expiry_date,
      status: notice.status,
      target_year: notice.target_year,
    })
  }

  const submitEdit = async () => {
    if (!editing) return

    if (!editing.title.trim()) {
      showToast("Please enter a notice title", "error")
      return
    }

    if (!editing.content.trim()) {
      showToast("Please enter notice content", "error")
      return
    }

    try {
      setSaving(true)

      const updated = await updateNotice(editing.notice_id, {
        title: editing.title.trim(),
        category: editing.category,
        priority: editing.priority,
        content: editing.content.trim(),
        published_date: editing.published_date,
        expiry_date: editing.expiry_date,
        status: editing.status,
        target_year: editing.target_year,
      })

      setNotices(current =>
        current.map(notice =>
          notice.notice_id === updated.notice_id
            ? updated
            : notice
        )
      )

      setEditing(null)
      showToast("Notice updated", "success")
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update notice",
        "error"
      )
    } finally {
      setSaving(false)
    }
  }

  const archiveNotice = async (notice: Notice) => {
    try {
      const updated = await updateNotice(notice.notice_id, {
        status: "Archived",
      })

      setNotices(current =>
        current.map(item =>
          item.notice_id === updated.notice_id
            ? updated
            : item
        )
      )

      showToast("Notice archived", "info")
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to archive notice",
        "error"
      )
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return

    try {
      await deleteNotice(toDelete.notice_id)

      setNotices(current =>
        current.filter(
          notice => notice.notice_id !== toDelete.notice_id
        )
      )

      if (selectedId === toDelete.notice_id) {
        setSelectedId(null)
      }

      setToDelete(null)
      showToast("Notice deleted", "success")
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete notice",
        "error"
      )
    }
  }

  const uploadAttachments = async (
    notice: Notice,
    files: FileList | null
  ) => {
    if (!files || files.length === 0) return

    try {
      setSaving(true)

      const updated = await uploadNoticeAttachments(
        notice.notice_id,
        Array.from(files)
      )

      setNotices(current =>
        current.map(item =>
          item.notice_id === updated.notice_id
            ? updated
            : item
        )
      )

      if (editing?.notice_id === updated.notice_id) {
        setEditing(updated)
      }

      showToast("Attachment(s) uploaded", "success")
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to upload attachments",
        "error"
      )
    } finally {
      setSaving(false)
    }
  }

  const removeAttachment = async (
    notice: Notice,
    publicId?: string
  ) => {
    if (!publicId) return

    try {
      setSaving(true)

      const updated = await deleteNoticeAttachment(
        notice.notice_id,
        publicId
      )

      setNotices(current =>
        current.map(item =>
          item.notice_id === updated.notice_id
            ? updated
            : item
        )
      )

      if (editing?.notice_id === updated.notice_id) {
        setEditing(updated)
      }

      showToast("Attachment removed", "success")
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to remove attachment",
        "error"
      )
    } finally {
      setSaving(false)
    }
  }

  const renew = async (notice: Notice) => {
    if (!notice.expiry_date) {
      showToast("This notice does not have an expiry date", "error")
      return
    }

    const currentExpiry = new Date(notice.expiry_date)

    if (Number.isNaN(currentExpiry.getTime())) {
      showToast("Invalid expiry date", "error")
      return
    }

    const newExpiry = new Date(currentExpiry)
    newExpiry.setMonth(newExpiry.getMonth() + 1)

    try {
      setSaving(true)

      const response = await renewNotice(
        notice.notice_id,
        newExpiry.toISOString()
      )

      setNotices(current =>
        current.map(item =>
          item.notice_id === response.notice.notice_id
            ? response.notice
            : item
        )
      )

      showToast("Notice renewed for another month", "success")
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to renew notice",
        "error"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            Notices
          </h1>

          <p className="text-[13px] text-[#64748B] mt-0.5">
            {publishedCount} published · {activeCount} active ·{" "}
            {notices.length} total
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm(value => !value)
            setForm(emptyForm)
            setCreateFiles([])
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] transition-colors"
        >
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>

          Create Notice
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 mb-5">
          <h3 className="text-[13px] font-semibold text-[#1E293B] mb-4">
            New Notice
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              value={form.title}
              onChange={e =>
                setForm({
                  ...form,
                  title: e.target.value,
                })
              }
              placeholder="Notice title"
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC] md:col-span-2"
            />

            <select
              value={form.category}
              onChange={e =>
                setForm({
                  ...form,
                  category: e.target.value,
                })
              }
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            >
              {categories.map(category => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <select
              value={form.priority}
              onChange={e =>
                setForm({
                  ...form,
                  priority: e.target.value as Notice["priority"],
                })
              }
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            >
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            <select
              value={form.target_year}
              onChange={e =>
                setForm({
                  ...form,
                  target_year: e.target.value as Notice["target_year"],
                })
              }
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            >
              <option value="ALL">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>

            <select
              value={form.status}
              onChange={e =>
                setForm({
                  ...form,
                  status: e.target.value as Notice["status"],
                })
              }
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            >
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>

            <input
              type="date"
              value={form.expiry_date
                ? toDateInputValue(form.expiry_date)
                : ""}
              onChange={e =>
                setForm({
                  ...form,
                  expiry_date: dateToISOString(e.target.value),
                })
              }
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            />
          </div>

          <textarea
            value={form.content}
            onChange={e =>
              setForm({
                ...form,
                content: e.target.value,
              })
            }
            placeholder="Notice body / description..."
            className="w-full h-24 px-3 py-2 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC] resize-none mb-3"
          />

          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-[#334155]">
                Attachments
              </span>

              <button
                type="button"
                onClick={() => createFileInputRef.current?.click()}
                disabled={saving}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-40"
              >
                Add files
              </button>

              <input
                ref={createFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => {
                  if (e.target.files) {
                    setCreateFiles(Array.from(e.target.files))
                  }
                  e.currentTarget.value = ""
                }}
              />
            </div>

            {createFiles.length > 0 && (
              <div className="space-y-1.5">
                {createFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                  >
                    <span className="text-[11px] text-[#475569] truncate">
                      {file.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCreateFiles(current =>
                          current.filter(
                            (_, fileIndex) => fileIndex !== index
                          )
                        )
                      }
                      className="text-[10px] text-[#DC2626] hover:underline flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={createNewNotice}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-[#2563EB] text-white text-[12px] font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : form.status === "Published"
                  ? "Publish Notice"
                  : "Save Notice"}
            </button>

            <button
              onClick={() => {
                setShowForm(false)
                setForm(emptyForm)
                setCreateFiles([])
              }}
              className="px-4 py-1.5 rounded-lg text-[12px] text-[#94A3B8]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-280px)]">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[#F1F5F9] flex flex-col gap-2">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>

              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notices..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-[#E2E8F0] text-[12px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
              />
            </div>

            <div className="flex gap-1">
              {["all", "published", "draft", "archived"].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-all ${
                    statusFilter === status
                      ? "bg-[#2563EB] text-white"
                      : "text-[#64748B] hover:text-[#2563EB]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="h-8 px-2 rounded-lg border border-[#E2E8F0] text-[11px] text-[#64748B] bg-[#F8FAFC]"
            >
              <option value="All">All categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#F8FAFC]">
            {loading ? (
              <div className="text-center py-10 text-[12px] text-[#94A3B8]">
                Loading notices...
              </div>
            ) : (
              <>
                {filtered.map(notice => {
                  const priority =
                    priorityStyle[notice.priority]

                  return (
                    <button
                      key={notice.notice_id}
                      onClick={() =>
                        setSelectedId(notice.notice_id)
                      }
                      className={`w-full text-left px-4 py-3 hover:bg-[#F8FAFC] transition-colors ${
                        selectedId === notice.notice_id
                          ? "bg-[#EFF6FF]"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                              className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: priority.bg,
                                color: priority.text,
                              }}
                            >
                              {notice.priority}
                            </span>

                            <span className="text-[11px] text-[#94A3B8]">
                              {notice.status}
                            </span>
                          </div>

                          <div className="text-[12px] font-medium text-[#1E293B] leading-snug line-clamp-2">
                            {notice.title}
                          </div>

                          <div className="text-[11px] text-[#94A3B8] mt-0.5">
                            {notice.category} ·{" "}
                            {formatDate(notice.published_date)}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}

                {filtered.length === 0 && (
                  <div className="text-center py-10 text-[12px] text-[#94A3B8]">
                    No notices match
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-xl border border-[#E2E8F0] flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="flex items-start justify-between px-6 py-4 border-b border-[#F1F5F9]">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor:
                          priorityStyle[selected.priority].bg,
                        color:
                          priorityStyle[selected.priority].text,
                      }}
                    >
                      {selected.priority} priority
                    </span>

                    <span
                      className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor:
                          statusStyle[selected.status].bg,
                        color:
                          statusStyle[selected.status].text,
                      }}
                    >
                      {selected.status}
                    </span>

                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                      {getTargetLabel(selected.target_year)}
                    </span>
                  </div>

                  <h2 className="text-[16px] font-bold text-[#1E293B] leading-snug">
                    {selected.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[12px] text-[#64748B]">
                    <span>{selected.category}</span>

                    <span className="text-[#CBD5E1]">·</span>

                    <span>
                      Published{" "}
                      {formatDate(selected.published_date)}
                    </span>

                    {selected.expiry_date && (
                      <>
                        <span className="text-[#CBD5E1]">·</span>
                        <span>
                          Expires{" "}
                          {formatDate(selected.expiry_date)}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="text-[11px] text-[#94A3B8] mt-1">
                    Created by user {selected.user_id}
                  </div>
                </div>

                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => renew(selected)}
                    disabled={
                      saving ||
                      !selected.expiry_date ||
                      selected.status === "Archived"
                    }
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-all disabled:opacity-40"
                  >
                    Renew
                  </button>

                  <button
                    onClick={() => openEdit(selected)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:border-[#F97316] hover:text-[#F97316] transition-all"
                  >
                    Edit
                  </button>

                  {selected.status !== "Archived" && (
                    <button
                      onClick={() => archiveNotice(selected)}
                      disabled={saving}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:border-[#94A3B8] hover:text-[#94A3B8] transition-all disabled:opacity-40"
                    >
                      Archive
                    </button>
                  )}

                  <button
                    onClick={() => setToDelete(selected)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <p className="text-[14px] text-[#334155] leading-relaxed whitespace-pre-wrap">
                  {selected.content}
                </p>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[12px] font-semibold text-[#1E293B]">
                      Attachments
                    </h3>

                    <button
                      onClick={() =>
                        detailFileInputRef.current?.click()
                      }
                      disabled={saving}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-40"
                    >
                      Add files
                    </button>

                    <input
                      ref={detailFileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={e => {
                        uploadAttachments(
                          selected,
                          e.target.files
                        )
                        e.currentTarget.value = ""
                      }}
                    />
                  </div>

                  {selected.attachments.length > 0 ? (
                    <div className="space-y-2">
                      {selected.attachments.map(
                        (attachment, index) => (
                          <div
                            key={
                              attachment.public_id ??
                              `${attachment.file_name}-${index}`
                            }
                            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                          >
                            <a
                              href={attachment.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[12px] text-[#2563EB] hover:underline truncate"
                            >
                              {attachment.file_name ??
                                `Attachment ${index + 1}`}
                            </a>

                            {attachment.public_id && (
                              <button
                                onClick={() =>
                                  removeAttachment(
                                    selected,
                                    attachment.public_id
                                  )
                                }
                                disabled={saving}
                                className="text-[11px] text-[#DC2626] hover:underline flex-shrink-0 disabled:opacity-40"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-[12px] text-[#94A3B8]">
                      No attachments
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#94A3B8] text-[13px]">
              {loading
                ? "Loading notices..."
                : "Select a notice to view details"}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Notice"
        width="max-w-xl"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={submitEdit}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <Field label="Title" required>
              <TextInput
                value={editing.title}
                onChange={e =>
                  setEditing({
                    ...editing,
                    title: e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Category">
              <Select
                value={editing.category}
                onChange={e =>
                  setEditing({
                    ...editing,
                    category: e.target.value,
                  })
                }
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Content">
              <TextArea
                rows={5}
                value={editing.content}
                onChange={e =>
                  setEditing({
                    ...editing,
                    content: e.target.value,
                  })
                }
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                <Select
                  value={editing.priority}
                  onChange={e =>
                    setEditing({
                      ...editing,
                      priority:
                        e.target.value as Notice["priority"],
                    })
                  }
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </Select>
              </Field>

              <Field label="Target Year">
                <Select
                  value={editing.target_year}
                  onChange={e =>
                    setEditing({
                      ...editing,
                      target_year:
                        e.target.value as Notice["target_year"],
                    })
                  }
                >
                  <option value="ALL">All Years</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <Select
                  value={editing.status}
                  onChange={e =>
                    setEditing({
                      ...editing,
                      status:
                        e.target.value as Notice["status"],
                    })
                  }
                >
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </Select>
              </Field>

              <Field label="Expiry Date">
                <input
                  type="date"
                  value={toDateInputValue(
                    editing.expiry_date
                  )}
                  onChange={e =>
                    setEditing({
                      ...editing,
                      expiry_date: dateToISOString(
                        e.target.value
                      ),
                    })
                  }
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[#334155]">
                  Attachments
                </span>

                <button
                  type="button"
                  onClick={() =>
                    editFileInputRef.current?.click()
                  }
                  disabled={saving}
                  className="text-[11px] text-[#2563EB] hover:underline disabled:opacity-40"
                >
                  Add files
                </button>
              </div>

              <input
                ref={editFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => {
                  uploadAttachments(
                    editing,
                    e.target.files
                  )
                  e.currentTarget.value = ""
                }}
              />

              {editing.attachments.length > 0 && (
                <div className="space-y-1.5">
                  {editing.attachments.map(
                    (attachment, index) => (
                      <div
                        key={
                          attachment.public_id ??
                          `${attachment.file_name}-${index}`
                        }
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[#F8FAFC]"
                      >
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[#2563EB] truncate"
                        >
                          {attachment.file_name ??
                            `Attachment ${index + 1}`}
                        </a>

                        {attachment.public_id && (
                          <button
                            type="button"
                            onClick={() =>
                              removeAttachment(
                                editing,
                                attachment.public_id
                              )
                            }
                            disabled={saving}
                            className="text-[10px] text-[#DC2626] disabled:opacity-40"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this notice?"
        message={`"${toDelete?.title}" will be permanently removed for everyone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}