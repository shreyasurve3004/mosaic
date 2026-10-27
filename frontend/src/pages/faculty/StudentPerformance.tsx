// src/pages/faculty/StudentPerformance.tsx

import { useEffect, useState } from "react"
import {
  getFacultyStudentPerformance,
  type StudentPerformance as StudentPerformanceData,
} from "../../api/faculty"

const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
  good: { bg: "#F0FDF4", text: "#16A34A", label: "Good" },
  warn: { bg: "#FFF7ED", text: "#F97316", label: "Watch" },
  alert: { bg: "#FEF2F2", text: "#DC2626", label: "At Risk" },
}

function BarChart({
  data,
}: {
  data: { label: string; value: number; color: string }[]
}) {
  const max = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="flex items-end gap-2 h-32">
      {data.map(d => (
        <div
          key={d.label}
          className="flex flex-col items-center gap-1 flex-1"
        >
          <div
            className="text-[10px] font-semibold"
            style={{ color: d.color }}
          >
            {d.value}%
          </div>

          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${(d.value / max) * 96}px`,
              backgroundColor: d.color,
              opacity: 0.85,
            }}
          />

          <div className="text-[9px] text-[#94A3B8] text-center leading-tight">
            {d.label}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function StudentPerformance() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

  const [computed, setComputed] = useState<StudentPerformanceData[]>([])

  const [courseAverages, setCourseAverages] = useState<
    { label: string; value: number; color: string }[]
  >([])

  const [attendanceBuckets, setAttendanceBuckets] = useState<
    {
      label: string
      min: number
      val: number
      pct: number
      color: string
    }[]
  >([])

  useEffect(() => {
    loadPerformance()
  }, [])

  async function loadPerformance() {
    try {
      const data = await getFacultyStudentPerformance()

      setComputed(data.students)
      setCourseAverages(data.courseAverages)
      setAttendanceBuckets(data.attendanceBuckets)
    } catch (error) {
      console.error("Failed to load student performance:", error)
    }
  }

  const filtered = computed.filter(s => {
    const matchQ =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(search.toLowerCase())

    const matchF = filter === "all" || s.status === filter

    return matchQ && matchF
  })

  const atRisk = computed.filter(
    s => s.status === "alert"
  ).length

  const watching = computed.filter(
    s => s.status === "warn"
  ).length

  const performing = computed.filter(
    s => s.status === "good"
  ).length

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
          Student Performance
        </h1>

        <p className="text-[13px] text-[#64748B] mt-0.5">
          Analytics across all your courses
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Students",
            val: computed.length,
            color: "#2563EB",
            bg: "#EFF6FF",
            border: "#BFDBFE",
          },
          {
            label: "Good Standing",
            val: performing,
            color: "#16A34A",
            bg: "#F0FDF4",
            border: "#BBF7D0",
          },
          {
            label: "Needs Attention",
            val: watching,
            color: "#F97316",
            bg: "#FFF7ED",
            border: "#FED7AA",
          },
          {
            label: "At Risk",
            val: atRisk,
            color: "#DC2626",
            bg: "#FEF2F2",
            border: "#FECACA",
          },
        ].map(c => (
          <div
            key={c.label}
            className="bg-white rounded-xl border p-4"
            style={{ borderColor: c.border }}
          >
            <div
              className="text-[26px] font-bold"
              style={{ color: c.color }}
            >
              {c.val}
            </div>

            <div className="text-[12px] text-[#64748B] mt-0.5">
              {c.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h3 className="text-[13px] font-semibold text-[#1E293B] mb-4">
            Avg. Class Performance (Graded)
          </h3>

          {courseAverages.length > 0 ? (
            <BarChart data={courseAverages} />
          ) : (
            <div className="text-[12px] text-[#94A3B8] py-8 text-center">
              No graded assignments yet
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h3 className="text-[13px] font-semibold text-[#1E293B] mb-4">
            Attendance Distribution
          </h3>

          <div className="flex flex-col gap-2.5 mt-2">
            {attendanceBuckets.map(r => (
              <div
                key={r.label}
                className="flex items-center gap-2.5"
              >
                <span className="text-[11px] text-[#64748B] w-14 flex-shrink-0">
                  {r.label}
                </span>

                <div className="flex-1 h-2 rounded-full bg-[#F1F5F9]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${r.pct}%`,
                      backgroundColor: r.color,
                    }}
                  />
                </div>

                <span className="text-[11px] font-medium text-[#1E293B] w-6 flex-shrink-0">
                  {r.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top + at-risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h3 className="text-[13px] font-semibold text-[#1E293B] mb-3">
            Top Performing Students
          </h3>

          {computed
            .filter(s => s.status === "good" && s.hasGrades)
            .sort((a, b) => b.avgMarks - a.avgMarks)
            .slice(0, 3)
            .map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-3 py-2.5 border-b border-[#F1F5F9] last:border-0"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{
                    backgroundColor:
                      i === 0 ? "#FFF7ED" : "#F8FAFC",
                    color: i === 0 ? "#F97316" : "#94A3B8",
                  }}
                >
                  {i + 1}
                </div>

                <div className="flex-1">
                  <div className="text-[13px] font-medium text-[#1E293B]">
                    {s.name}
                  </div>

                  <div className="text-[10px] text-[#94A3B8]">
                    {s.rollNo}
                  </div>
                </div>

                <span className="text-[14px] font-bold text-[#16A34A]">
                  {s.avgMarks}%
                </span>
              </div>
            ))}

          {computed.filter(
            s => s.status === "good" && s.hasGrades
          ).length === 0 && (
            <div className="text-[12px] text-[#94A3B8] py-3">
              No graded submissions yet
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h3 className="text-[13px] font-semibold text-[#1E293B] mb-3">
            Students Requiring Attention
          </h3>

          {computed
            .filter(s => s.status !== "good")
            .map(s => {
              const st = statusStyle[s.status]

              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 py-2.5 border-b border-[#F1F5F9] last:border-0"
                >
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-[#1E293B]">
                      {s.name}
                    </div>

                    <div className="text-[10px] text-[#94A3B8]">
                      Attendance {s.attendancePct}%
                      {s.hasGrades
                        ? ` · Marks ${s.avgMarks}%`
                        : ""}
                    </div>
                  </div>

                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: st.bg,
                      color: st.text,
                    }}
                  >
                    {st.label}
                  </span>
                </div>
              )
            })}

          {computed.filter(s => s.status !== "good").length === 0 && (
            <div className="text-[12px] text-[#94A3B8] py-3">
              Everyone's doing great 🎉
            </div>
          )}
        </div>
      </div>

      {/* Full table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center gap-3">
          <h2 className="text-[14px] font-semibold text-[#1E293B]">
            All Students
          </h2>

          <div className="relative ml-auto">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
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
              placeholder="Search..."
              className="h-8 pl-7 pr-3 rounded-lg border border-[#E2E8F0] text-[12px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            />
          </div>

          <div className="flex gap-1">
            {["all", "good", "warn", "alert"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize ${
                  filter === f
                    ? "bg-[#2563EB] text-white"
                    : "text-[#64748B] hover:bg-[#F1F5F9]"
                }`}
              >
                {f === "all"
                  ? "All"
                  : f === "good"
                    ? "Good"
                    : f === "warn"
                      ? "Watch"
                      : "At Risk"}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F1F5F9]">
              {[
                "Roll No.",
                "Name",
                "Attendance",
                "Avg. Marks",
                "Assignments",
                "Status",
              ].map(h => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F1F5F9]">
            {filtered.map(s => {
              const st = statusStyle[s.status]

              return (
                <tr
                  key={s.id}
                  className="hover:bg-[#F8FAFC] transition-colors"
                >
                  <td className="px-5 py-3.5 text-[12px] font-mono text-[#64748B]">
                    {s.rollNo}
                  </td>

                  <td className="px-5 py-3.5 text-[13px] font-medium text-[#1E293B]">
                    {s.name}
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 rounded-full bg-[#F1F5F9]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${s.attendancePct}%`,
                            backgroundColor:
                              s.attendancePct >= 75
                                ? "#16A34A"
                                : "#F97316",
                          }}
                        />
                      </div>

                      <span className="text-[12px] text-[#64748B]">
                        {s.attendancePct}%
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 text-[13px] font-medium text-[#1E293B]">
                    {s.hasGrades ? `${s.avgMarks}%` : "—"}
                  </td>

                  <td className="px-5 py-3.5 text-[12px] text-[#64748B]">
                    {s.completed}/{s.total}
                  </td>

                  <td className="px-5 py-3.5">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: st.bg,
                        color: st.text,
                      }}
                    >
                      {st.label}
                    </span>
                  </td>
                </tr>
              )
            })}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10 text-[13px] text-[#94A3B8]"
                >
                  No students match your search
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}