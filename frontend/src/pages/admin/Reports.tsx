import { useEffect, useRef, useState } from "react"
import { useToast } from "../../components/ui/ToastContext"
import {
  downloadReportCsv,
  getReport,
  getReportsOverview,
  type ReportDataMap,
  type ReportName,
  type ReportsOverview,
} from "../../api/reports"

type ReportData = ReportDataMap[ReportName]
type ReportCard = {
  id: ReportName
  title: string
  desc: string
  icon: string
  color: string
  bg: string
  border: string
}

interface SessionReport {
  id: number
  name: string
  type: string
  format: "CSV"
  size: number
  date: string
  reportId: ReportName
  filename: string
  dateFrom: string
  dateTo: string
}

const reportTypes: ReportCard[] = [
  {
    id: "students",
    title: "Student Records",
    desc: "Student roster with enrollment and personal details",
    icon: "👤",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    id: "attendance",
    title: "Attendance Report",
    desc: "Subject-wise attendance for the selected date range",
    icon: "📋",
    color: "#F97316",
    bg: "#FFF7ED",
    border: "#FED7AA",
  },
  {
    id: "results",
    title: "Results",
    desc: "Student course results and semester performance",
    icon: "📊",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    id: "assignments",
    title: "Assignments",
    desc: "Assignment submissions, pending work, and grading",
    icon: "📝",
    color: "#F97316",
    bg: "#FFF7ED",
    border: "#FED7AA",
  },
  {
    id: "faculty",
    title: "Faculty Summary",
    desc: "Faculty course assignments and timetable information",
    icon: "🎓",
    color: "#9333EA",
    bg: "#FDF4FF",
    border: "#E9D5FF",
  },
  {
    id: "library",
    title: "Library Report",
    desc: "Book inventory and borrowing activity",
    icon: "📚",
    color: "#16A34A",
    bg: "#F0FDF4",
    border: "#BBF7D0",
  },
  {
    id: "events",
    title: "Events Report",
    desc: "Events, registrations, and recorded attendance",
    icon: "🗓️",
    color: "#0891B2",
    bg: "#ECFEFF",
    border: "#A5F3FC",
  },
  {
    id: "notices",
    title: "Notices",
    desc: "Published, active, and categorized notices",
    icon: "📣",
    color: "#9333EA",
    bg: "#FDF4FF",
    border: "#E9D5FF",
  },
]

const overviewCards: Array<{
  key: keyof ReportsOverview
  label: string
  color: string
}> = [
  { key: "total_students", label: "Students", color: "#2563EB" },
  { key: "total_faculty", label: "Faculty", color: "#9333EA" },
  { key: "total_courses", label: "Courses", color: "#0891B2" },
  { key: "total_departments", label: "Departments", color: "#F97316" },
  { key: "total_books", label: "Books", color: "#16A34A" },
  { key: "total_events", label: "Events", color: "#0891B2" },
  { key: "total_notices", label: "Notices", color: "#9333EA" },
]

function countForReport(
  reportId: ReportName,
  data: ReportData | undefined
): number | undefined {
  if (!data) return undefined

  if (reportId === "students" || reportId === "faculty") {
    return "count" in data ? data.count : undefined
  }
  if (!("summary" in data)) return undefined

  const summary = data.summary
  switch (reportId) {
    case "attendance":
      return "total_classes" in summary ? summary.total_classes : undefined
    case "results":
      return "result_count" in summary ? summary.result_count : undefined
    case "assignments":
      return "total_assignments" in summary
        ? summary.total_assignments
        : undefined
    case "library":
      return "total_titles" in summary ? summary.total_titles : undefined
    case "events":
      return "total_events" in summary ? summary.total_events : undefined
    case "notices":
      return "total_notices" in summary ? summary.total_notices : undefined
    default:
      return undefined
  }
}

function countLabel(reportId: ReportName, count: number): string {
  switch (reportId) {
    case "students":
      return `${count} students`
    case "attendance":
      return `${count} attendance records`
    case "results":
      return `${count} results`
    case "assignments":
      return `${count} assignments`
    case "faculty":
      return `${count} faculty`
    case "library":
      return `${count} titles`
    case "events":
      return `${count} events`
    case "notices":
      return `${count} notices`
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.requestAnimationFrame(() => URL.revokeObjectURL(objectUrl))
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to load report data. Please try again."
}

export default function Reports() {
  const { showToast } = useToast()
  const [overview, setOverview] = useState<ReportsOverview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [reportData, setReportData] = useState<
    Partial<Record<ReportName, ReportData>>
  >({})
  const [reportCounts, setReportCounts] = useState<
    Partial<Record<ReportName, number>>
  >({})
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<ReportName | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)  
  const previewSectionRef = useRef<HTMLElement | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [downloading, setDownloading] = useState<string | null>(null)
  const [sessionReports, setSessionReports] = useState<SessionReport[]>([])

  useEffect(() => {
    let active = true
    setOverviewLoading(true)
    getReportsOverview()
      .then(data => {
        if (active) setOverview(data)
      })
      .catch(error => {
        if (active) {
          showToast(`Unable to load institutional overview: ${errorMessage(error)}`, "error")
        }
      })
      .finally(() => {
        if (active) setOverviewLoading(false)
      })

    return () => {
      active = false
    }
  }, [showToast])

  useEffect(() => {
    let active = true
    setSummaryLoading(true)

    const loadSummaries = async () => {
      const failures: string[] = []
      const results = await Promise.all(
        reportTypes.map(async report => {
          try {
            const data = await getReport(report.id, {
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
              page_size: 1,
            })
            return { reportId: report.id, data }
          } catch (error) {
            failures.push(`${report.title}: ${errorMessage(error)}`)
            return null
          }
        })
      )

      if (!active) return
      const nextCounts: Partial<Record<ReportName, number>> = {}
      for (const result of results) {
        if (!result) continue
        const count = countForReport(result.reportId, result.data)
        if (count !== undefined) nextCounts[result.reportId] = count
      }
      setReportCounts(previous => ({ ...previous, ...nextCounts }))
      if (failures.length > 0) {
        showToast(`Some report summaries could not be loaded: ${failures.join("; ")}`, "error")
      }
      setSummaryLoading(false)
    }

    void loadSummaries()
    return () => {
      active = false
    }
  }, [dateFrom, dateTo, showToast])

  
  useEffect(() => {
    if (!selectedReport) {
      setPreviewLoading(false)
      setPreviewError(null)
      return
    }

    let cancelled = false

    const loadPreview = async () => {
      setPreviewLoading(true)
      setPreviewError(null)

      setReportData(previous => {
        if (!(selectedReport in previous)) return previous

        const next = { ...previous }
        delete next[selectedReport]
        return next
      })

      try {
        const data = await getReport(selectedReport, {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page_size: 100,
        })

        if (cancelled) return

        setReportData((previous) => ({
          ...previous,
          [selectedReport]: data,
        }))

        const count = countForReport(selectedReport, data)

      if (count !== undefined) {
        setReportCounts(previous => ({
          ...previous,
          [selectedReport]: count,
        }))
      }
      } catch (error) {
        if (cancelled) return

        setPreviewError(
          error instanceof Error
            ? error.message
            : "Failed to load report preview."
        )
      } finally {
        if (!cancelled) {
          setPreviewLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [selectedReport, dateFrom, dateTo])

  useEffect(() => {
    if (selectedReport) {
      previewSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }, [selectedReport])

  const downloadCsv = async (
    report: ReportCard,
    filters: { dateFrom: string; dateTo: string },
    historyDownload = false
  ) => {
    const key = `${report.id}-${historyDownload ? "history" : "csv"}`
    setDownloading(key)
    try {
      const result = await downloadReportCsv(report.id, {
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      })
      saveBlob(result.blob, result.filename)
      const date = new Date()
      setSessionReports(previous => [
        {
          id: date.getTime() + previous.length,
          name: report.title,
          type: report.title,
          format: "CSV",
          size: result.blob.size,
          date: date.toLocaleString(),
          reportId: report.id,
          filename: result.filename,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        },
        ...previous,
      ])
      showToast(`${report.title} CSV downloaded`, "success")
    } catch (error) {
      showToast(`Unable to download ${report.title}: ${errorMessage(error)}`, "error")
    } finally {
      setDownloading(null)
    }
  }

  const previewData = selectedReport ? reportData[selectedReport] : undefined
  const previewRows: unknown[] = previewData?.records ?? []
  const firstRow = previewRows.find(isRecord)
  const previewColumns = firstRow ? Object.keys(firstRow) : []
  const previewSummary =
    previewData && "summary" in previewData ? previewData.summary : null

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">Reports</h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">Generate and export institutional reports</p>
      </div>

      <section className="mb-6" aria-label="Institutional overview">
        <h2 className="text-[14px] font-semibold text-[#1E293B] mb-3">Institutional Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {overviewCards.map(card => (
            <div key={card.key} className="bg-white rounded-xl border border-[#E2E8F0] px-4 py-3">
              <div className="text-[11px] font-medium text-[#64748B]">{card.label}</div>
              <div className="mt-1 text-[20px] font-bold" style={{ color: card.color }}>
                {overviewLoading && !overview ? (
                  <span className="inline-block w-8 h-6 rounded bg-[#F1F5F9] animate-pulse" />
                ) : (
                  overview?.[card.key] ?? "—"
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-6 flex items-center gap-4 flex-wrap">
        <span className="text-[12px] font-semibold text-[#64748B]">Date Range:</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Report date from"
            value={dateFrom}
            onChange={event => setDateFrom(event.target.value)}
            className="h-8 px-3 rounded-lg border border-[#E2E8F0] text-[12px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
          />
          <span className="text-[12px] text-[#94A3B8]">to</span>
          <input
            type="date"
            aria-label="Report date to"
            value={dateTo}
            onChange={event => setDateTo(event.target.value)}
            className="h-8 px-3 rounded-lg border border-[#E2E8F0] text-[12px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
          />
        </div>
        <span className="ml-auto text-[11px] text-[#94A3B8]">
          Applied to reports with date filtering
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {reportTypes.map(report => {
          const count = reportCounts[report.id]
          return (
            <div
              key={report.id}
              className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
              style={{ borderColor: report.border }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px]" style={{ backgroundColor: report.bg }}>
                  {report.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-[#1E293B]">{report.title}</div>
                  <div className="text-[11px] font-medium" style={{ color: report.color }}>
                    {count !== undefined
                      ? countLabel(report.id, count)
                      : summaryLoading
                        ? "Loading report data…"
                        : "Report data unavailable"}
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-[#64748B] leading-relaxed mb-4">{report.desc}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                
              <button
                type="button"
                onClick={() => {
                  setPreviewError(null)
                  setSelectedReport(report.id)
                }}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all"
              >
                Preview
              </button>

                {(["PDF", "Excel"] as const).map(format => (
                  <button
                    key={format}
                    disabled
                    title={`${format} export is not available yet`}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[#E2E8F0] text-[#94A3B8] cursor-not-allowed opacity-70"
                  >
                    {format}
                  </button>
                ))}
                <button
                  onClick={() => void downloadCsv(report, { dateFrom, dateTo })}
                  disabled={downloading !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all disabled:opacity-60 disabled:cursor-wait"
                >
                  {downloading === `${report.id}-csv` ? (
                    <>
                      <span className="animate-spin text-[10px]">⟳</span>
                      Downloading…
                    </>
                  ) : (
                    <>
                      <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      CSV
                    </>
                  )}
                </button>
              </div>
              <div className="mt-2 text-[10px] text-[#94A3B8]">PDF and Excel exports are not available</div>
            </div>
          )
        })}
      </div>

      {selectedReport && (
        <section 
        ref={previewSectionRef}
        className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden mb-8">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-[14px] font-semibold text-[#1E293B]">
                {reportTypes.find(report => report.id === selectedReport)?.title} Preview
              </h2>
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Preview from the Reports API{previewLoading ? " · Refreshing…" : ""}
              </p>
            </div>
            <button
              onClick={() => setSelectedReport(null)}
              className="text-[12px] text-[#64748B] hover:text-[#1E293B]"
            >
              Close
            </button>
          </div>
          {previewSummary && (
            <div className="flex flex-wrap gap-2 px-5 py-4 border-b border-[#F1F5F9]">
              {Object.entries(previewSummary).map(([key, value]) => (
                <span key={key} className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-[11px] text-[#64748B]">
                  <span className="font-semibold text-[#1E293B]">{key.replace(/_/g, " ")}:</span>{" "}
                  {formatCell(value)}
                </span>
              ))}
            </div>
          )}
          
          {previewLoading ? (
            <div className="px-5 py-10 text-center text-[13px] text-[#64748B]">
              Loading report preview…
            </div>
          ) : previewError ? (
            <div className="px-5 py-10 text-center text-[13px] text-[#DC2626]">
              {previewError}
            </div>
          ) : previewRows.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-[#64748B]">
              {selectedReport === "attendance"
                ? "No attendance records available"
                : selectedReport === "results"
                  ? "No results available"
                  : selectedReport === "assignments"
                    ? "No assignments available"
                    : `No ${
                        reportTypes
                          .find(report => report.id === selectedReport)
                          ?.title.toLowerCase()
                      } data available`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[#F1F5F9]">
                    {previewColumns.map(column => (
                      <th
                        key={column}
                        className="text-left px-5 py-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider whitespace-nowrap"
                      >
                        {column.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {previewRows.map((row, index) => (
                    <tr key={index} className="hover:bg-[#F8FAFC]">
                      {previewColumns.map(column => (
                        <td
                          key={column}
                          className="px-5 py-3 text-[12px] text-[#64748B] whitespace-nowrap"
                        >
                          {isRecord(row) ? formatCell(row[column]) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {previewData && previewData.count > previewRows.length && (
                <div className="px-5 py-3 text-[11px] text-[#64748B] border-t border-[#F1F5F9]">
                  Showing {previewRows.length} of {previewData.count} records. Export CSV for the full report.
                </div>
              )}
            </div>
          )}

        </section>
      )}

      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
          <div>
            <h2 className="text-[14px] font-semibold text-[#1E293B]">Generated in this session</h2>
            <p className="text-[11px] text-[#94A3B8] mt-1">This list is only stored while this page session is active</p>
          </div>
          {sessionReports.length > 0 && (
            <button
              onClick={() => setSessionReports([])}
              className="text-[12px] text-[#2563EB] font-medium hover:underline"
            >
              Clear history
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F1F5F9]">
                {["Report Name", "Type", "Format", "Size", "Downloaded", "Actions"].map(heading => (
                  <th key={heading} className="text-left px-5 py-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {sessionReports.map(report => (
                <tr key={report.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: reportTypes.find(item => item.id === report.reportId)?.color }} />
                      <span className="text-[13px] font-medium text-[#1E293B]">{report.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-[#64748B]">{report.type}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB]">{report.format}</span>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-[#64748B]">{formatBytes(report.size)}</td>
                  <td className="px-5 py-3.5 text-[12px] text-[#64748B]">{report.date}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <button
                      onClick={() => {
                        const definition = reportTypes.find(item => item.id === report.reportId)
                        if (definition) {
                          void downloadCsv(
                            definition,
                            { dateFrom: report.dateFrom, dateTo: report.dateTo },
                            true
                          )
                        }
                      }}
                      disabled={downloading !== null}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[#2563EB] hover:bg-[#EFF6FF] transition-colors disabled:opacity-60"
                    >
                      Download again
                    </button>
                    <button
                      onClick={() => setSessionReports(previous => previous.filter(item => item.id !== report.id))}
                      className="ml-2 text-[11px] px-2 py-0.5 rounded text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {sessionReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[13px] text-[#94A3B8]">
                    No reports downloaded in this session
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
