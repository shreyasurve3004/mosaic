import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../store/AuthContext"
import {
  getStudentAttendance,
  getStudentProfile,
  getStudentResources,
  getStudentResults,
  getStudentTimetable,
  type AttendanceSummary,
  type ResourceItem,
  type StudentResourceCourse,
  type StudentResourcesResponse,
  type SemesterResult,
  type StudentProfile,
  type StudentTimetableItem,
} from "../api/academics"
import { downloadFile, previewFile } from "../api/files"
import { useToast } from "../components/ui/ToastContext"
import {
  Folder,
  ChevronRight,
  FileText,
  Download,
  Layers,
  ArrowLeft,
  Search,
  HardDrive,
  User,
  X,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"

const tabs = ["Attendance", "Timetable", "Resources", "Results"]

const RESOURCE_CATEGORIES = [
  "Study Material",
  "PPT / Notes",
  "E-Books",
  "Assignments",
  "Practical",
  "Tutorials",
  "Syllabus",
  "Question Papers",
  "MSE",
  "ESE",
  "Other",
]

const RESOURCE_DIVISIONS = ["A", "B", "C"] as const

interface ResourceFile {
  id: string
  title: string
  fileName: string
  resourceType: string
  uploadedAt: string
  uploadedBy: string
  fileUrl: string
  division?: string
}

interface ResourceCategory {
  name: string
  files: ResourceFile[]
  divisions: Record<string, ResourceFile[]>
}

type ResourceLevel =
  | "COURSES"
  | "CATEGORY"
  | "DIVISION"
  | "FILES"

interface SelectedResourcePath {
  course: StudentResourceCourse | null
  category: ResourceCategory | null
  division: string | null
}

interface ResultModalData {
  result: SemesterResult
}

function formatTime(time: string) {
  if (!time) return ""

  const [hoursString, minutesString] = time.split(":")
  const hours = Number(hoursString)
  const minutes = Number(minutesString)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time
  }

  const period = hours >= 12 ? "PM" : "AM"
  const displayHour = hours % 12 || 12

  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`
}

function formatDate(date: string) {
  if (!date) return "-"

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function normalizeResourceCategory(value: string) {
  const normalized = value.trim().toLowerCase()

  const categoryMap: Record<string, string> = {
    "study material": "Study Material",
    study_material: "Study Material",

    "ppt / notes": "PPT / Notes",
    "ppt/notes": "PPT / Notes",
    ppt_notes: "PPT / Notes",

    "e-books": "E-Books",
    ebooks: "E-Books",
    "e books": "E-Books",

    assignments: "Assignments",
    assignment: "Assignments",

    practical: "Practical",
    practicals: "Practical",

    tutorials: "Tutorials",
    tutorial: "Tutorials",

    syllabus: "Syllabus",

    "question papers": "Question Papers",
    question_papers: "Question Papers",
    "question paper": "Question Papers",

    mse: "MSE",
    ese: "ESE",
    other: "Other",
  }

  return categoryMap[normalized] ?? value
}

function getFileType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase()

  if (!extension) return "FILE"

  if (extension === "pdf") return "PDF"
  if (extension === "ppt" || extension === "pptx") return "PPT"
  if (extension === "doc" || extension === "docx") return "DOC"
  if (extension === "xls" || extension === "xlsx") return "XLS"
  if (extension === "zip" || extension === "rar") return "ZIP"
  if (extension === "mp4" || extension === "mov" || extension === "avi") {
    return "VIDEO"
  }

  return extension.toUpperCase()
}

function buildResourceCategories(resources: ResourceItem[]): ResourceCategory[] {
  return RESOURCE_CATEGORIES.map((name) => {
    const categoryResources = resources.filter(
      (resource) => normalizeResourceCategory(resource.resource_type) === name
    )
    const files: ResourceFile[] = categoryResources.map((resource) => ({
      id: String(resource.resource_id),
      title: resource.title,
      fileName: resource.original_file_name || resource.title,
      resourceType: name,
      uploadedAt: resource.upload_date,
      uploadedBy: resource.faculty_name,
      fileUrl: resource.file_url,
      division:
        resource.resource_division === "A" ||
        resource.resource_division === "B" ||
        resource.resource_division === "C"
          ? resource.resource_division
          : undefined,
    }))
    const divisions: Record<string, ResourceFile[]> = {}

    if (name === "PPT / Notes") {
      for (const division of RESOURCE_DIVISIONS) {
        divisions[`Division ${division}`] = []
      }

      for (const file of files) {
        const division = (file.division ?? "")
          .trim()
          .replace(/^division\s*/i, "")
          .toUpperCase()
        const divisionName = `Division ${division}`

        if (divisionName in divisions) {
          divisions[divisionName].push(file)
        }
      }
    }

    return {
      name,
      files: name === "PPT / Notes" ? [] : files,
      divisions,
    }
  })
}

export default function Academics() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [tab, setTab] = useState("Attendance")

  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [attendance, setAttendance] = useState<AttendanceSummary[]>([])
  const [timetable, setTimetable] = useState<StudentTimetableItem[]>([])
  const [resources, setResources] =
    useState<StudentResourcesResponse | null>(null)
  const [results, setResults] = useState<SemesterResult[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [selectedResultIds, setSelectedResultIds] = useState<number[]>([])
  const [activeModalResult, setActiveModalResult] =
    useState<ResultModalData | null>(null)

  const [resourcePath, setResourcePath] = useState<SelectedResourcePath>({
    course: null,
    category: null,
    division: null,
  })

  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    let mounted = true

    async function loadAcademics() {
      setLoading(true)
      setError("")

      try {
        const [
          studentResponse,
          attendanceResponse,
          timetableResponse,
          resourcesResponse,
          resultsResponse,
        ] = await Promise.all([
          getStudentProfile(),
          getStudentAttendance(),
          getStudentTimetable(),
          getStudentResources(),
          getStudentResults(),
        ])

        if (!mounted) return

        setStudent(studentResponse)
        setAttendance(attendanceResponse.summary || [])
        setTimetable(timetableResponse || [])
        setResources(resourcesResponse)
        setResults(resultsResponse || [])
      } catch (err) {
        if (!mounted) return

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load academic information."
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadAcademics()

    return () => {
      mounted = false
    }
  }, [])

  const resourceCourses = resources?.courses ?? []
  const selectedCourse = resourcePath.course
  const selectedCategory = resourcePath.category
  const selectedDivision = resourcePath.division
  const categoriesForSelectedCourse = useMemo(
    () => buildResourceCategories(selectedCourse?.resources ?? []),
    [selectedCourse]
  )

  const activeResourceLevel: ResourceLevel = selectedDivision
    ? "FILES"
    : selectedCategory?.name === "PPT / Notes"
      ? "DIVISION"
      : selectedCategory
        ? "FILES"
        : selectedCourse
          ? "CATEGORY"
          : "COURSES"

  const timetableByDay = useMemo(() => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

    return days.map((day) => ({
      day,
      classes: timetable
        .filter((item) => item.day === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    }))
  }, [timetable])

  const handleSelectAllResults = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.checked) {
      setSelectedResultIds(
        results
          .filter((result) => result.results.length > 0)
          .map((result) => result.semester_result_id)
      )
    } else {
      setSelectedResultIds([])
    }
  }

  const handleSelectResultRow = (id: number, available: boolean) => {
    if (!available) return

    setSelectedResultIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    )
  }

  function resetToRoot() {
    setResourcePath({
      course: null,
      category: null,
      division: null,
    })
  }

  function resetToCategory() {
    setResourcePath((previous) => ({
      ...previous,
      division: null,
    }))
  }

  const filteredCourses = resourceCourses.filter((course) => {
    const query = searchQuery.trim().toLowerCase()

    return (
      !query ||
      course.course_name.toLowerCase().includes(query) ||
      course.course_id.toLowerCase().includes(query)
    )
  })

  const filteredDivisions =
    selectedCategory?.name === "PPT / Notes"
      ? RESOURCE_DIVISIONS.map((division) => [
          `Division ${division}`,
          selectedCategory.divisions[`Division ${division}`] ?? [],
        ] as [string, ResourceFile[]])
      : []

  const currentFiles =
    selectedCategory?.name === "PPT / Notes" && selectedDivision
      ? selectedCategory.divisions[selectedDivision] ?? []
      : selectedCategory?.files ?? []

  const filteredFiles = currentFiles.filter((file) => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return true

    return (
      file.title.toLowerCase().includes(query) ||
      file.uploadedBy.toLowerCase().includes(query)
    )
  })

  const resultRows = [
    ...results,
    ...Array.from({ length: 8 }, (_, index) => index + 1)
      .filter((sem) => !results.some((result) => result.sem === sem))
      .map((sem): SemesterResult => ({
        semester_result_id: -sem,
        student: 0,
        academic_year: student?.academic_year ?? "",
        sem,
        sgpi: null,
        cgpa: null,
        total_credits: 0,
        result_status: "",
        is_published: false,
        published_at: null,
        results: [],
      })),
  ].sort((a, b) => a.sem - b.sem)

  const availableResults = resultRows.filter(
    (result) => result.results.length > 0
  )

  return (
    <div className="p-6 max-w-[1400px] bg-slate-50/50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" /> Academics Dashboard
        </h1>

        <p className="text-xs text-slate-600 font-medium mt-1">
          Semester {student?.sem ?? currentUser?.sem ?? "-"} ·{" "}
          <span className="text-indigo-600 font-semibold">
            {student?.department_name ??
              currentUser?.department ??
              "Department"}
          </span>
        </p>
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex gap-1.5 mb-6 bg-white p-1.5 rounded-2xl w-fit border border-slate-200 shadow-sm">
        {tabs.map((tabName) => (
          <button
            key={tabName}
            onClick={() => setTab(tabName)}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              tab === tabName
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {tabName}
          </button>
        ))}
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-12 text-center">
          <div className="text-xs text-slate-500 font-semibold">
            Loading academic information...
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm px-6 py-10 text-center">
          <AlertCircle className="w-6 h-6 text-rose-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-rose-700">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Attendance Tab */}
          {tab === "Attendance" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Attendance Overview
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Minimum required threshold: 75%
                  </p>
                </div>

                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Active Tracking
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {attendance.length === 0 && (
                  <div className="px-6 py-12 text-center text-xs text-slate-500 font-medium">
                    No attendance recorded yet.
                  </div>
                )}

                {attendance.map((row) => (
                  <div
                    key={row.course_id}
                    className="flex items-center gap-6 px-6 py-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="w-48 text-xs font-bold text-slate-800 truncate">
                      {row.course_name}
                    </div>

                    <div className="flex-1">
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            row.percentage >= 75
                              ? "bg-emerald-500 shadow-sm shadow-emerald-200"
                              : "bg-rose-500 shadow-sm shadow-rose-200"
                          }`}
                          style={{
                            width: `${Math.min(
                              Math.max(row.percentage, 0),
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-36 shrink-0 justify-end">
                      <span className="text-xs text-slate-500 font-semibold">
                        {row.present}/{row.total_lectures} classes
                      </span>

                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-md ${
                          row.percentage >= 75
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {row.percentage}%
                      </span>
                    </div>

                    {row.percentage < 75 && row.total_lectures > 0 && (
                      <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        Low
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timetable Tab */}
          {tab === "Timetable" && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {timetableByDay.map(({ day, classes }) => (
                <div
                  key={day}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="px-4 py-3 bg-indigo-50/70 border-b border-indigo-100 text-center">
                    <span className="text-xs font-black text-indigo-900 tracking-wider uppercase">
                      {day}
                    </span>
                  </div>

                  <div className="p-3 flex flex-col gap-2.5 flex-1 bg-slate-50/30">
                    {classes.length === 0 && (
                      <div className="text-[10px] text-slate-400 font-medium text-center py-8">
                        No classes
                      </div>
                    )}

                    {classes.map((item) => (
                      <div
                        key={item.timetable_id}
                        className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all"
                      >
                        <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(item.start_time)} -{" "}
                          {formatTime(item.end_time)}
                        </div>

                        <div className="text-xs font-bold text-slate-900 leading-snug">
                          {item.course_name}
                        </div>

                        <div className="text-[10px] text-slate-500 font-medium mt-1.5 inline-block bg-slate-100 px-2 py-0.5 rounded">
                          Room {item.room_no}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resources Tab */}
          {tab === "Resources" && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-indigo-600" />
                    My Course Resources
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Semester {resources?.current_semester ?? "-"}
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search courses or files..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center flex-wrap gap-2 text-xs text-slate-600 font-medium">
                <button
                  onClick={resetToRoot}
                  className={`hover:text-indigo-600 transition-colors px-2 py-1 rounded ${activeResourceLevel === "COURSES" ? "text-indigo-600 font-black bg-indigo-50" : ""}`}
                >
                  Courses
                </button>
                {selectedCourse && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <button
                      onClick={resetToCategory}
                      className={`hover:text-indigo-600 transition-colors px-2 py-1 rounded ${activeResourceLevel === "CATEGORY" ? "text-indigo-600 font-black bg-indigo-50" : ""}`}
                    >
                      {selectedCourse.course_name}
                    </button>
                  </>
                )}
                {selectedCategory && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <button
                      onClick={() => setResourcePath((previous) => ({ ...previous, division: null }))}
                      className={`hover:text-indigo-600 transition-colors px-2 py-1 rounded ${activeResourceLevel !== "CATEGORY" ? "text-indigo-600 font-black bg-indigo-50" : ""}`}
                    >
                      {selectedCategory.name}
                    </button>
                  </>
                )}
                {selectedDivision && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-indigo-600 font-black bg-indigo-50 px-2 py-1 rounded">
                      {selectedDivision}
                    </span>
                  </>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {activeResourceLevel === "COURSES" && (
                  <div className="divide-y divide-slate-100">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                      <span>Enrolled Courses</span>
                      <span>{filteredCourses.length} Courses</span>
                    </div>
                    {filteredCourses.length === 0 && (
                      <div className="px-5 py-10 text-center text-xs text-slate-400">
                        {resourceCourses.length === 0
                          ? "No courses or resources are available for your current semester."
                          : "No courses match your search."}
                      </div>
                    )}
                    {filteredCourses.map((course) => (
                      <button
                        key={course.course_id}
                        type="button"
                        onClick={() => setResourcePath({ course, category: null, division: null })}
                        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-indigo-50/40 transition-colors group"
                      >
                        <span className="flex items-center gap-3.5">
                          <span className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                            <Layers className="w-4 h-4" />
                          </span>
                          <span>
                            <span className="block text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                              {course.course_name}
                            </span>
                            <span className="text-[10px] font-black text-indigo-700">
                              {course.course_id}
                            </span>
                          </span>
                        </span>
                        <span className="flex items-center gap-2 text-xs text-indigo-600 font-bold">
                          11 Categories
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {activeResourceLevel === "CATEGORY" && selectedCourse && (
                  <div className="divide-y divide-slate-100">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                      <span>Resource Categories</span>
                      <span>11 Categories</span>
                    </div>
                    {categoriesForSelectedCourse.map((category) => {
                      const isPptNotes = category.name === "PPT / Notes"
                      const fileCount = isPptNotes
                        ? Object.values(category.divisions).reduce((total, files) => total + files.length, 0)
                        : category.files.length
                      return (
                        <button
                          key={category.name}
                          type="button"
                          onClick={() => setResourcePath((previous) => ({ ...previous, category, division: null }))}
                          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-indigo-50/40 transition-colors group"
                        >
                          <span className="flex items-center gap-3.5">
                            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                              <Folder className="w-4 h-4" />
                            </span>
                            <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                              {category.name}
                            </span>
                          </span>
                          <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                            {fileCount} {fileCount === 1 ? "File" : "Files"}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {activeResourceLevel === "DIVISION" && selectedCategory && (
                  <div className="divide-y divide-slate-100">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                      <span>Division</span>
                      <span>Files</span>
                    </div>
                    {filteredDivisions.map(([division, files]) => (
                      <button
                        key={division}
                        type="button"
                        onClick={() => setResourcePath((previous) => ({ ...previous, division }))}
                        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-indigo-50/40 transition-colors group"
                      >
                        <span className="flex items-center gap-3.5">
                          <span className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-xs">
                            <Folder className="w-4 h-4" />
                          </span>
                          <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">{division}</span>
                        </span>
                        <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                          {files.length} {files.length === 1 ? "File" : "Files"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {activeResourceLevel === "FILES" && selectedCategory && (
                  <div>
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-700">
                        Files in <span className="text-indigo-600 font-black">{selectedCategory.name}</span>
                        {selectedDivision && <span className="text-indigo-600 font-black"> / {selectedDivision}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => selectedDivision
                          ? setResourcePath((previous) => ({ ...previous, division: null }))
                          : setResourcePath((previous) => ({ ...previous, category: null }))}
                        className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {filteredFiles.length === 0 && (
                        <div className="px-5 py-10 text-center text-xs text-slate-400">
                          {selectedCategory.name === "PPT / Notes" &&
                          selectedDivision
                            ? `No PPT/Notes available for ${selectedDivision} yet.`
                            : "No resources in this category yet."}
                        </div>
                      )}
                      {filteredFiles.map((file) => (
                        <div key={file.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3.5">
                            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shadow-xs">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-900">{file.title}</h4>
                                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {getFileType(file.title)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                                <User className="w-3 h-3 text-slate-400" />
                                Uploaded by <span className="text-slate-800 font-bold">{file.uploadedBy}</span>
                                <span>|</span>
                                {formatDate(file.uploadedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void previewFile(
                                  `/api/academics/resources/${file.id}/file/`,
                                  file.fileName
                                ).catch((error: unknown) => {
                                  showToast(
                                    error instanceof Error
                                      ? error.message
                                      : "Unable to open this resource.",
                                    "error"
                                  )
                                })
                              }}
                              disabled={!file.fileUrl}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold rounded-xl border border-indigo-200 transition-all cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Open</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void downloadFile(
                                  `/api/academics/resources/${file.id}/file/?download=1`,
                                  file.fileName
                                ).catch((error: unknown) => {
                                  showToast(
                                    error instanceof Error
                                      ? error.message
                                      : "Unable to download this resource.",
                                    "error"
                                  )
                                })
                              }}
                              disabled={!file.fileUrl}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold rounded-xl shadow-sm shadow-indigo-200 transition-all cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Tab */}
          {tab === "Results" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="px-4 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-12">
                          Sr.
                        </th>

                        <th className="px-4 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-12">
                          <input
                            type="checkbox"
                            onChange={handleSelectAllResults}
                            checked={
                              availableResults.length > 0 &&
                              selectedResultIds.length ===
                                availableResults.length
                            }
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                          />
                        </th>

                        <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Semester
                        </th>

                        <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Status
                        </th>

                        <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Syllabus Track
                        </th>

                        <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                          Marks
                        </th>

                        <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                          Approval
                        </th>

                        <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                          Print
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-xs">
                      {resultRows.map((row, index) => {
                        const available = row.results.length > 0
                        const hasSemesterResult =
                          row.semester_result_id > 0
                        const isSelected = selectedResultIds.includes(
                          row.semester_result_id
                        )

                        return (
                          <tr
                            key={row.semester_result_id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isSelected ? "bg-indigo-50/50" : ""
                            }`}
                          >
                            <td className="px-4 py-3.5 text-center text-slate-500 font-bold">
                              {index + 1}
                            </td>

                            <td className="px-4 py-3.5 text-center">
                              <input
                                type="checkbox"
                                disabled={!available}
                                checked={isSelected}
                                onChange={() =>
                                  handleSelectResultRow(
                                    row.semester_result_id,
                                    available
                                  )
                                }
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed w-4 h-4"
                              />
                            </td>

                            <td className="px-5 py-3.5 font-extrabold text-slate-900">
                              Semester {row.sem}
                            </td>

                            <td className="px-5 py-3.5">
                              {row.semester_result_id < 0 ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  Not available
                                </span>
                              ) : row.is_published ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Published
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  Pending
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-3.5">
                              <span className="text-xs font-bold text-slate-700">
                                {student?.scheme || "-"}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              {hasSemesterResult ? (
                                <button
                                  onClick={() =>
                                    setActiveModalResult({ result: row })
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-all cursor-pointer shadow-xs"
                                >
                                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                                  View
                                </button>
                              ) : (
                                <span className="text-slate-300 font-medium">
                                  -
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              {row.semester_result_id < 0 ? (
                                <span className="text-slate-300">-</span>
                              ) : (
                                <span
                                  className={`font-bold px-2.5 py-1 rounded-lg border ${
                                    row.is_published
                                      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                                      : "text-amber-600 bg-amber-50 border-amber-200"
                                  }`}
                                >
                                  {row.is_published ? "Approved" : "Pending"}
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              {available ? (
                                <button
                                  onClick={() => window.print()}
                                  className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer bg-indigo-50/50 hover:bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-100"
                                >
                                  Print
                                </button>
                              ) : (
                                <span className="text-slate-300 font-medium">
                                  Print
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Statement of Marks Modal */}
      {activeModalResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-indigo-900 to-slate-900 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10 text-indigo-300">
                  <Award className="w-5 h-5 text-indigo-400" />
                </div>

                <div>
                  <h3 className="font-black text-white text-base tracking-tight">
                    Semester {activeModalResult.result.sem} Statement of Marks
                  </h3>

                  <p className="text-xs text-indigo-200 font-medium mt-0.5">
                    Syllabus Track:{" "}
                    <span className="text-white font-bold">
                      {student?.scheme || "-"}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveModalResult(null)}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200 text-xs shrink-0">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-400 font-black uppercase text-[9px] tracking-wider block mb-0.5">
                  Academic Year
                </span>
                <span className="font-bold text-slate-900">
                  {activeModalResult.result.academic_year}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-400 font-black uppercase text-[9px] tracking-wider block mb-0.5">
                  Semester
                </span>
                <span className="font-bold text-slate-800">
                  {activeModalResult.result.sem}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-400 font-black uppercase text-[9px] tracking-wider block mb-0.5">
                  Total Credits
                </span>
                <span className="font-bold text-slate-800">
                  {activeModalResult.result.total_credits}
                </span>
              </div>

              <div className="p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-200 shadow-xs">
                <span className="text-indigo-600 font-black uppercase text-[9px] tracking-wider block mb-0.5">
                  SGPI
                </span>
                <span className="font-black text-indigo-700 text-base">
                  {activeModalResult.result.sgpi ?? "-"}
                </span>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-2 py-3">Sr. No.</th>
                      <th className="px-3 py-3">Name of Subject</th>
                      <th className="px-3 py-3 text-center">Passing Head</th>
                      <th className="px-3 py-3 text-center">Max Marks</th>
                      <th className="px-3 py-3 text-right">Obtained</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeModalResult.result.results.flatMap((subject) => {
                      const isLab = subject.course_name
                        .toLowerCase()
                        .includes("lab")
                      const components = isLab
                        ? [{ head: "ISA", marks: subject.isa }, { head: "PRA", marks: subject.ese }]
                        : [
                            { head: "ESE", marks: subject.ese },
                            { head: "ISA", marks: subject.isa },
                            { head: "MSE", marks: subject.mse },
                          ]

                      return components.map((component, index) => (
                        <tr
                          key={`${subject.result_id}-${component.head}`}
                          className="hover:bg-indigo-50/40"
                        >
                          <td className="px-2 py-3 font-mono font-bold text-slate-500">
                            {subject.course_id}
                          </td>
                          <td className="px-3 py-3 font-bold text-slate-900">
                            {subject.course_name}
                            <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                              {subject.credits} credits
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                              {component.head}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-slate-600">
                            —
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 font-black text-emerald-700">
                              {component.marks ?? "—"}
                            </span>
                          </td>
                        </tr>
                      ))
                    })}
                    {activeModalResult.result.results.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                          No subject marks have been entered for this semester yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 bg-white border-t border-slate-200 shrink-0">
              <div className="text-xs flex items-center gap-2">
                <span className="text-slate-500 font-bold">Result Status:</span>

                <span className={`font-extrabold px-3 py-1 rounded-lg border ${
                  activeModalResult.result.is_published
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : "text-amber-700 bg-amber-50 border-amber-200"
                }`}>
                  {activeModalResult.result.is_published
                    ? activeModalResult.result.result_status
                    : "Pending publication"}
                </span>
              </div>

              <button
                onClick={() => setActiveModalResult(null)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors shadow-xs cursor-pointer"
              >
                Close Marksheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}