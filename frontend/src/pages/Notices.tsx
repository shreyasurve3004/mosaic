import { useEffect, useMemo, useState } from "react"
import { getStudentProfile } from "../api/academics"
import { downloadFile, previewFile } from "../api/files"
import {
  getActiveNotices,
  getNoticeReads,
  markNoticeRead,
  type Notice,
} from "../api/notices"
import { useToast } from "../components/ui/ToastContext"

const categoryColor: Record<
  string,
  { color: string; bg: string }
> = {
  Examinations: {
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  Finance: {
    color: "#F97316",
    bg: "#FFF7ED",
  },
  Events: {
    color: "#9333EA",
    bg: "#FDF4FF",
  },
  Infrastructure: {
    color: "#64748B",
    bg: "#F8FAFC",
  },
  Library: {
    color: "#16A34A",
    bg: "#F0FDF4",
  },
  Placement: {
    color: "#DB2777",
    bg: "#FDF2F8",
  },
  Academic: {
    color: "#0891B2",
    bg: "#ECFEFF",
  },
}

const categories = [
  "All",
  "Examinations",
  "Academic",
  "Finance",
  "Placement",
  "Events",
  "Library",
  "Infrastructure",
]

function formatDate(date: string | null) {
  if (!date) return "Date unavailable"

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getAttachmentName(
  file: Notice["attachments"][number],
  index: number
) {
  return (
    file.file_name ||
    `Document_${index + 1}`
  )
}

function getAttachmentSize(
  file: Notice["attachments"][number]
) {
  if (!file.file_size || file.file_size <= 0) {
    return "Document"
  }

  if (file.file_size < 1024) {
    return `${file.file_size} B`
  }

  if (file.file_size < 1024 * 1024) {
    return `${(
      file.file_size / 1024
    ).toFixed(1)} KB`
  }

  return `${(
    file.file_size /
    (1024 * 1024)
  ).toFixed(1)} MB`
}

export default function Notices() {
  const { showToast } = useToast()
  const [notices, setNotices] = useState<Notice[]>([])
  const [readNoticeIds, setReadNoticeIds] =
    useState<number[]>([])

  const [searchQuery, setSearchQuery] =
    useState("")

  const [selectedCategory, setSelectedCategory] =
    useState("All")

  const [bookmarkedIds, setBookmarkedIds] =
    useState<number[]>([])

  const [selectedId, setSelectedId] =
    useState<number | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [readStatusError, setReadStatusError] =
    useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadNotices() {
      try {
        setLoading(true)
        setError(null)

        const profile =
          await getStudentProfile()

        const [noticeResult, readResult] =
          await Promise.allSettled([
            getActiveNotices(profile.year ?? "ALL"),
            getNoticeReads(),
          ])

        if (!mounted) return

        if (noticeResult.status === "rejected") {
          throw noticeResult.reason
        }

        setNotices(noticeResult.value)

        if (noticeResult.value.length > 0) {
          setSelectedId(
            noticeResult.value[0].notice_id
          )
        }

        if (readResult.status === "fulfilled") {
          setReadStatusError(null)
          setReadNoticeIds(
            readResult.value
              .filter(read => read.is_read)
              .map(read => read.notice)
          )
        } else {
          setReadStatusError(
            readResult.reason instanceof Error
              ? readResult.reason.message
              : "Unable to load notice read status."
          )
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load notices."
          )
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadNotices()

    return () => {
      mounted = false
    }
  }, [])

  const visible = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase()

    return notices
      .filter(notice =>
        selectedCategory === "All"
          ? true
          : notice.category === selectedCategory
      )
      .filter(notice => {
        if (!query) return true

        return (
          notice.title
            .toLowerCase()
            .includes(query) ||
          notice.content
            .toLowerCase()
            .includes(query) ||
          notice.category
            .toLowerCase()
            .includes(query)
        )
      })
      .sort((a, b) => {
        if (a.priority === "High" && b.priority !== "High") {
          return -1
        }

        if (b.priority === "High" && a.priority !== "High") {
          return 1
        }

        if (!a.published_date) return 1
        if (!b.published_date) return -1

        return (
          new Date(b.published_date).getTime() -
          new Date(a.published_date).getTime()
        )
      })
  }, [
    notices,
    selectedCategory,
    searchQuery,
  ])

  useEffect(() => {
    if (
      visible.length > 0 &&
      !visible.some(
        notice =>
          notice.notice_id === selectedId
      )
    ) {
      setSelectedId(
        visible[0].notice_id
      )
    }
  }, [visible, selectedId])

  const selected =
    visible.find(
      notice =>
        notice.notice_id === selectedId
    ) ??
    visible[0] ??
    null

  const isUnread = (notice: Notice) =>
    !readNoticeIds.includes(
      notice.notice_id
    )

  async function select(notice: Notice) {
    setSelectedId(notice.notice_id)

    if (!isUnread(notice)) return

    try {
      await markNoticeRead(
        notice.notice_id
      )

      setReadNoticeIds(previous =>
        previous.includes(notice.notice_id)
          ? previous
          : [
              ...previous,
              notice.notice_id,
            ]
      )
    } catch {
      // Keep the notice selected even if
      // read-status synchronization fails.
    }
  }

  function toggleBookmark(id: number) {
    setBookmarkedIds(previous =>
      previous.includes(id)
        ? previous.filter(
            item => item !== id
          )
        : [...previous, id]
    )
  }

  async function markAllRead() {
    const unread = visible.filter(
      isUnread
    )

    if (unread.length === 0) return

    const results =
      await Promise.allSettled(
        unread.map(notice =>
          markNoticeRead(
            notice.notice_id
          )
        )
      )

    const successfullyRead =
      unread
        .filter(
          (_, index) =>
            results[index].status ===
            "fulfilled"
        )
        .map(notice =>
          notice.notice_id
        )

    if (successfullyRead.length > 0) {
      setReadNoticeIds(previous =>
        Array.from(
          new Set([
            ...previous,
            ...successfullyRead,
          ])
        )
      )
    }
  }

  const unreadCount = visible.filter(
    isUnread
  ).length

  return (
    <div className="p-6 max-w-[1600px] w-full mx-auto h-[calc(100vh-80px)] flex flex-col">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-[24px] font-bold text-[#1E293B] tracking-tight">
            Notice Board
          </h1>

          <p className="text-[13px] text-[#64748B] mt-0.5">
            Stay updated with official campus announcements
            {" "}
            ({unreadCount} unread)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle
                cx="11"
                cy="11"
                r="8"
              />
              <path d="m21 21-4.35-4.35" />
            </svg>

            <input
              type="text"
              placeholder="Search notices..."
              value={searchQuery}
              onChange={event =>
                setSearchQuery(
                  event.target.value
                )
              }
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] transition-all"
            />
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-3.5 py-2 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] text-[12px] font-semibold rounded-xl transition-all shrink-0"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {readStatusError && (
        <p
          role="status"
          className="mb-3 text-[12px] text-[#B45309] shrink-0"
        >
          Notices are visible, but read status could not be loaded:{" "}
          {readStatusError}
        </p>
      )}

      {/* Category Pills */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 shrink-0 no-scrollbar">
        {categories.map(category => (
          <button
            key={category}
            onClick={() =>
              setSelectedCategory(category)
            }
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all shrink-0 ${
              selectedCategory === category
                ? "bg-[#2563EB] text-white shadow-sm"
                : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB]"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Left Notice Feed */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] overflow-y-auto flex flex-col shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-[#94A3B8] text-[13px]">
              Loading notices...
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-[13px] text-[#DC2626] mb-3">
                {error}
              </p>

              <button
                onClick={() =>
                  window.location.reload()
                }
                className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold"
              >
                Retry
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="p-12 text-center text-[#94A3B8] text-[13px]">
              No notices match your filter criteria.
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {visible.map(notice => {
                const unread =
                  isUnread(notice)

                const isSelected =
                  selected?.notice_id ===
                  notice.notice_id

                const isBookmarked =
                  bookmarkedIds.includes(
                    notice.notice_id
                  )

                const style =
                  categoryColor[
                    notice.category
                  ] ||
                  categoryColor.Academic

                return (
                  <div
                    key={notice.notice_id}
                    onClick={() =>
                      select(notice)
                    }
                    className={`p-4 transition-all cursor-pointer relative group ${
                      isSelected
                        ? "bg-[#EFF6FF]/60 border-l-4 border-l-[#2563EB]"
                        : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        {unread && (
                          <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
                        )}

                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor:
                              style.bg,
                            color:
                              style.color,
                          }}
                        >
                          {notice.category}
                        </span>

                        {notice.priority ===
                          "High" && (
                          <span className="text-[10px] font-semibold text-[#F97316] bg-[#FFF7ED] px-2 py-0.5 rounded-md">
                            High Priority
                          </span>
                        )}
                      </div>

                      <button
                        onClick={event => {
                          event.stopPropagation()
                          toggleBookmark(
                            notice.notice_id
                          )
                        }}
                        className={`text-[14px] transition-colors ${
                          isBookmarked
                            ? "text-[#F59E0B]"
                            : "text-[#CBD5E1] group-hover:text-[#94A3B8]"
                        }`}
                      >
                        {isBookmarked
                          ? "★"
                          : "☆"}
                      </button>
                    </div>

                    <h3
                      className={`text-[14px] leading-snug mb-1 ${
                        unread
                          ? "font-bold text-[#1E293B]"
                          : "font-semibold text-[#334155]"
                      }`}
                    >
                      {notice.title}
                    </h3>

                    <p className="text-[12px] text-[#64748B] line-clamp-2 leading-relaxed mb-3">
                      {notice.content}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                      <span>
                        {notice.target_year ===
                        "ALL"
                          ? "All Years"
                          : `Year ${notice.target_year}`}
                      </span>

                      <span>
                        {formatDate(
                          notice.published_date
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Reading View */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] flex flex-col overflow-hidden shadow-sm">
          {selected ? (
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Header */}
              <div className="p-6 border-b border-[#F1F5F9] bg-[#F8FAFC]/50">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-md"
                      style={{
                        backgroundColor:
                          (
                            categoryColor[
                              selected.category
                            ] ||
                            categoryColor.Academic
                          ).bg,
                        color:
                          (
                            categoryColor[
                              selected.category
                            ] ||
                            categoryColor.Academic
                          ).color,
                      }}
                    >
                      {selected.category}
                    </span>

                    {selected.priority ===
                      "High" && (
                      <span className="text-[11px] font-semibold text-[#F97316] bg-[#FFF7ED] px-2.5 py-1 rounded-md">
                        High Priority
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        toggleBookmark(
                          selected.notice_id
                        )
                      }
                      className="p-2 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition-colors text-[13px]"
                      title="Bookmark"
                    >
                      {bookmarkedIds.includes(
                        selected.notice_id
                      )
                        ? "★ Saved"
                        : "☆ Bookmark"}
                    </button>

                    <button
                      onClick={() =>
                        window.print()
                      }
                      className="p-2 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
                      title="Print notice"
                    >
                      <svg
                        width="15"
                        height="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect
                          x="6"
                          y="14"
                          width="12"
                          height="8"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <h2 className="text-[22px] font-bold text-[#1E293B] leading-tight mb-4">
                  {selected.title}
                </h2>

                {/* Author Info */}
                <div className="flex items-center gap-3 text-[12px] text-[#64748B]">
                  <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-[12px]">
                    {selected.category?.[0] ||
                      "A"}
                  </div>

                  <div>
                    <div className="font-semibold text-[#1E293B]">
                      Administration
                    </div>

                    <div className="text-[11px] text-[#94A3B8]">
                      {selected.target_year ===
                      "ALL"
                        ? "All Years"
                        : `Year ${selected.target_year}`}
                      {" • "}
                      Posted on{" "}
                      {formatDate(
                        selected.published_date
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6 flex-1">
                <div className="text-[14px] text-[#334155] leading-relaxed whitespace-pre-line">
                  {selected.content}
                </div>

                {/* Attachments */}
                {selected.attachments?.length >
                  0 && (
                  <div className="pt-6 border-t border-[#F1F5F9]">
                    <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
                      Attached Documents
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selected.attachments.map(
                        (file, index) => (
                          <div
                            key={`${file.public_id || file.file_url || file.file_name}-${index}`}
                            className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 bg-white rounded-lg border border-[#E2E8F0] text-[#2563EB] shrink-0">
                                <svg
                                  width="16"
                                  height="16"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                              </div>

                              <div className="truncate">
                                <div className="text-[12px] font-medium text-[#1E293B] truncate">
                                  {getAttachmentName(
                                    file,
                                    index
                                  )}
                                </div>

                                <div className="text-[10px] text-[#94A3B8]">
                                  {getAttachmentSize(
                                    file
                                  )}
                                </div>
                              </div>
                            </div>

                            {file.file_url && (
                              <div className="flex items-center gap-3 shrink-0 ml-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void previewFile(
                                      `/api/notices/${selected.notice_id}/attachments/${index}/file/`,
                                      getAttachmentName(file, index)
                                    ).catch((error: unknown) => {
                                      showToast(
                                        error instanceof Error
                                          ? error.message
                                          : "Unable to open this attachment.",
                                        "error"
                                      )
                                    })
                                  }}
                                  className="text-[12px] font-semibold text-[#2563EB] hover:underline"
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void downloadFile(
                                      `/api/notices/${selected.notice_id}/attachments/${index}/file/?download=1`,
                                      getAttachmentName(file, index)
                                    ).catch((error: unknown) => {
                                      showToast(
                                        error instanceof Error
                                          ? error.message
                                          : "Unable to download this attachment.",
                                        "error"
                                      )
                                    })
                                  }}
                                  className="text-[12px] font-semibold text-[#2563EB] hover:underline"
                                >
                                  Download
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[14px] text-[#94A3B8]">
              {loading
                ? "Loading notices..."
                : "Select a notice to preview details."}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}