import { useMemo, useState } from "react"
import { ArrowLeft, Award, Search } from "lucide-react"
import type {
  AdminCourse,
  AdminDepartment,
  AdminResult,
  AdminSemesterResult,
} from "../../api/academicAdmin"
import type { AdminUser } from "../../api/users"

interface Props {
  departments: AdminDepartment[]
  students: AdminUser[]
  courses: AdminCourse[]
  results: AdminSemesterResult[]
  onCreateSemesterResult: (
    studentPk: number,
    semester: number,
    academicYear: string
  ) => void
  onEditSemesterResult: (result: AdminSemesterResult) => void
  onCreateCourseResult: (
    semesterResult: AdminSemesterResult,
    courseId: string
  ) => void
  onEditCourseResult: (
    semesterResult: AdminSemesterResult,
    result: AdminResult
  ) => void
  onPublish: (academicYear: string, semester: number) => void
}

const semesterNumbers = Array.from({ length: 8 }, (_, index) => index + 1)
const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]

export default function AdminResultsWorkspace({
  departments,
  students,
  courses,
  results,
  onCreateSemesterResult,
  onEditSemesterResult,
  onCreateCourseResult,
  onEditCourseResult,
  onPublish,
}: Props) {
  const [branch, setBranch] = useState("")
  const [year, setYear] = useState("")
  const [semester, setSemester] = useState("")
  const [academicYear, setAcademicYear] = useState("")
  const [search, setSearch] = useState("")
  const [selectedStudentPk, setSelectedStudentPk] = useState<number | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null)

  const academicYears = useMemo(
    () =>
      Array.from(
        new Set([
          ...results.map((result) => result.academic_year),
          ...students
            .map((student) => student.profile?.academicYear)
            .filter((value): value is string => !!value),
        ])
      ).sort(),
    [results, students]
  )
  const studyYears = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .map((student) => student.profile?.year)
            .filter((value): value is number => value !== undefined)
        )
      ).sort((a, b) => a - b),
    [students]
  )
  const selectedStudent = students.find(
    (student) => student.profile?.studentPk === selectedStudentPk
  )
  const selectedDepartment = departments.find(
    (department) =>
      department.department_id === selectedStudent?.profile?.departmentId
  )

  const cohortStudents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return students
      .filter((student) => {
        const profile = student.profile
        if (!profile?.studentPk) return false
        if (branch && String(profile.departmentId ?? "") !== branch) return false
        if (year && String(profile.year ?? "") !== year) return false
        if (
          academicYear &&
          profile.academicYear !== academicYear &&
          !results.some(
            (result) =>
              result.student === profile.studentPk &&
              result.academic_year === academicYear
          )
        ) {
          return false
        }
        if (
          semester &&
          String(profile.sem ?? "") !== semester &&
          !results.some(
            (result) =>
              result.student === profile.studentPk &&
              String(result.sem) === semester &&
              (!academicYear || result.academic_year === academicYear)
          ) &&
          !query
        ) {
          return false
        }
        if (
          query &&
          !`${student.firstName} ${student.lastName} ${profile.rollNo ?? ""}`
            .toLowerCase()
            .includes(query)
        ) {
          return false
        }
        return true
      })
      .sort((left, right) =>
        (left.profile?.rollNo ?? "").localeCompare(right.profile?.rollNo ?? "")
      )
  }, [students, results, branch, year, semester, academicYear, search])

  const semesterResultsForStudent = selectedStudentPk
    ? results
        .filter(
          (result) =>
            result.student === selectedStudentPk &&
            (!academicYear || result.academic_year === academicYear)
        )
        .sort((left, right) => right.academic_year.localeCompare(left.academic_year))
    : []

  const resultForSelectedSemester =
    selectedSemester === null
      ? undefined
      : semesterResultsForStudent.find(
          (result) => result.sem === selectedSemester
        )

  const selectedStudentCourses =
    selectedSemester === null
      ? []
      : courses
          .filter(
            (course) =>
              course.course_sem === selectedSemester &&
              (!selectedStudent?.profile?.departmentId ||
                course.department === selectedStudent.profile.departmentId)
          )
          .sort((left, right) =>
            left.course_id.localeCompare(right.course_id)
          )

  const selectedSubjects = selectedStudentCourses.map((course) => ({
    course,
    result: resultForSelectedSemester?.results.find(
      (result) => result.course === course.course_id
    ),
  }))

  const displayTitle = selectedStudent
    ? `${selectedStudent.firstName} ${selectedStudent.lastName}`.trim()
    : "Students"

  return (
    <div className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 px-6 py-5 text-white shadow-sm">
        <div className="flex items-center gap-3">
          {(selectedStudent || selectedSemester !== null) && (
            <button
              type="button"
              onClick={() => {
                if (selectedSemester !== null) setSelectedSemester(null)
                else setSelectedStudentPk(null)
              }}
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200">
              Academic Management · Results
            </p>
            <h2 className="mt-1 text-xl font-bold">{displayTitle}</h2>
            <p className="mt-1 text-xs text-indigo-200">
              {selectedStudent
                ? `${selectedStudent.profile?.rollNo ?? "—"} · ${
                    selectedDepartment?.department_name ?? "Department"
                  }`
                : "Select a cohort to manage semester results"}
              {selectedSemester !== null &&
                ` · Semester ${romanNumerals[selectedSemester - 1]}`}
            </p>
          </div>
        </div>
      </header>

      {!selectedStudent && (
        <>
          <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Branch
              <select
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium normal-case text-slate-800"
              >
                <option value="">All branches</option>
                {departments.map((department) => (
                  <option
                    key={department.department_id}
                    value={department.department_id}
                  >
                    {department.department_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Year
              <select
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium normal-case text-slate-800"
              >
                <option value="">All years</option>
                {studyYears.map((item) => (
                  <option key={item} value={item}>Year {item}</option>
                ))}
              </select>
            </label>

            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Semester
              <select
                value={semester}
                onChange={(event) => setSemester(event.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium normal-case text-slate-800"
              >
                <option value="">All semesters</option>
                {semesterNumbers.map((item) => (
                  <option key={item} value={item}>
                    Semester {romanNumerals[item - 1]}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Academic year
              <select
                value={academicYear}
                onChange={(event) => setAcademicYear(event.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium normal-case text-slate-800"
              >
                <option value="">All academic years</option>
                {academicYears.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Search student
              <span className="relative mt-1 block">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name or roll number"
                  className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs font-medium normal-case text-slate-800"
                />
              </span>
            </label>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {branch
                    ? departments.find((item) => String(item.department_id) === branch)
                        ?.department_name
                    : "All branches"}
                  {year && ` · Year ${year}`}
                  {semester && ` · Semester ${romanNumerals[Number(semester) - 1]}`}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  {cohortStudents.length} students
                </p>
              </div>
            </div>
            {cohortStudents.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">
                No students match the selected cohort.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cohortStudents.map((student) => {
                  const studentPk = student.profile?.studentPk
                  if (!studentPk) return null
                  const result = semester
                    ? results.find(
                        (item) =>
                          item.student === studentPk &&
                          String(item.sem) === semester &&
                          (!academicYear || item.academic_year === academicYear)
                      )
                    : undefined

                  return (
                    <button
                      type="button"
                      key={studentPk}
                      onClick={() => setSelectedStudentPk(studentPk)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-indigo-50/50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.firstName} {student.lastName}
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                            {student.profile?.rollNo ?? "—"}
                          </span>
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {student.profile?.department ?? "Branch unavailable"}
                          {" · Year "}
                          {student.profile?.year ?? "—"}
                          {" · Current semester "}
                          {student.profile?.sem ?? "—"}
                          {student.profile?.division &&
                            ` · Division ${student.profile.division}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          result?.is_published
                            ? "bg-emerald-50 text-emerald-700"
                            : result
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                        }`}>
                          {result?.is_published
                            ? "Published"
                            : result
                              ? "Pending"
                              : semester
                                ? "No result yet"
                                : "View semesters"}
                        </span>
                        <span className="ml-3 text-slate-400">›</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}

      {selectedStudent && selectedSemester === null && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Semester results</h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Select a semester to view its statement of marks.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {semesterNumbers.map((sem) => {
              const result = semesterResultsForStudent.find(
                (item) => item.sem === sem
              )
              return (
                <div
                  key={sem}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Semester {romanNumerals[sem - 1]}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {(result?.academic_year ?? academicYear) ||
                        selectedStudent.profile?.academicYear ||
                        "Academic year not set"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      result?.is_published
                        ? "bg-emerald-50 text-emerald-700"
                        : result
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                    }`}>
                      {result?.is_published
                        ? "Published"
                        : result
                          ? "Pending"
                          : "No result"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSemester(sem)}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      View result
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {selectedStudent && selectedSemester !== null && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 bg-gradient-to-r from-indigo-950 to-slate-900 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-300" />
                <h3 className="font-bold">
                  Semester {romanNumerals[selectedSemester - 1]} Statement of Marks
                </h3>
              </div>
              <p className="mt-1 text-xs text-indigo-200">
                Syllabus Track: {selectedStudent.profile?.scheme ?? "—"}
                {" · "}
                {resultForSelectedSemester?.academic_year ??
                  academicYear ??
                  selectedStudent.profile?.academicYear ??
                  "Academic year not set"}
              </p>
            </div>
            {resultForSelectedSemester ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                  resultForSelectedSemester.is_published
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {resultForSelectedSemester.is_published ? "Published" : "Pending publication"}
                </span>
                {!resultForSelectedSemester.is_published && (
                  <>
                    <button
                      type="button"
                      onClick={() => onEditSemesterResult(resultForSelectedSemester)}
                      className="rounded-lg bg-white/10 px-3 py-2 text-[11px] font-semibold hover:bg-white/20"
                    >
                      Edit summary
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onPublish(
                          resultForSelectedSemester.academic_year,
                          resultForSelectedSemester.sem
                        )
                      }
                      className="rounded-lg bg-indigo-500 px-3 py-2 text-[11px] font-semibold hover:bg-indigo-400"
                    >
                      Publish result
                    </button>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onCreateSemesterResult(
                    selectedStudentPk!,
                    selectedSemester,
                    academicYear || selectedStudent.profile?.academicYear || ""
                  )
                }
                className="rounded-lg bg-indigo-500 px-3 py-2 text-[11px] font-semibold hover:bg-indigo-400"
              >
                Set up semester result
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 border-b border-slate-100 bg-slate-50 p-4 sm:grid-cols-4">
            {[
              ["Seat number", selectedStudent.profile?.rollNo ?? "—"],
              ["Semester", `Semester ${romanNumerals[selectedSemester - 1]}`],
              ["Total credits", resultForSelectedSemester?.total_credits ?? "—"],
              ["SGPI score", resultForSelectedSemester?.sgpi ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-2 py-3">Sr. No.</th>
                  <th className="px-3 py-3">Name of Subject</th>
                  <th className="px-3 py-3 text-center">Passing Head</th>
                  <th className="px-3 py-3 text-center">Max Marks</th>
                  <th className="px-3 py-3 text-right">Obtained</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedSubjects.flatMap(({ course, result }, index) => {
                  const isLab = course.course_name.toLowerCase().includes("lab")
                  const heads = isLab
                    ? [
                        { name: "ISA", obtained: result?.isa },
                        { name: "PRA", obtained: result?.ese },
                      ]
                    : [
                        { name: "ESE", obtained: result?.ese },
                        { name: "ISA", obtained: result?.isa },
                        { name: "MSE", obtained: result?.mse },
                      ]

                  return heads.map((head, headIndex) => (
                    <tr
                      key={`${course.course_id}-${head.name}`}
                      className="hover:bg-indigo-50/30"
                    >
                      <td className="px-2 py-3 font-mono font-bold text-slate-500">
                        {index + 1}-{course.course_id}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-bold text-slate-900">{course.course_name}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {course.credits} credits
                        </p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                          {head.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-500">—</td>
                      <td className="px-3 py-3 text-right font-bold">
                        {head.obtained ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {headIndex === 0 &&
                          (!resultForSelectedSemester?.is_published &&
                            (result && resultForSelectedSemester ? (
                              <button
                                type="button"
                                onClick={() => onEditCourseResult(resultForSelectedSemester, result)}
                                className="font-semibold text-indigo-700 hover:underline"
                              >
                                Edit marks
                              </button>
                            ) : resultForSelectedSemester ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onCreateCourseResult(resultForSelectedSemester, course.course_id)
                                }
                                className="font-semibold text-indigo-700 hover:underline"
                              >
                                Add marks
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                Create semester first
                              </span>
                            )))}
                        {headIndex === 0 && resultForSelectedSemester?.is_published && (
                          <span className="text-[10px] text-slate-400">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))
                })}
                {selectedSubjects.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      No courses are configured for this branch and semester.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
