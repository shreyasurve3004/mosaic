import { useEffect, useState } from "react"
import { useToast } from "../../components/ui/ToastContext"
import {
  getFacultyCourses,
  getFacultyCourseStudents,
  type FacultyCourse,
} from "../../api/faculty"
import { getAssignments } from "../../api/assignments"

interface CourseStats {
  studentCount: number | null
  assignmentCount: number | null
}
interface Props {
  onNavigate: (page: string) => void
  onOpenCourse: (courseId: number) => void
}

const palette = [
  { color: "#2563EB", bg: "#EFF6FF" },
  { color: "#9333EA", bg: "#FDF4FF" },
  { color: "#F97316", bg: "#FFF7ED" },
  { color: "#16A34A", bg: "#F0FDF4" },
]

export default function MyCourses({ onOpenCourse }: Props) {
  const { showToast } = useToast()

  const [myCourses, setMyCourses] = useState<FacultyCourse[]>([])
  const [courseStats, setCourseStats] = useState<Record<number, CourseStats>>({})
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true)

        const data = await getFacultyCourses()
        setMyCourses(data)
        setCourseStats(
          Object.fromEntries(
            data.map((course) => [
              course.faculty_course_id,
              { studentCount: null, assignmentCount: null },
            ])
          )
        )

        setStatsLoading(true)
        const [studentResults, assignmentsResult] = await Promise.all([
          Promise.allSettled(
            data.map((course) =>
              getFacultyCourseStudents(course.faculty_course_id)
            )
          ),
          getAssignments().then(
            (assignments) => ({ assignments }),
            (error: unknown) => ({ error })
          ),
        ])

        let metricsFailed = false
        const assignmentCounts: Record<number, number> = {}
        if ("assignments" in assignmentsResult) {
          for (const assignment of assignmentsResult.assignments) {
            assignmentCounts[assignment.faculty_course] =
              (assignmentCounts[assignment.faculty_course] ?? 0) + 1
          }
        } else {
          metricsFailed = true
          console.error(
            "Failed to load faculty course assignments:",
            assignmentsResult.error
          )
        }

        const nextStats = Object.fromEntries(
          data.map((course, index) => {
            const studentResult = studentResults[index]
            if (studentResult.status === "rejected") {
              metricsFailed = true
              console.error(
                `Failed to load enrollment for faculty course ${course.faculty_course_id}:`,
                studentResult.reason
              )
            }

            return [
              course.faculty_course_id,
              {
                studentCount:
                  studentResult.status === "fulfilled"
                    ? studentResult.value.length
                    : null,
                assignmentCount:
                  "assignments" in assignmentsResult
                    ? assignmentCounts[course.faculty_course_id] ?? 0
                    : null,
              },
            ]
          })
        )
        setCourseStats(nextStats)
        if (metricsFailed) {
          showToast(
            "Some course statistics could not be loaded. Please refresh and try again.",
            "error"
          )
        }
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Failed to load your courses.",
          "error"
        )
      } finally {
        setStatsLoading(false)
        setLoading(false)
      }
    }

    loadCourses()
  }, [showToast])

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            My Courses
          </h1>

          <p className="text-[13px] text-[#64748B] mt-0.5">
            {loading
              ? "Loading courses..."
              : `${myCourses.length} ${
                  myCourses.length === 1 ? "course" : "courses"
                }`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden animate-pulse"
            >
              <div className="h-2 bg-[#E2E8F0]" />

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="h-3 w-20 bg-[#E2E8F0] rounded mb-2" />
                    <div className="h-5 w-48 bg-[#E2E8F0] rounded mb-2" />
                    <div className="h-3 w-36 bg-[#E2E8F0] rounded" />
                  </div>

                  <div className="w-12 h-12 rounded-xl bg-[#E2E8F0]" />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[1, 2, 3].map((stat) => (
                    <div
                      key={stat}
                      className="rounded-xl p-2.5 bg-[#F8FAFC]"
                    >
                      <div className="h-4 w-8 mx-auto bg-[#E2E8F0] rounded mb-1" />
                      <div className="h-3 w-16 mx-auto bg-[#E2E8F0] rounded" />
                    </div>
                  ))}
                </div>

                <div className="h-10 bg-[#E2E8F0] rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {myCourses.map((course, i) => {
            const p = palette[i % palette.length]

            return (
              <div
                key={course.faculty_course_id}
                className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden hover:shadow-lg hover:shadow-[#0F172A]/[0.06] hover:border-opacity-50 transition-all"
                onMouseEnter={() =>
                  setHoveredId(course.faculty_course_id)
                }
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  borderColor:
                    hoveredId === course.faculty_course_id
                      ? p.color + "40"
                      : undefined,
                }}
              >
                <div
                  className="h-2"
                  style={{ backgroundColor: p.color }}
                />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-[#94A3B8] font-mono">
                          {course.course_code}
                        </span>

                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: p.bg,
                            color: p.color,
                          }}
                        >
                          Sem {course.sem}
                        </span>
                      </div>

                      <h3 className="text-[16px] font-bold text-[#1E293B] leading-snug">
                        {course.course_name}
                      </h3>

                      <div className="text-[12px] text-[#94A3B8] mt-1">
                        Year {course.year} · Division {course.div}
                        {course.batch ? ` · Batch ${course.batch}` : ""}
                      </div>
                    </div>

                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: p.bg }}
                    >
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke={p.color}
                        strokeWidth="1.8"
                        viewBox="0 0 24 24"
                      >
                        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      {
                        label: "Students Enrolled",
                        val: courseStats[course.faculty_course_id]?.studentCount,
                      },
                      {
                        label: "Assignments",
                        val: courseStats[course.faculty_course_id]?.assignmentCount,
                      },
                      {
                        label: "Academic Year",
                        val: course.academic_year,
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl p-2.5 text-center"
                        style={{ backgroundColor: p.bg }}
                      >
                        <div
                          className="text-[15px] font-bold"
                          style={{ color: p.color }}
                        >
                          {s.val ??
                            (statsLoading ? "Loading..." : "Unavailable")}
                        </div>

                        <div className="text-[10px] text-[#94A3B8] mt-0.5">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        onOpenCourse(course.faculty_course_id)
                      }
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors"
                      style={{ backgroundColor: p.color }}
                    >
                      View Course
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {myCourses.length === 0 && (
            <div className="col-span-full text-center py-16 text-[13px] text-[#94A3B8]">
              No courses assigned to you yet — ask an admin to assign one
              from Academic Management.
            </div>
          )}
        </div>
      )}
    </div>
  )
}