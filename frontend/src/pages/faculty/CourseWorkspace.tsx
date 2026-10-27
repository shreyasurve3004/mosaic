
import { useEffect, useState } from "react"
import {
  getFacultyCourses,
  getFacultyCourseStudents,
  type FacultyCourse,
  type FacultyStudent,
} from "../../api/faculty"

interface Props {
  courseId: number
  onBack: () => void
  onNavigate: (page: string) => void
}

const palette = [
  { color: "#2563EB", bg: "#EFF6FF" },
  { color: "#9333EA", bg: "#FDF4FF" },
  { color: "#F97316", bg: "#FFF7ED" },
  { color: "#16A34A", bg: "#F0FDF4" },
]

export default function CourseWorkspace({
  courseId,
  onBack,
}: Props) {
  const [facultyCourse, setFacultyCourse] =
    useState<FacultyCourse | null>(null)

  const [students, setStudents] =
    useState<FacultyStudent[]>([])

  const [loadingCourse, setLoadingCourse] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)

  const [courseError, setCourseError] = useState("")
  const [studentError, setStudentError] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadCourse() {
      setLoadingCourse(true)
      setCourseError("")
      setFacultyCourse(null)
      setStudents([])
      setStudentError("")

      try {
        const courses = await getFacultyCourses()

        if (cancelled) return

        const selectedCourse = courses.find(
          course => course.faculty_course_id === courseId
        )

        if (!selectedCourse) {
          throw new Error(
            "This course was not found in your assigned courses."
          )
        }

        setFacultyCourse(selectedCourse)
      } catch (error) {
        if (cancelled) return

        setCourseError(
          error instanceof Error
            ? error.message
            : "Unable to load the course."
        )
      } finally {
        if (!cancelled) {
          setLoadingCourse(false)
        }
      }
    }

    void loadCourse()

    return () => {
      cancelled = true
    }
  }, [courseId])

  useEffect(() => {
    if (!facultyCourse) return

    let cancelled = false

    async function loadStudents() {
      setLoadingStudents(true)
      setStudentError("")
      setStudents([])

      try {
        const result = await getFacultyCourseStudents(
          facultyCourse!.faculty_course_id
        )

        if (cancelled) return

        setStudents(result)
      } catch (error) {
        if (cancelled) return

        setStudentError(
          error instanceof Error
            ? error.message
            : "Unable to load students for this course."
        )
      } finally {
        if (!cancelled) {
          setLoadingStudents(false)
        }
      }
    }

    void loadStudents()

    return () => {
      cancelled = true
    }
  }, [facultyCourse])

  const theme = facultyCourse
    ? palette[
        facultyCourse.faculty_course_id % palette.length
      ]
    : palette[0]

  const filteredStudents = students.filter(student => {
    const query = search.trim().toLowerCase()

    if (!query) return true

    return (
      student.student_name.toLowerCase().includes(query) ||
      student.roll_no.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query)
    )
  })

  if (loadingCourse) {
    return (
      <div className="p-6 text-[13px] text-[#64748B]">
        Loading course…
      </div>
    )
  }

  if (courseError || !facultyCourse) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-[12px] text-[#64748B] hover:text-[#1E293B]"
        >
          ← My Courses
        </button>

        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5"
        >
          <h2 className="text-[14px] font-semibold text-red-800">
            Unable to open course
          </h2>

          <p className="mt-2 text-[13px] text-red-700">
            {courseError || "Course data is unavailable."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex-shrink-0 border-b border-[#E2E8F0] bg-white px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 flex items-center gap-1.5 text-[12px] text-[#64748B] transition-colors hover:text-[#1E293B]"
        >
          <svg
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M19 12H5M5 12l7 7M5 12l7-7" />
          </svg>
          My Courses
        </button>

        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: theme.bg }}
          >
            <svg
              width="17"
              height="17"
              fill="none"
              stroke={theme.color}
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
          </div>

          <div className="min-w-0">
            <h1 className="text-[16px] font-bold text-[#1E293B]">
              {facultyCourse.course_name}
            </h1>

            <p className="mt-1 text-[12px] text-[#64748B]">
              {facultyCourse.course_code}
              {" · "}Year {facultyCourse.year}
              {" · "}Semester {facultyCourse.sem}
              {" · "}Division {facultyCourse.div}
            </p>

            <p className="mt-1 text-[11px] text-[#94A3B8]">
              Academic year: {facultyCourse.academic_year}
              {" · "}Class: {facultyCourse.class_type}
              {facultyCourse.batch
                ? ` · Batch ${facultyCourse.batch}`
                : ""}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 md:p-6">
        <section className="mx-auto max-w-[1200px]">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#1E293B]">
                Enrolled Students
              </h2>
              <p className="mt-1 text-[12px] text-[#64748B]">
                Students returned by the course roster API.
              </p>
            </div>

            {!loadingStudents && !studentError && students.length > 0 && (
              <label className="block">
                <span className="sr-only">Search students</span>
                <input
                  type="search"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search by name, roll no. or email"
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] text-[#1E293B] outline-none transition focus:border-blue-500 sm:w-[280px]"
                />
              </label>
            )}
          </div>

          {loadingStudents && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 text-[13px] text-[#64748B]">
              Loading students…
            </div>
          )}

          {!loadingStudents && studentError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-5"
            >
              <h3 className="text-[13px] font-semibold text-red-800">
                Could not load students
              </h3>
              <p className="mt-2 text-[12px] text-red-700">
                {studentError}
              </p>
              <button
                type="button"
                onClick={() => {
                  setFacultyCourse(current =>
                    current ? { ...current } : null
                  )
                }}
                className="mt-3 rounded-lg border border-red-300 px-3 py-2 text-[12px] font-medium text-red-800 hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          )}

          {!loadingStudents &&
            !studentError &&
            students.length === 0 && (
              <div className="rounded-xl border border-[#E2E8F0] bg-white px-5 py-12 text-center">
                <h3 className="text-[13px] font-semibold text-[#334155]">
                  No students found
                </h3>
                <p className="mt-2 text-[12px] text-[#64748B]">
                  The backend returned no students for this course.
                </p>
              </div>
            )}

          {!loadingStudents &&
            !studentError &&
            students.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
                <div className="border-b border-[#F1F5F9] px-5 py-3">
                  <p className="text-[12px] text-[#64748B]">
                    {filteredStudents.length} student
                    {filteredStudents.length === 1 ? "" : "s"}
                    {search.trim() ? " matching your search" : ""}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC]">
                        {[
                          "Roll No.",
                          "Student Name",
                          "Email",
                          "Year",
                          "Semester",
                          "Division",
                        ].map(heading => (
                          <th
                            key={heading}
                            className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F1F5F9]">
                      {filteredStudents.map(student => (
                        <tr
                          key={student.roll_no}
                          className="transition-colors hover:bg-[#F8FAFC]"
                        >
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[12px] text-[#64748B]">
                            {student.roll_no}
                          </td>

                          <td className="px-5 py-3.5 text-[12px] font-medium text-[#1E293B]">
                            {student.student_name}
                          </td>

                          <td className="px-5 py-3.5 text-[12px] text-[#64748B]">
                            {student.email || "Not provided"}
                          </td>

                          <td className="px-5 py-3.5 text-[12px] text-[#64748B]">
                            {student.year}
                          </td>

                          <td className="px-5 py-3.5 text-[12px] text-[#64748B]">
                            {student.sem}
                          </td>

                          <td className="px-5 py-3.5 text-[12px] text-[#64748B]">
                            {student.div}
                          </td>
                        </tr>
                      ))}

                      {filteredStudents.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-10 text-center text-[12px] text-[#64748B]"
                          >
                            No students match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </section>
      </main>
    </div>
  )
}
