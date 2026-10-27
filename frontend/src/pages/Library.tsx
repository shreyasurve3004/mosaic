import { useEffect, useMemo, useState } from "react"
import { useToast } from "../components/ui/ToastContext"
import {
  cancelReservation,
  getLibraryBooks,
  getMyBooks,
  reserveBook,
  type LibraryBook,
  type MyBook,
} from "../api/library"

export default function Library() {
  const { showToast } = useToast()

  const [books, setBooks] = useState<LibraryBook[]>([])
  const [myBooks, setMyBooks] = useState<MyBook[]>([])

  const [query, setQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [availableOnly, setAvailableOnly] = useState(false)

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const loadLibrary = async () => {
    try {
      setLoading(true)

      const [bookData, myBookData] = await Promise.all([
        getLibraryBooks(),
        getMyBooks(),
      ])

      console.log("BOOKS FROM API:", bookData)
      console.log("MY BOOKS FROM API:", myBookData)

      setBooks(bookData)
      setMyBooks(myBookData)
    } catch (error) {
      console.error("LIBRARY ERROR:", error)
      showToast("Failed to load library data", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLibrary()
  }, [])

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(books.map((book) => book.category)))],
    [books]
  )

  const myReservedBookIds = myBooks
    .filter((book) => book.status === "reserved")
    .map((book) => book.book_id)

  const myIssuedBookIds = myBooks
    .filter((book) => book.status === "issued")
    .map((book) => book.book_id)

  const filtered = books.filter((book) => {
    const search = query.toLowerCase()

    const matchesQ =
      book.title.toLowerCase().includes(search) ||
      book.author.toLowerCase().includes(search) ||
      book.isbn.toLowerCase().includes(search)

    const matchesC =
      categoryFilter === "All" || book.category === categoryFilter

    const isMine = myBooks.some(
      (record) =>
        record.book_id === book.id &&
        (record.status === "reserved" || record.status === "issued")
    )

    const matchesAvailability =
      !availableOnly || book.available_copies > 0 || isMine

    return matchesQ && matchesC && matchesAvailability
  })

  const handleReserve = async (bookId: number, title: string) => {
    try {
      setActionLoading(bookId)

      await reserveBook(bookId)

      showToast(
        `"${title}" reserved — visit library desk to collect`,
        "success"
      )

      await loadLibrary()
    } catch (error) {
      console.error(error)
      showToast(`Could not reserve "${title}"`, "error")
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelReservation = async (
    bookId: number,
    title: string
  ) => {
    const record = myBooks.find(
      (item) => item.book_id === bookId && item.status === "reserved"
    )

    if (!record) return

    try {
      setActionLoading(bookId)

      await cancelReservation(record.borrow_id)

      showToast(`Reservation for "${title}" cancelled`, "info")

      await loadLibrary()
    } catch (error) {
      console.error(error)
      showToast(`Could not cancel reservation for "${title}"`, "error")
    } finally {
      setActionLoading(null)
    }
  }

  const openDigitalCopy = (url?: string | null) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer")
    } else {
      showToast(
        "Digital PDF copy is not available for this title",
        "error"
      )
    }
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
          Library Catalog
        </h1>

        <p className="text-[13px] text-[#64748B] mt-0.5">
          {myBooks.length} active holding
          {myBooks.length !== 1 ? "s" : ""} (Reserved / Issued)
        </p>
      </div>

      {/* 1. Search & Filter Controls */}
      <div className="flex gap-4 mb-5 flex-col md:flex-row md:items-center justify-between">
        <div className="flex gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Title, Author, or ISBN..."
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-[#E2E8F0] bg-white text-[13px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[13px] text-[#64748B] focus:outline-none focus:border-[#2563EB] transition-all"
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Available Only Toggle Switch */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="sr-only peer"
          />

          <div className="w-9 h-5 bg-[#E2E8F0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB] relative"></div>

          <span className="text-[13px] font-medium text-[#374151]">
            Available Only
          </span>
        </label>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-10 text-center text-[13px] text-[#64748B]">
          Loading library...
        </div>
      )}

      {!loading && (
        <>
          {/* 2. Top Banner: "Books You've Borrowed" */}
          {myBooks.length > 0 && (
            <div className="mb-6 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 text-[13px] font-semibold text-[#2563EB]">
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>

                Books You've Borrowed & Reserved
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {myBooks.map((record) => {
                  const isIssued = record.status === "issued"

                  return (
                    <div
                      key={record.borrow_id}
                      className="flex flex-col justify-between p-3 bg-white rounded-lg border border-[#BFDBFE] shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-[13px] font-bold text-[#1E293B]">
                            {record.title}
                          </div>

                          <div className="text-[11px] text-[#64748B]">
                            {record.author}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isIssued
                              ? "bg-[#F0FDF4] text-[#16A34A]"
                              : "bg-[#FFF7ED] text-[#F97316]"
                          }`}
                        >
                          {isIssued ? "Issued" : "Reserved"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#F1F5F9]">
                        <span className="text-[#94A3B8]">
                          {isIssued
                            ? `Due: ${
                                record.due_date
                                  ? new Date(
                                      record.due_date
                                    ).toLocaleDateString()
                                  : "14 days"
                              }`
                            : "Hold Active (Collect at Desk)"}
                        </span>

                        <div className="flex items-center gap-2">
                          {record.pdf_url && (
                            <button
                              onClick={() =>
                                openDigitalCopy(record.pdf_url)
                              }
                              className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#059669] font-medium border border-[#A7F3D0] hover:bg-[#D1FAE5]"
                            >
                              PDF ↗
                            </button>
                          )}

                          {!isIssued && (
                            <button
                              disabled={
                                actionLoading === record.book_id
                              }
                              onClick={() =>
                                handleCancelReservation(
                                  record.book_id,
                                  record.title
                                )
                              }
                              className="px-2 py-0.5 rounded text-[#DC2626] hover:bg-[#FEF2F2] font-medium disabled:opacity-50"
                            >
                              Unreserve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3. Book Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filtered.map((book) => {
              const isReservedByMe = myReservedBookIds.includes(book.id)
              const isIssuedToMe = myIssuedBookIds.includes(book.id)
              const isAvailable = book.available_copies > 0
              const isActionLoading = actionLoading === book.id

              return (
                <div
                  key={book.id}
                  className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div
                      className="h-32 flex items-center justify-center relative"
                      style={{
                        backgroundColor: `${
                          book.cover_color || "#2563EB"
                        }15`,
                      }}
                    >
                      <div
                        className="w-16 h-24 rounded shadow-md flex items-center justify-center text-center p-2 text-[8px] font-semibold text-white leading-tight"
                        style={{
                          backgroundColor:
                            book.cover_color || "#2563EB",
                        }}
                      >
                        {book.title
                          .split(" ")
                          .slice(0, 3)
                          .join("\n")}
                      </div>

                      {/* Top Status Badge */}
                      <div className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/90 border shadow-xs">
                        {isIssuedToMe ? (
                          <span className="text-[#16A34A]">
                            Issued
                          </span>
                        ) : isReservedByMe ? (
                          <span className="text-[#F97316]">
                            Reserved
                          </span>
                        ) : isAvailable ? (
                          <span className="text-[#16A34A]">
                            {book.available_copies} Available
                          </span>
                        ) : (
                          <span className="text-[#64748B]">
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="text-[13px] font-semibold text-[#1E293B] leading-snug mb-1">
                        {book.title}
                      </div>

                      <div className="text-[11px] text-[#94A3B8] mb-0.5">
                        {book.author}
                      </div>

                      <div className="text-[11px] text-[#94A3B8] mb-2">
                        {book.category}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons based on States */}
                  <div className="p-4 pt-0 space-y-2">
                    {/* Issued */}
                    {isIssuedToMe ? (
                      <>
                        <button
                          disabled
                          className="w-full py-2 rounded-lg text-[11px] font-semibold bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] cursor-not-allowed"
                        >
                          Issued • Return at Library Desk
                        </button>

                        {book.pdf_url && (
                          <button
                            onClick={() =>
                              openDigitalCopy(book.pdf_url)
                            }
                            className="w-full py-1.5 rounded-lg text-[11px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] hover:bg-[#D1FAE5]"
                          >
                            Download Digital Copy ↗
                          </button>
                        )}
                      </>
                    ) : /* Reserved */
                    isReservedByMe ? (
                      <>
                        <button
                          disabled={isActionLoading}
                          onClick={() =>
                            handleCancelReservation(
                              book.id,
                              book.title
                            )
                          }
                          className="w-full py-2 rounded-lg text-[12px] font-semibold bg-white text-[#DC2626] border border-[#FCA5A5] hover:bg-[#FEF2F2] disabled:opacity-50"
                        >
                          {isActionLoading
                            ? "Cancelling..."
                            : "Unreserve"}
                        </button>

                        {book.pdf_url && (
                          <button
                            onClick={() =>
                              openDigitalCopy(book.pdf_url)
                            }
                            className="w-full py-1.5 rounded-lg text-[11px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] hover:bg-[#D1FAE5]"
                          >
                            Download Digital Copy ↗
                          </button>
                        )}
                      </>
                    ) : /* Available */
                    isAvailable ? (
                      <button
                        disabled={isActionLoading}
                        onClick={() =>
                          handleReserve(book.id, book.title)
                        }
                        className="w-full py-2 rounded-lg text-[12px] font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-60"
                      >
                        {isActionLoading ? "Borrowing..." : "Borrow"}
                      </button>
                    ) : (
                      /* Out of Stock */
                      <button
                        disabled
                        className="w-full py-2 rounded-lg text-[12px] font-semibold bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed"
                      >
                        Out of Stock
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-[13px] text-[#64748B]">
              No books found.
            </div>
          )}
        </>
      )}
    </div>
  )
}