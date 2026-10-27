import { useMemo, useState } from "react"
import type { AcademicCalendarEvent } from "../../api/academicAdmin"

interface Props {
  events: AcademicCalendarEvent[]
  loading?: boolean
  onCreate?: () => void
  onEdit?: (event: AcademicCalendarEvent) => void
  onDelete?: (event: AcademicCalendarEvent) => void
}

const categoryLabels: Record<AcademicCalendarEvent["category"], string> = {
  semester: "Semester",
  examination: "Examination",
  holiday: "Holiday",
  registration: "Registration",
  result: "Result Declaration",
  semester_break: "Semester Break",
  academic_event: "Academic Event",
  other: "Other",
}

const categoryStyles: Record<
  AcademicCalendarEvent["category"],
  { bar: string; background: string; text: string }
> = {
  semester: {
    bar: "bg-[#2563EB]",
    background: "bg-[#EFF6FF]",
    text: "text-[#2563EB]",
  },
  examination: {
    bar: "bg-[#F97316]",
    background: "bg-[#FFF7ED]",
    text: "text-[#EA580C]",
  },
  holiday: {
    bar: "bg-[#16A34A]",
    background: "bg-[#F0FDF4]",
    text: "text-[#16A34A]",
  },
  registration: {
    bar: "bg-[#0891B2]",
    background: "bg-[#ECFEFF]",
    text: "text-[#0891B2]",
  },
  result: {
    bar: "bg-[#9333EA]",
    background: "bg-[#FDF4FF]",
    text: "text-[#9333EA]",
  },
  semester_break: {
    bar: "bg-[#16A34A]",
    background: "bg-[#F0FDF4]",
    text: "text-[#16A34A]",
  },
  academic_event: {
    bar: "bg-[#7C3AED]",
    background: "bg-[#F5F3FF]",
    text: "text-[#7C3AED]",
  },
  other: {
    bar: "bg-[#64748B]",
    background: "bg-[#F1F5F9]",
    text: "text-[#64748B]",
  },
}

function formatDate(value: string, includeYear = true): string {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  })
}

function dateRange(event: AcademicCalendarEvent): string {
  if (event.start_date === event.end_date) {
    return formatDate(event.start_date)
  }
  const startYear = event.start_date.slice(0, 4)
  const endYear = event.end_date.slice(0, 4)
  const start = formatDate(event.start_date, startYear !== endYear)
  const end = formatDate(event.end_date)
  return `${start} → ${end}`
}

function monthEnd(month: string): string {
  const [year, numericMonth] = month.split("-").map(Number)
  const lastDay = new Date(year, numericMonth, 0).getDate()
  return `${year}-${String(numericMonth).padStart(2, "0")}-${String(
    lastDay
  ).padStart(2, "0")}`
}

export default function AcademicCalendarList({
  events,
  loading = false,
  onCreate,
  onEdit,
  onDelete,
}: Props) {
  const [academicYear, setAcademicYear] = useState("")
  const [category, setCategory] = useState("")
  const [semester, setSemester] = useState("")
  const [month, setMonth] = useState("")
  const isAdmin = Boolean(onCreate || onEdit || onDelete)

  const years = useMemo(
    () => Array.from(new Set(events.map(event => event.academic_year))).sort(),
    [events]
  )
  const semesters = useMemo(
    () =>
      Array.from(
        new Set(
          events
            .map(event => event.semester)
            .filter((value): value is number => value !== null)
        )
      ).sort((a, b) => a - b),
    [events]
  )
  const filteredEvents = useMemo(
    () =>
      events.filter(event => {
        if (academicYear && event.academic_year !== academicYear) return false
        if (category && event.category !== category) return false
        if (
          semester &&
          event.semester !== null &&
          event.semester !== Number(semester)
        ) {
          return false
        }
        if (
          month &&
          (event.end_date < `${month}-01` ||
            event.start_date > monthEnd(month))
        ) {
          return false
        }
        return true
      }),
    [academicYear, category, events, month, semester]
  )
  const monthLabel = month
    ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "All dates"
  const moveMonth = (offset: number) => {
    const selected = month || new Date().toISOString().slice(0, 7)
    const [year, numericMonth] = selected.split("-").map(Number)
    const next = new Date(year, numericMonth - 1 + offset, 1)
    setMonth(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
    )
  }
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-[14px] font-medium text-[#64748B]">
          Academic Year {academicYear || years[0] || "Not specified"}
          <span className="ml-3 text-[12px] text-[#94A3B8]">
            {filteredEvents.length} calendar entries
          </span>
        </div>
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1D4ED8]"
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Event
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {years.length > 1 && (
          <select
            aria-label="Filter by academic year"
            value={academicYear}
            onChange={event => setAcademicYear(event.target.value)}
            className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[12px] text-[#334155]"
          >
            <option value="">All academic years</option>
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Filter by calendar category"
          value={category}
          onChange={event => setCategory(event.target.value)}
          className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[12px] text-[#334155]"
        >
          <option value="">All categories</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {semesters.length > 1 && (
          <select
            aria-label="Filter by semester"
            value={semester}
            onChange={event => setSemester(event.target.value)}
            className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[12px] text-[#334155]"
          >
            <option value="">All semesters</option>
            {semesters.map(value => (
              <option key={value} value={value}>
                Semester {value}
              </option>
            ))}
          </select>
        )}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white p-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => moveMonth(-1)}
            className="h-8 w-8 rounded-md text-[#64748B] hover:bg-[#F1F5F9]"
          >
            ‹
          </button>
          <span className="min-w-[115px] text-center text-[12px] font-medium text-[#334155]">
            {monthLabel}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => moveMonth(1)}
            className="h-8 w-8 rounded-md text-[#64748B] hover:bg-[#F1F5F9]"
          >
            ›
          </button>
          {month && (
            <button
              type="button"
              onClick={() => setMonth("")}
              className="px-2 text-[11px] font-medium text-[#2563EB] hover:underline"
            >
              All dates
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-10 text-center text-[13px] text-[#64748B]">
          Loading academic calendar…
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-10 text-center text-[13px] text-[#64748B]">
          {events.length === 0
            ? "No academic calendar entries yet."
            : "No academic calendar entries match these filters."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map(event => {
            const style = categoryStyles[event.category]
            return (
              <article
                key={event.calendar_id}
                className="flex items-center gap-4 rounded-[24px] border border-[#DCE5F0] bg-white px-5 py-4 transition-shadow hover:shadow-sm"
              >
                <div className={`h-12 w-2 flex-shrink-0 rounded-full ${style.bar}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-[14px] font-semibold text-[#1E293B]">
                      {event.title}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-medium ${style.background} ${style.text}`}
                    >
                      {categoryLabels[event.category]}
                    </span>
                    {event.end_date >= today && (
                      <span className="text-[10px] font-medium text-[#16A34A]">
                        Upcoming
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-[#94A3B8]">
                    {dateRange(event)}
                    {event.semester !== null && ` · Semester ${event.semester}`}
                  </p>
                  {event.description && (
                    <p className="mt-1 whitespace-pre-wrap text-[12px] text-[#64748B]">
                      {event.description}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex flex-shrink-0 gap-1">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(event)}
                        className="px-2.5 py-1.5 text-[12px] font-medium text-[#2563EB] hover:underline"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(event)}
                        className="px-2.5 py-1.5 text-[12px] font-medium text-[#DC2626] hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
