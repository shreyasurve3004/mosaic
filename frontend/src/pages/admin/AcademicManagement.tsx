import { useEffect, useMemo, useState } from "react"
import { useToast } from "../../components/ui/ToastContext"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { Field, TextInput, Select, TextArea, Button } from "../../components/ui/FormControls"
import AcademicCalendarList from "../../components/academics/AcademicCalendarList"
import AdminResultsWorkspace from "./AdminResultsWorkspace"

import {
  getAdminDepartments,
  createAdminDepartment,
  updateAdminDepartment,
  deleteAdminDepartment,
  getAdminCourses,
  createAdminCourse,
  updateAdminCourse,
  deleteAdminCourse,
  getAdminFacultyCourses,
  createAdminFacultyCourse,
  updateAdminFacultyCourse,
  deleteAdminFacultyCourse,
  getAdminTimetable,
  createAdminTimetable,
  updateAdminTimetable,
  deleteAdminTimetable,
  getAcademicCalendar,
  createAcademicCalendarEvent,
  updateAcademicCalendarEvent,
  deleteAcademicCalendarEvent,
  getAdminResults,
  createSemesterResult,
  updateSemesterResult,
  createResult,
  updateResult,
  publishSemesterResults,
  type AdminDepartment,
  type AdminCourse,
  type AdminFacultyCourse,
  type AdminTimetable,
  type AcademicCalendarEvent,
  type AdminSemesterResult,
  type AdminResult,
} from "../../api/academicAdmin"

import {
  getAdminUsers,
  type AdminUser,
} from "../../api/users"

const tabs = [
  "Departments",
  "Courses",
  "Subjects",
  "Academic Calendar",
  "Timetable",
  "Results",
]

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

const timetableWeekdays = days.slice(0, 5)

const calendarCategories = [
  { value: "semester", label: "Semester" },
  { value: "examination", label: "Examination" },
  { value: "holiday", label: "Holiday" },
  { value: "registration", label: "Registration" },
  { value: "result", label: "Result Declaration" },
  { value: "semester_break", label: "Semester Break" },
  { value: "academic_event", label: "Academic Event" },
  { value: "other", label: "Other" },
]

const classTypes = [
  { value: "lecture", label: "Lecture" },
  { value: "practical", label: "Practical" },
]

const semesterOptions = Array.from({ length: 8 }, (_, index) => index + 1)

const yearOptions = [1, 2, 3, 4]

const divisionOptions = ["A", "B", "C", "D", "E"]

const gradeOptions = [
  "O",
  "A+",
  "A",
  "B+",
  "B",
  "C",
  "D",
  "F",
]

const resultStatusOptions = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
]

function formatTimetableTime(value: string) {
  const [hourText, minuteText] = value.split(":")
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const displayHour = hour % 12 || 12

  return `${displayHour}:${String(minute).padStart(2, "0")}`
}

function getFacultyInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => !/^(mr|mrs|ms|dr|prof)\.?$/i.test(word))

  if (words.length > 1) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
  }

  return (words[0] ?? "").slice(0, 2).toUpperCase()
}

function getSubjectInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => !/^(and|of|the|for)$/i.test(word))

  if (words.length > 1) {
    return words.map((word) => word[0]).join("").toUpperCase()
  }

  return (words[0] ?? "").slice(0, 2).toUpperCase()
}

type FacultyProfile = NonNullable<AdminUser["profile"]> & {
  facultyPk?: number
}

interface DepartmentForm {
  name: string
  code: string
}

interface CourseForm {
  code: string
  name: string
  department: string
  semester: string
  credits: string
}

interface FacultyCourseForm {
  faculty: string
  course: string
  semester: string
  year: string
  division: string
  batch: string
  classType: "lecture" | "practical"
  academicYear: string
}

interface CalendarForm {
  academicYear: string
  semester: string
  title: string
  category: AcademicCalendarEvent["category"]
  startDate: string
  endDate: string
  description: string
}

interface TimetableForm {
  faculty: string
  facultyCourse: string
  room: string
  day: string
  startTime: string
  endTime: string
}

interface SemesterResultForm {
  student: string
  academicYear: string
  semester: string
  sgpi: string
  cgpa: string
  totalCredits: string
  resultStatus: string
}

interface ResultForm {
  course: string
  isa: string
  mse: string
  ese: string
  totalMarks: string
  grade: string
  gradePoint: string
}

function getSemesterLabel(sem: number) {
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]
  return `Semester ${roman[sem - 1] ?? sem}`
}

function formatDate(date: string) {
  if (!date) return "—"

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

function formatDateTime(date: string | null) {
  if (!date) return "—"

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStatusClasses(status: string) {
  switch (status.toLowerCase()) {
    case "pass":
      return "bg-[#F0FDF4] text-[#15803D]"
    case "fail":
      return "bg-[#FEF2F2] text-[#DC2626]"
    default:
      return "bg-[#F1F5F9] text-[#64748B]"
  }
}

function getGradeClasses(grade: string | null) {
  if (!grade) return "bg-[#F1F5F9] text-[#64748B]"

  if (grade === "F") {
    return "bg-[#FEF2F2] text-[#DC2626]"
  }

  if (grade === "O" || grade === "A+") {
    return "bg-[#EFF6FF] text-[#2563EB]"
  }

  return "bg-[#F0FDF4] text-[#15803D]"
}

export default function AcademicManagement() {
  const { showToast } = useToast()

  const [tab, setTab] = useState("Departments")

  const [departments, setDepartments] = useState<AdminDepartment[]>([])
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [facultyCourses, setFacultyCourses] = useState<AdminFacultyCourse[]>([])
  const [timetable, setTimetable] = useState<AdminTimetable[]>([])
  const [calendar, setCalendar] = useState<AcademicCalendarEvent[]>([])
  const [results, setResults] = useState<AdminSemesterResult[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /*
   * --------------------------------------------------------------------------
   * Department state
   * --------------------------------------------------------------------------
   */

  const [showDeptForm, setShowDeptForm] = useState(false)
  const [editingDepartment, setEditingDepartment] =
    useState<AdminDepartment | null>(null)
  const [departmentToDelete, setDepartmentToDelete] =
    useState<AdminDepartment | null>(null)

  const [deptForm, setDeptForm] = useState<DepartmentForm>({
    name: "",
    code: "",
  })

  /*
   * --------------------------------------------------------------------------
   * Course state
   * --------------------------------------------------------------------------
   */

  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourse, setEditingCourse] =
    useState<AdminCourse | null>(null)
  const [courseToDelete, setCourseToDelete] =
    useState<AdminCourse | null>(null)

  const [courseForm, setCourseForm] = useState<CourseForm>({
    code: "",
    name: "",
    department: "",
    semester: "1",
    credits: "4",
  })

  /*
   * --------------------------------------------------------------------------
   * Faculty-course / Subjects state
   * --------------------------------------------------------------------------
   */

  const [showFacultyCourseForm, setShowFacultyCourseForm] = useState(false)
  const [editingFacultyCourse, setEditingFacultyCourse] =
    useState<AdminFacultyCourse | null>(null)
  const [facultyCourseToDelete, setFacultyCourseToDelete] =
    useState<AdminFacultyCourse | null>(null)

  const [facultyCourseForm, setFacultyCourseForm] =
    useState<FacultyCourseForm>({
      faculty: "",
      course: "",
      semester: "1",
      year: "1",
      division: "A",
      batch: "",
      classType: "lecture",
      academicYear: "",
    })

  /*
   * --------------------------------------------------------------------------
   * Calendar state
   * --------------------------------------------------------------------------
   */

  const [showCalendarForm, setShowCalendarForm] = useState(false)
  const [editingCalendarEvent, setEditingCalendarEvent] =
    useState<AcademicCalendarEvent | null>(null)
  const [calendarEventToDelete, setCalendarEventToDelete] =
    useState<AcademicCalendarEvent | null>(null)

  const [calendarForm, setCalendarForm] = useState<CalendarForm>({
    academicYear: "",
    semester: "",
    title: "",
    category: "semester",
    startDate: "",
    endDate: "",
    description: "",
  })

  /*
   * --------------------------------------------------------------------------
   * Timetable state
   * --------------------------------------------------------------------------
   */

  const [showTimetableForm, setShowTimetableForm] = useState(false)
  const [editingTimetable, setEditingTimetable] =
    useState<AdminTimetable | null>(null)
  const [timetableToDelete, setTimetableToDelete] =
    useState<AdminTimetable | null>(null)
  const [timetableDepartmentFilter, setTimetableDepartmentFilter] =
    useState("")
  const [timetableSemesterFilter, setTimetableSemesterFilter] =
    useState("")
  const [timetableDivisionFilter, setTimetableDivisionFilter] =
    useState("")
  const [isEditingTimetableGrid, setIsEditingTimetableGrid] =
    useState(false)

  const [timetableForm, setTimetableForm] = useState<TimetableForm>({
    faculty: "",
    facultyCourse: "",
    room: "",
    day: "Monday",
    startTime: "",
    endTime: "",
  })

  /*
   * --------------------------------------------------------------------------
   * Results state
   * --------------------------------------------------------------------------
   */

  const [selectedResultYear, setSelectedResultYear] = useState("")
  const [selectedResultSem, setSelectedResultSem] = useState("")
  const [selectedResultDept, setSelectedResultDept] = useState("")
  const [selectedResultStudyYear, setSelectedResultStudyYear] = useState("")
  const [selectedResultDivision, setSelectedResultDivision] = useState("")
  const [selectedResultCourse, setSelectedResultCourse] = useState("")
  const [resultSearch, setResultSearch] = useState("")

  const [showSemesterResultForm, setShowSemesterResultForm] =
    useState(false)
  const [editingSemesterResult, setEditingSemesterResult] =
    useState<AdminSemesterResult | null>(null)

  const [showResultForm, setShowResultForm] = useState(false)
  const [editingResult, setEditingResult] =
    useState<{
      semesterResult: AdminSemesterResult
      result: AdminResult
    } | null>(null)

  const [semesterResultForm, setSemesterResultForm] =
    useState<SemesterResultForm>({
      student: "",
      academicYear: "",
      semester: "1",
      sgpi: "",
      cgpa: "",
      totalCredits: "",
      resultStatus: "pass",
    })

  const [resultForm, setResultForm] = useState<ResultForm>({
    course: "",
    isa: "",
    mse: "",
    ese: "",
    totalMarks: "",
    grade: "",
    gradePoint: "",
  })

  /*
   * --------------------------------------------------------------------------
   * Derived data
   * --------------------------------------------------------------------------
   */

  const facultyUsers = useMemo(
    () => users.filter((user) => user.role === "faculty"),
    [users]
  )

  const studentUsers = useMemo(
    () => users.filter((user) => user.role === "student"),
    [users]
  )

  const facultyUsersWithPk = useMemo(
    () =>
      facultyUsers.filter(
        (user) =>
          (user.profile as FacultyProfile | null)?.facultyPk !== undefined
      ),
    [facultyUsers]
  )

  const departmentCounts = useMemo(() => {
    return departments.map((department) => {
      const studentCount = studentUsers.filter(
        (user) => user.profile?.departmentId === department.department_id
      ).length

      const facultyCount = facultyUsers.filter(
        (user) => user.profile?.departmentId === department.department_id
      ).length

      const courseCount = courses.filter(
        (course) => course.department === department.department_id
      ).length

      return {
        department,
        students: studentCount,
        faculty: facultyCount,
        courses: courseCount,
      }
    })
  }, [departments, studentUsers, facultyUsers, courses])

  const rooms = useMemo(() => {
    const roomMap = new Map<string, AdminTimetable>()

    timetable.forEach((entry) => {
      if (!roomMap.has(entry.room)) {
        roomMap.set(entry.room, entry)
      }
    })

    return Array.from(roomMap.values()).sort((a, b) =>
      a.room_no.localeCompare(b.room_no)
    )
  }, [timetable])

  const timetableFaculties = useMemo(() => {
    const facultyMap = new Map<number, AdminFacultyCourse>()
    facultyCourses.forEach((item) => {
      if (!facultyMap.has(item.faculty)) {
        facultyMap.set(item.faculty, item)
      }
    })
    return Array.from(facultyMap.values()).sort((a, b) =>
      a.faculty_name.localeCompare(b.faculty_name)
    )
  }, [facultyCourses])

  const timetableSubjects = useMemo(
    () =>
      facultyCourses
        .filter(
          (item) => String(item.faculty) === timetableForm.faculty
        )
        .sort((a, b) => {
          const nameOrder = a.course_name.localeCompare(b.course_name)
          if (nameOrder !== 0) return nameOrder
          return (
            a.sem - b.sem ||
            a.div.localeCompare(b.div) ||
            a.class_type.localeCompare(b.class_type)
          )
        }),
    [facultyCourses, timetableForm.faculty]
  )

  const selectedTimetableDepartment =
    timetableDepartmentFilter ||
    String(departments[0]?.department_id ?? "")

  const departmentTimetableEntries = useMemo(
    () =>
      timetable.filter((entry) => {
        const course = courses.find(
          (item) => item.course_id === entry.course_id
        )
        return String(course?.department ?? "") === selectedTimetableDepartment
      }),
    [timetable, courses, selectedTimetableDepartment]
  )

  const timetableSemesters = useMemo(
    () =>
      Array.from(
        new Set(departmentTimetableEntries.map((entry) => entry.sem))
      ).sort((a, b) => a - b),
    [departmentTimetableEntries]
  )

  const selectedTimetableSemester =
    (timetableSemesters.some(
      (semester) => String(semester) === timetableSemesterFilter
    )
      ? timetableSemesterFilter
      : "") ||
    String(timetableSemesters[0] ?? "")

  const semesterTimetableEntries = useMemo(
    () =>
      departmentTimetableEntries.filter(
        (entry) => String(entry.sem) === selectedTimetableSemester
      ),
    [departmentTimetableEntries, selectedTimetableSemester]
  )

  const timetableDivisions = useMemo(
    () =>
      Array.from(
        new Set(semesterTimetableEntries.map((entry) => entry.div))
      ).sort((a, b) => a.localeCompare(b)),
    [semesterTimetableEntries]
  )

  const selectedTimetableDivision =
    (timetableDivisions.includes(timetableDivisionFilter)
      ? timetableDivisionFilter
      : "") ||
    timetableDivisions[0] ||
    ""

  const visibleTimetableEntries = useMemo(
    () =>
      semesterTimetableEntries.filter(
        (entry) => entry.div === selectedTimetableDivision
      ),
    [semesterTimetableEntries, selectedTimetableDivision]
  )

  const timetableTimeSlots = useMemo(() => {
    const slotMap = new Map<string, { start: string; end: string }>()

    visibleTimetableEntries.forEach((entry) => {
      const key = `${entry.start_time}|${entry.end_time}`
      slotMap.set(key, {
        start: entry.start_time,
        end: entry.end_time,
      })
    })

    return Array.from(slotMap.values()).sort((a, b) =>
      a.start.localeCompare(b.start)
    )
  }, [visibleTimetableEntries])

  const resultDepartments = useMemo(() => {
    return departments.filter((department) =>
      studentUsers.some(
        (student) =>
          student.profile?.departmentId === department.department_id
      )
    )
  }, [studentUsers, departments])

  const filteredResults = useMemo(() => {
    return results.filter((semesterResult) => {
      if (
        selectedResultYear &&
        semesterResult.academic_year !== selectedResultYear
      ) {
        return false
      }

      if (
        selectedResultSem &&
        String(semesterResult.sem) !== selectedResultSem
      ) {
        return false
      }

      if (selectedResultDept) {
        const student = studentUsers.find(
          (user) =>
            user.profile?.studentPk === semesterResult.student
        )

        if (
          String(student?.profile?.departmentId ?? "") !==
          selectedResultDept
        ) {
          return false
        }
      }

      const student = studentUsers.find(
        (user) => user.profile?.studentPk === semesterResult.student
      )
      if (
        selectedResultStudyYear &&
        String(student?.profile?.year ?? "") !== selectedResultStudyYear
      ) {
        return false
      }
      if (
        selectedResultDivision &&
        student?.profile?.division?.toLowerCase() !==
          selectedResultDivision.toLowerCase()
      ) {
        return false
      }
      if (
        selectedResultCourse &&
        !semesterResult.results.some(
          (result) => result.course_id === selectedResultCourse
        )
      ) {
        return false
      }
      const query = resultSearch.trim().toLowerCase()
      if (
        query &&
        !`${student?.firstName ?? ""} ${student?.lastName ?? ""} ${
          student?.profile?.rollNo ?? ""
        }`
          .toLowerCase()
          .includes(query)
      ) {
        return false
      }

      return true
    })
  }, [
    results,
    selectedResultYear,
    selectedResultSem,
    selectedResultDept,
    selectedResultStudyYear,
    selectedResultDivision,
    selectedResultCourse,
    resultSearch,
    studentUsers,
  ])

  const resultYears = useMemo(() => {
    return Array.from(
      new Set([
        ...results.map((result) => result.academic_year),
        ...studentUsers
          .map((student) => student.profile?.academicYear)
          .filter((year): year is string => !!year),
      ])
    ).sort()
  }, [results, studentUsers])

  const resultStudyYears = useMemo(
    () =>
      Array.from(
        new Set(
          studentUsers
            .map((student) => student.profile?.year)
            .filter((year): year is number => year !== undefined)
        )
      ).sort((a, b) => a - b),
    [studentUsers]
  )

  const resultDivisions = useMemo(
    () =>
      Array.from(
        new Set(
          studentUsers
            .map((student) => student.profile?.division)
            .filter((division): division is string => !!division)
        )
      ).sort(),
    [studentUsers]
  )

  const studentsWithoutSelectedResult = useMemo(() => {
    if (!selectedResultSem) return []

    return studentUsers.filter((student) => {
      const profile = student.profile
      if (!profile) return false
      if (
        selectedResultDept &&
        String(profile.departmentId ?? "") !== selectedResultDept
      ) {
        return false
      }
      if (
        selectedResultStudyYear &&
        String(profile.year ?? "") !== selectedResultStudyYear
      ) {
        return false
      }
      if (
        selectedResultDivision &&
        profile.division?.toLowerCase() !==
          selectedResultDivision.toLowerCase()
      ) {
        return false
      }
      if (
        selectedResultYear &&
        profile.academicYear !== selectedResultYear
      ) {
        return false
      }
      const query = resultSearch.trim().toLowerCase()
      if (
        query &&
        !`${student.firstName} ${student.lastName} ${profile.rollNo ?? ""}`
          .toLowerCase()
          .includes(query)
      ) {
        return false
      }

      const semesterResult = results.find(
        (result) =>
          result.student === student.profile?.studentPk &&
          String(result.sem) === selectedResultSem &&
          (!selectedResultYear ||
            result.academic_year === selectedResultYear)
      )
      if (semesterResult) return false

      return String(profile.sem ?? "") === selectedResultSem
    })
  }, [
    studentUsers,
    results,
    selectedResultDept,
    selectedResultStudyYear,
    selectedResultDivision,
    selectedResultYear,
    selectedResultSem,
    resultSearch,
  ])

  const resultStatistics = useMemo(() => {
    const marks = filteredResults.flatMap((semesterResult) =>
      semesterResult.results
        .filter(
          (result) =>
            !selectedResultCourse ||
            result.course_id === selectedResultCourse
        )
        .map((result) => result.total_marks)
        .filter((mark): mark is number => mark !== null)
    )

    return {
      students:
        filteredResults.length + studentsWithoutSelectedResult.length,
      passed: filteredResults.filter((result) =>
        result.result_status.toLowerCase().includes("pass")
      ).length,
      failed: filteredResults.filter((result) =>
        result.result_status.toLowerCase().includes("fail")
      ).length,
      average:
        marks.length > 0
          ? marks.reduce((total, mark) => total + mark, 0) / marks.length
          : null,
    }
  }, [filteredResults, studentsWithoutSelectedResult, selectedResultCourse])

  /*
   * --------------------------------------------------------------------------
   * Initial loading
   * --------------------------------------------------------------------------
   */

  const loadAcademicData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [
        departmentData,
        courseData,
        facultyCourseData,
        timetableData,
        calendarData,
        resultData,
        userData,
      ] = await Promise.all([
        getAdminDepartments(),
        getAdminCourses(),
        getAdminFacultyCourses(),
        getAdminTimetable(),
        getAcademicCalendar(),
        getAdminResults(),
        getAdminUsers(),
      ])

      setDepartments(departmentData)
      setCourses(courseData)
      setFacultyCourses(facultyCourseData)
      setTimetable(timetableData)
      setCalendar(calendarData)
      setResults(resultData)
      setUsers(userData)

      if (resultData.length > 0) {
        setSelectedResultYear(resultData[0].academic_year)
        setSelectedResultSem(String(resultData[0].sem))

        const firstStudent = userData.find(
          (user) =>
            user.profile?.studentPk === resultData[0].student
        )

        if (firstStudent?.profile?.departmentId !== undefined) {
          setSelectedResultDept(
            String(firstStudent.profile.departmentId)
          )
        }
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load academic management data."

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAcademicData()
  }, [])

  /*
   * --------------------------------------------------------------------------
   * Department handlers
   * --------------------------------------------------------------------------
   */

  const resetDepartmentForm = () => {
    setDeptForm({
      name: "",
      code: "",
    })
  }

  const openCreateDepartment = () => {
    setEditingDepartment(null)
    resetDepartmentForm()
    setShowDeptForm(true)
  }

  const openEditDepartment = (department: AdminDepartment) => {
    setEditingDepartment(department)
    setDeptForm({
      name: department.department_name,
      code: department.department_code,
    })
    setShowDeptForm(true)
  }

  const submitDepartment = async () => {
    if (!deptForm.name.trim() || !deptForm.code.trim()) {
      showToast("Enter a department name and code", "error")
      return
    }

    try {
      if (editingDepartment) {
        const updated = await updateAdminDepartment(
          editingDepartment.department_id,
          {
            department_name: deptForm.name.trim(),
            department_code: deptForm.code.trim().toUpperCase(),
          }
        )

        setDepartments((previous) =>
          previous.map((department) =>
            department.department_id === updated.department_id
              ? updated
              : department
          )
        )

        showToast("Department updated", "success")
      } else {
        const created = await createAdminDepartment({
          department_name: deptForm.name.trim(),
          department_code: deptForm.code.trim().toUpperCase(),
        })

        setDepartments((previous) => [...previous, created])
        showToast("Department added", "success")
      }

      setShowDeptForm(false)
      setEditingDepartment(null)
      resetDepartmentForm()
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to save department",
        "error"
      )
    }
  }

  const removeDepartment = async () => {
    if (!departmentToDelete) return

    try {
      await deleteAdminDepartment(
        departmentToDelete.department_id
      )

      setDepartments((previous) =>
        previous.filter(
          (department) =>
            department.department_id !==
            departmentToDelete.department_id
        )
      )

      showToast("Department removed", "success")
      setDepartmentToDelete(null)
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to remove department",
        "error"
      )
    }
  }

  /*
   * --------------------------------------------------------------------------
   * Course handlers
   * --------------------------------------------------------------------------
   */

  const resetCourseForm = () => {
    setCourseForm({
      code: "",
      name: "",
      department: departments[0]
        ? String(departments[0].department_id)
        : "",
      semester: "1",
      credits: "4",
    })
  }

  const openCreateCourse = () => {
    setEditingCourse(null)

    setCourseForm({
      code: "",
      name: "",
      department: departments[0]
        ? String(departments[0].department_id)
        : "",
      semester: "1",
      credits: "4",
    })

    setShowCourseForm(true)
  }

  const openEditCourse = (course: AdminCourse) => {
    setEditingCourse(course)

    setCourseForm({
      code: course.course_id,
      name: course.course_name,
      department: String(course.department),
      semester: String(course.course_sem),
      credits: String(course.credits),
    })

    setShowCourseForm(true)
  }

  const submitCourse = async () => {
    if (
      !courseForm.code.trim() ||
      !courseForm.name.trim() ||
      !courseForm.department
    ) {
      showToast(
        "Enter the course code, name and department",
        "error"
      )
      return
    }

    const semester = Number(courseForm.semester)
    const credits = Number(courseForm.credits)
    const department = Number(courseForm.department)

    if (
      !Number.isInteger(semester) ||
      semester < 1 ||
      semester > 8
    ) {
      showToast("Semester must be between 1 and 8", "error")
      return
    }

    if (!Number.isInteger(credits) || credits <= 0) {
      showToast("Credits must be a positive number", "error")
      return
    }

    try {
      if (editingCourse) {
        const updated = await updateAdminCourse(
          editingCourse.course_id,
          {
            course_name: courseForm.name.trim(),
            course_sem: semester,
            credits,
            department,
          }
        )

        setCourses((previous) =>
          previous.map((course) =>
            course.course_id === updated.course_id
              ? updated
              : course
          )
        )

        showToast("Course updated", "success")
      } else {
        const created = await createAdminCourse({
          course_id: courseForm.code.trim().toUpperCase(),
          course_name: courseForm.name.trim(),
          course_sem: semester,
          credits,
          department,
        })

        setCourses((previous) => [...previous, created])
        showToast("Course created", "success")
      }

      setShowCourseForm(false)
      setEditingCourse(null)
      resetCourseForm()
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to save course",
        "error"
      )
    }
  }

  const removeCourse = async () => {
    if (!courseToDelete) return

    try {
      await deleteAdminCourse(courseToDelete.course_id)

      setCourses((previous) =>
        previous.filter(
          (course) =>
            course.course_id !== courseToDelete.course_id
        )
      )

      showToast("Course removed", "success")
      setCourseToDelete(null)
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to remove course",
        "error"
      )
    }
  }

  /*
   * --------------------------------------------------------------------------
   * Faculty-course handlers
   * --------------------------------------------------------------------------
   */

  const resetFacultyCourseForm = () => {
    setFacultyCourseForm({
      faculty: "",
      course: "",
      semester: "1",
      year: "1",
      division: "A",
      batch: "",
      classType: "lecture",
      academicYear: "",
    })
  }

  const openCreateFacultyCourse = () => {
    setEditingFacultyCourse(null)

    setFacultyCourseForm({
      faculty: "",
      course: courses[0]?.course_id ?? "",
      semester: courses[0]
        ? String(courses[0].course_sem)
        : "1",
      year: "1",
      division: "A",
      batch: "",
      classType: "lecture",
      academicYear: "",
    })

    setShowFacultyCourseForm(true)
  }

  const openEditFacultyCourse = (
    facultyCourse: AdminFacultyCourse
  ) => {
    setEditingFacultyCourse(facultyCourse)

    setFacultyCourseForm({
      faculty: String(facultyCourse.faculty),
      course: facultyCourse.course,
      semester: String(facultyCourse.sem),
      year: String(facultyCourse.year),
      division: facultyCourse.div,
      batch: facultyCourse.batch ?? "",
      classType: facultyCourse.class_type,
      academicYear: facultyCourse.academic_year,
    })

    setShowFacultyCourseForm(true)
  }

  const submitFacultyCourse = async () => {
    if (
      !facultyCourseForm.faculty ||
      !facultyCourseForm.course ||
      !facultyCourseForm.academicYear.trim()
    ) {
      showToast(
        "Select faculty, course and academic year",
        "error"
      )
      return
    }

    if (
      facultyCourseForm.classType === "practical" &&
      !facultyCourseForm.batch.trim()
    ) {
      showToast(
        "Batch is required for practical assignments",
        "error"
      )
      return
    }

    if (
      facultyCourseForm.classType === "lecture" &&
      facultyCourseForm.batch.trim()
    ) {
      showToast(
        "Batch must be empty for lecture assignments",
        "error"
      )
      return
    }

    const faculty = Number(facultyCourseForm.faculty)

    if (!Number.isInteger(faculty)) {
      showToast("Invalid faculty selection", "error")
      return
    }

    const payload = {
      faculty,
      course: facultyCourseForm.course,
      sem: Number(facultyCourseForm.semester),
      year: Number(facultyCourseForm.year),
      div: facultyCourseForm.division.trim(),
      batch:
        facultyCourseForm.classType === "practical"
          ? facultyCourseForm.batch.trim()
          : null,
      class_type: facultyCourseForm.classType,
      academic_year: facultyCourseForm.academicYear.trim(),
    }

    try {
      if (editingFacultyCourse) {
        const updated = await updateAdminFacultyCourse(
          editingFacultyCourse.faculty_course_id,
          payload
        )

        setFacultyCourses((previous) =>
          previous.map((item) =>
            item.faculty_course_id === updated.faculty_course_id
              ? updated
              : item
          )
        )

        showToast("Subject assignment updated", "success")
      } else {
        const created = await createAdminFacultyCourse(payload)

        setFacultyCourses((previous) => [
          ...previous,
          created,
        ])

        showToast("Faculty assigned to course", "success")
      }

      setShowFacultyCourseForm(false)
      setEditingFacultyCourse(null)
      resetFacultyCourseForm()
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to save subject assignment",
        "error"
      )
    }
  }

  const removeFacultyCourse = async () => {
    if (!facultyCourseToDelete) return

    try {
      await deleteAdminFacultyCourse(
        facultyCourseToDelete.faculty_course_id
      )

      setFacultyCourses((previous) =>
        previous.filter(
          (item) =>
            item.faculty_course_id !==
            facultyCourseToDelete.faculty_course_id
        )
      )

      showToast("Subject assignment removed", "success")
      setFacultyCourseToDelete(null)
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to remove subject assignment",
        "error"
      )
    }
  }

  /*
   * --------------------------------------------------------------------------
   * Calendar handlers
   * --------------------------------------------------------------------------
   */

  const resetCalendarForm = () => {
    setCalendarForm({
      academicYear: "",
      semester: "",
      title: "",
      category: "semester",
      startDate: "",
      endDate: "",
      description: "",
    })
  }

  const openCreateCalendarEvent = () => {
    setEditingCalendarEvent(null)
    resetCalendarForm()
    setShowCalendarForm(true)
  }

  const openEditCalendarEvent = (
    event: AcademicCalendarEvent
  ) => {
    setEditingCalendarEvent(event)

    setCalendarForm({
      academicYear: event.academic_year,
      semester: event.semester?.toString() ?? "",
      title: event.title,
      category: event.category,
      startDate: event.start_date,
      endDate: event.end_date,
      description: event.description,
    })

    setShowCalendarForm(true)
  }

  const submitCalendarEvent = async () => {
    if (
      !calendarForm.academicYear.trim() ||
      !calendarForm.title.trim() ||
      !calendarForm.startDate ||
      !calendarForm.endDate
    ) {
      showToast(
        "Academic year, title and dates are required",
        "error"
      )
      return
    }

    if (calendarForm.endDate < calendarForm.startDate) {
      showToast(
        "End date cannot be before start date",
        "error"
      )
      return
    }

    try {
      const payload = {
        academic_year: calendarForm.academicYear.trim(),
        semester: calendarForm.semester
          ? Number(calendarForm.semester)
          : null,
        title: calendarForm.title.trim(),
        category: calendarForm.category,
        start_date: calendarForm.startDate,
        end_date: calendarForm.endDate,
        description: calendarForm.description.trim(),
      }

      if (editingCalendarEvent) {
        const updated = await updateAcademicCalendarEvent(
          editingCalendarEvent.calendar_id,
          payload
        )

        setCalendar((previous) =>
          previous
            .map((event) =>
              event.calendar_id === updated.calendar_id ? updated : event
            )
            .sort((a, b) => a.start_date.localeCompare(b.start_date))
        )

        showToast("Calendar event updated", "success")
      } else {
        const created = await createAcademicCalendarEvent(
          payload
        )

        setCalendar((previous) =>
          [...previous, created].sort((a, b) =>
            a.start_date.localeCompare(b.start_date)
          )
        )

        showToast("Calendar event added", "success")
      }

      setShowCalendarForm(false)
      setEditingCalendarEvent(null)
      resetCalendarForm()
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to save calendar event",
        "error"
      )
    }
  }

  const removeCalendarEvent = async () => {
    if (!calendarEventToDelete) return

    try {
      await deleteAcademicCalendarEvent(
        calendarEventToDelete.calendar_id
      )

      setCalendar((previous) =>
        previous.filter(
          (event) =>
            event.calendar_id !==
            calendarEventToDelete.calendar_id
        )
      )

      showToast("Calendar event removed", "success")
      setCalendarEventToDelete(null)
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to remove calendar event",
        "error"
      )
    }
  }

  /*
   * --------------------------------------------------------------------------
   * Timetable handlers
   * --------------------------------------------------------------------------
   */

  const resetTimetableForm = () => {
    setTimetableForm({
      faculty: "",
      facultyCourse: "",
      room: rooms[0]?.room ?? "",
      day: "Monday",
      startTime: "",
      endTime: "",
    })
  }

  const openCreateTimetable = () => {
    if (rooms.length === 0) {
      showToast(
        "No rooms are available. Add a room through the backend before creating a timetable entry.",
        "error"
      )
      return
    }

    setEditingTimetable(null)

    setTimetableForm({
      faculty: facultyCourses[0]
        ? String(facultyCourses[0].faculty)
        : "",
      facultyCourse:
        facultyCourses[0]
          ? String(facultyCourses[0].faculty_course_id)
          : "",
      room: rooms[0]?.room ?? "",
      day: "Monday",
      startTime: "",
      endTime: "",
    })

    setShowTimetableForm(true)
  }

  const openEditTimetable = (
    timetableEntry: AdminTimetable
  ) => {
    setEditingTimetable(timetableEntry)

    setTimetableForm({
      faculty:
        facultyCourses.find(
          (item) =>
            item.faculty_course_id ===
            timetableEntry.faculty_course
        )?.faculty.toString() ?? "",
      facultyCourse: String(
        timetableEntry.faculty_course
      ),
      room: timetableEntry.room,
      day: timetableEntry.day,
      startTime: timetableEntry.start_time.slice(0, 5),
      endTime: timetableEntry.end_time.slice(0, 5),
    })

    setShowTimetableForm(true)
  }

  const submitTimetable = async () => {
    if (
      !timetableForm.faculty ||
      !timetableForm.facultyCourse ||
      !timetableForm.room ||
      !timetableForm.day ||
      !timetableForm.startTime ||
      !timetableForm.endTime
    ) {
      showToast(
        "Complete all timetable fields",
        "error"
      )
      return
    }

    if (timetableForm.startTime >= timetableForm.endTime) {
      showToast(
        "End time must be later than start time",
        "error"
      )
      return
    }

    try {
      const payload = {
        faculty_course: Number(
          timetableForm.facultyCourse
        ),
        room: timetableForm.room,
        day: timetableForm.day,
        start_time: timetableForm.startTime,
        end_time: timetableForm.endTime,
      }

      if (editingTimetable) {
        const updated = await updateAdminTimetable(
          editingTimetable.timetable_id,
          payload
        )

        setTimetable((previous) =>
          previous.map((entry) =>
            entry.timetable_id === updated.timetable_id
              ? updated
              : entry
          )
        )

        showToast("Timetable updated", "success")
      } else {
        const created = await createAdminTimetable(payload)

        setTimetable((previous) => [
          ...previous,
          created,
        ])

        showToast("Timetable entry created", "success")
      }

      setShowTimetableForm(false)
      setEditingTimetable(null)
      resetTimetableForm()
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to save timetable entry",
        "error"
      )
    }
  }

  const removeTimetable = async () => {
    if (!timetableToDelete) return

    try {
      await deleteAdminTimetable(
        timetableToDelete.timetable_id
      )

      setTimetable((previous) =>
        previous.filter(
          (entry) =>
            entry.timetable_id !==
            timetableToDelete.timetable_id
        )
      )

      showToast("Timetable entry removed", "success")
      setTimetableToDelete(null)
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to remove timetable entry",
        "error"
      )
    }
  }

  /*
   * --------------------------------------------------------------------------
   * Results handlers
   * --------------------------------------------------------------------------
   */

  const getStudentName = (studentId: number | string) => {
    const student = studentUsers.find(
      (user) => user.profile?.studentPk === Number(studentId)
    )

    if (!student) return "Unknown Student"

    return `${student.firstName} ${student.lastName}`.trim()
  }

  const getStudentRollNo = (studentId: number | string) => {
    return (
      studentUsers.find(
        (user) => user.profile?.studentPk === Number(studentId)
      )
        ?.profile?.rollNo ?? "—"
    )
  }

  const getStudentDepartmentId = (studentId: number | string) => {
    return studentUsers.find(
      (user) => user.profile?.studentPk === Number(studentId)
    )?.profile?.departmentId
  }

  const resetSemesterResultForm = () => {
    setSemesterResultForm({
      student: "",
      academicYear: selectedResultYear || "",
      semester: selectedResultSem || "1",
      sgpi: "",
      cgpa: "",
      totalCredits: "",
      resultStatus: "pass",
    })
  }

  const openCreateSemesterResult = (
    studentPk?: number,
    semester?: number,
    academicYear?: string
  ) => {
    setEditingSemesterResult(null)

    const selectedStudent = studentUsers.find(
      (student) => student.profile?.studentPk === studentPk
    )
    setSemesterResultForm({
      student: String(
        selectedStudent?.profile?.studentPk ??
          studentUsers[0]?.profile?.studentPk ??
          ""
      ),
      academicYear:
        academicYear ||
        selectedResultYear ||
        selectedStudent?.profile?.academicYear ||
        resultYears[0] ||
        "",
      semester:
        semester ? String(semester) :
        selectedResultSem ||
        "1",
      sgpi: "",
      cgpa: "",
      totalCredits: "",
      resultStatus: "pass",
    })

    setShowSemesterResultForm(true)
  }

  const openEditSemesterResult = (
    semesterResult: AdminSemesterResult
  ) => {
    if (semesterResult.is_published) {
      showToast(
        "Published semester results cannot be edited",
        "error"
      )
      return
    }

    setEditingSemesterResult(semesterResult)

    setSemesterResultForm({
      student: String(semesterResult.student),
      academicYear: semesterResult.academic_year,
      semester: String(semesterResult.sem),
      sgpi:
        semesterResult.sgpi !== null
          ? String(semesterResult.sgpi)
          : "",
      cgpa:
        semesterResult.cgpa !== null
          ? String(semesterResult.cgpa)
          : "",
      totalCredits:
        semesterResult.total_credits !== null
          ? String(semesterResult.total_credits)
          : "",
      resultStatus: semesterResult.result_status,
    })

    setShowSemesterResultForm(true)
  }

  const submitSemesterResult = async () => {
    if (
      !semesterResultForm.student ||
      !semesterResultForm.academicYear.trim() ||
      !semesterResultForm.semester
    ) {
      showToast(
        "Student, academic year and semester are required",
        "error"
      )
      return
    }

    const sgpi = Number(semesterResultForm.sgpi)
    const cgpa = Number(semesterResultForm.cgpa)
    const totalCredits = Number(
      semesterResultForm.totalCredits
    )

    if (
      !Number.isFinite(sgpi) ||
      sgpi < 0 ||
      sgpi > 10
    ) {
      showToast(
        "SGPI must be between 0 and 10",
        "error"
      )
      return
    }

    if (
      !Number.isFinite(cgpa) ||
      cgpa < 0 ||
      cgpa > 10
    ) {
      showToast(
        "CGPA must be between 0 and 10",
        "error"
      )
      return
    }

    if (
      !Number.isInteger(totalCredits) ||
      totalCredits < 0
    ) {
      showToast(
        "Enter a valid total credit value",
        "error"
      )
      return
    }

    try {
      const payload = {
        student: semesterResultForm.student,
        academic_year:
          semesterResultForm.academicYear.trim(),
        sem: Number(semesterResultForm.semester),
        sgpi,
        cgpa,
        total_credits: totalCredits,
        result_status:
          semesterResultForm.resultStatus,
      }

      if (editingSemesterResult) {
        const updated = await updateSemesterResult(
          editingSemesterResult.semester_result_id,
          payload
        )

        setResults((previous) =>
          previous.map((result) =>
            result.semester_result_id ===
            updated.semester_result_id
              ? updated
              : result
          )
        )

        showToast(
          "Semester result updated",
          "success"
        )
      } else {
        const created = await createSemesterResult(
          payload
        )

        setResults((previous) => [
          ...previous,
          created,
        ])

        showToast(
          "Semester result created",
          "success"
        )
      }

      setShowSemesterResultForm(false)
      setEditingSemesterResult(null)
      resetSemesterResultForm()
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to save semester result",
        "error"
      )
    }
  }

  const openCreateResult = (
    semesterResult: AdminSemesterResult,
    courseId?: string
  ) => {
    if (semesterResult.is_published) {
      showToast(
        "Published semester results cannot be edited",
        "error"
      )
      return
    }

    setEditingResult(null)

    setResultForm({
      course:
        courseId ??
        courses.find(
          (course) =>
            course.course_sem === semesterResult.sem &&
            course.department ===
              getStudentDepartmentId(semesterResult.student)
        )?.course_id ??
        "",
      isa: "",
      mse: "",
      ese: "",
      totalMarks: "",
      grade: "",
      gradePoint: "",
    })

    setEditingResult(null)
    setSelectedResultYear(
      semesterResult.academic_year
    )
    setSelectedResultSem(String(semesterResult.sem))
    setShowResultForm(true)

    /*
     * Store the semester result ID in a temporary property
     * through the editingResult state pattern below.
     */
    setResultTargetSemester(semesterResult)
  }

  const [resultTargetSemester, setResultTargetSemester] =
    useState<AdminSemesterResult | null>(null)

  const openEditResult = (
    semesterResult: AdminSemesterResult,
    result: AdminResult
  ) => {
    if (semesterResult.is_published) {
      showToast(
        "Published semester results cannot be edited",
        "error"
      )
      return
    }

    setEditingResult({
      semesterResult,
      result,
    })

    setResultTargetSemester(semesterResult)

    setResultForm({
      course: result.course,
      isa:
        result.isa !== null
          ? String(result.isa)
          : "",
      mse:
        result.mse !== null
          ? String(result.mse)
          : "",
      ese:
        result.ese !== null
          ? String(result.ese)
          : "",
      totalMarks:
        result.total_marks !== null
          ? String(result.total_marks)
          : "",
      grade: result.grade ?? "",
      gradePoint:
        result.grade_point !== null
          ? String(result.grade_point)
          : "",
    })

    setShowResultForm(true)
  }

  const submitResult = async () => {
    if (!resultTargetSemester) {
      showToast(
        "Select a semester result first",
        "error"
      )
      return
    }

    if (!resultForm.course) {
      showToast(
        "Select a course",
        "error"
      )
      return
    }

    const parseOptionalNumber = (value: string) => {
      if (value.trim() === "") return null

      const parsed = Number(value)

      return Number.isFinite(parsed)
        ? parsed
        : null
    }

    const isa = parseOptionalNumber(resultForm.isa)
    const mse = parseOptionalNumber(resultForm.mse)
    const ese = parseOptionalNumber(resultForm.ese)
    const course = courses.find(
      (item) => item.course_id === resultForm.course
    )
    const isLab = course?.course_name.toLowerCase().includes("lab") ?? false
    const totalMarksInput = parseOptionalNumber(resultForm.totalMarks)
    const gradePoint = parseOptionalNumber(
      resultForm.gradePoint
    )

    if (
      isa === null ||
      ese === null ||
      (!isLab && mse === null)
    ) {
      showToast(
        isLab
          ? "Enter both ISA and practical marks"
          : "Enter ISA, MSE and ESE marks",
        "error"
      )
      return
    }

    if (
      resultForm.isa.trim() !== "" &&
      isa === null
    ) {
      showToast("ISA must be a valid number", "error")
      return
    }

    if (
      resultForm.mse.trim() !== "" &&
      mse === null
    ) {
      showToast("MSE must be a valid number", "error")
      return
    }

    if (
      resultForm.ese.trim() !== "" &&
      ese === null
    ) {
      showToast("ESE must be a valid number", "error")
      return
    }

    if (resultForm.totalMarks.trim() !== "" && totalMarksInput === null) {
      showToast(
        "Total marks must be a valid number",
        "error"
      )
      return
    }

    if (
      resultForm.gradePoint.trim() !== "" &&
      gradePoint === null
    ) {
      showToast(
        "Grade point must be a valid number",
        "error"
      )
      return
    }

    if (!resultForm.grade || gradePoint === null) {
      showToast("Grade and grade point are required", "error")
      return
    }

    const storedMse = isLab ? 0 : mse
    const totalMarks =
      totalMarksInput ?? isa + (storedMse ?? 0) + ese

    try {
      const payload = {
        course: resultForm.course,
        isa,
        mse: storedMse,
        ese,
        total_marks: totalMarks,
        grade: resultForm.grade || null,
        grade_point: gradePoint,
      }

      if (editingResult) {
        const updated = await updateResult(
          editingResult.semesterResult.semester_result_id,
          editingResult.result.result_id,
          payload
        )

        setResults((previous) =>
          previous.map((semesterResult) => {
            if (
              semesterResult.semester_result_id !==
              editingResult.semesterResult
                .semester_result_id
            ) {
              return semesterResult
            }

            return {
              ...semesterResult,
              results: semesterResult.results.map(
                (result) =>
                  result.result_id === updated.result_id
                    ? updated
                    : result
              ),
            }
          })
        )

        showToast(
          "Course result updated",
          "success"
        )
      } else {
        const created = await createResult(
          resultTargetSemester.semester_result_id,
          payload
        )

        setResults((previous) =>
          previous.map((semesterResult) => {
            if (
              semesterResult.semester_result_id !==
              resultTargetSemester.semester_result_id
            ) {
              return semesterResult
            }

            return {
              ...semesterResult,
              results: [
                ...semesterResult.results,
                created,
              ],
            }
          })
        )

        showToast(
          "Course result added",
          "success"
        )
      }

      setShowResultForm(false)
      setEditingResult(null)
      setResultTargetSemester(null)
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to save course result",
        "error"
      )
    }
  }

  const publishResults = async (
    academicYear: string,
    semester: number
  ) => {
    try {
      await publishSemesterResults(
        academicYear,
        semester
      )

      setResults((previous) =>
        previous.map((result) =>
          result.academic_year === academicYear &&
          result.sem === semester
            ? {
                ...result,
                is_published: true,
                published_at:
                  new Date().toISOString(),
              }
            : result
        )
      )

      showToast(
        `${getSemesterLabel(semester)} results published`,
        "success"
      )
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to publish results",
        "error"
      )
    }
  }

  /*
   * --------------------------------------------------------------------------
   * Loading / error states
   * --------------------------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="flex items-center justify-center min-h-[420px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[13px] text-[#64748B]">
              Loading academic management...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="bg-white rounded-xl border border-[#FECACA] p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mx-auto mb-3">
            !
          </div>

          <h2 className="text-[15px] font-semibold text-[#1E293B]">
            Unable to load academic data
          </h2>

          <p className="text-[12px] text-[#64748B] mt-1 mb-4">
            {error}
          </p>

          <Button
            variant="primary"
            onClick={loadAcademicData}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            Academic Management
          </h1>

          <p className="text-[13px] text-[#64748B] mt-0.5">
            Manage departments, courses, subjects, timetables,
            calendar and student results
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tabs                                                               */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex gap-1 mb-6 bg-[#F1F5F9] rounded-xl p-1 w-fit flex-wrap">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap ${
              tab === item
                ? "bg-white text-[#1E293B] shadow-sm"
                : "text-[#64748B] hover:text-[#1E293B]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* DEPARTMENTS                                                        */}
      {/* ================================================================== */}

      {tab === "Departments" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[13px] text-[#64748B]">
              {departments.length} departments
            </div>

            <button
              onClick={openCreateDepartment}
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

              Add Department
            </button>
          </div>

          {departments.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-10 text-center">
              <p className="text-[13px] text-[#64748B]">
                No departments found.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {departmentCounts.map(
                ({
                  department,
                  students,
                  faculty,
                  courses: courseCount,
                }) => (
                  <div
                    key={department.department_id}
                    className="bg-white rounded-xl border border-[#E2E8F0] p-5 hover:border-[#CBD5E1] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-[13px] font-bold mb-3">
                          {department.department_code
                            .slice(0, 3)
                            .toUpperCase()}
                        </div>

                        <h3 className="text-[14px] font-semibold text-[#1E293B]">
                          {department.department_name}
                        </h3>

                        <p className="text-[11px] text-[#94A3B8] mt-0.5">
                          {department.department_code}
                        </p>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            openEditDepartment(
                              department
                            )
                          }
                          className="w-8 h-8 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#2563EB]"
                          title="Edit department"
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            className="mx-auto"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>

                        <button
                          onClick={() =>
                            setDepartmentToDelete(
                              department
                            )
                          }
                          className="w-8 h-8 rounded-lg text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                          title="Delete department"
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            className="mx-auto"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v5" />
                            <path d="M14 11v5" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-[#F1F5F9]">
                      <div>
                        <div className="text-[17px] font-bold text-[#1E293B]">
                          {students}
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">
                          Students
                        </div>
                      </div>

                      <div>
                        <div className="text-[17px] font-bold text-[#1E293B]">
                          {faculty}
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">
                          Faculty
                        </div>
                      </div>

                      <div>
                        <div className="text-[17px] font-bold text-[#1E293B]">
                          {courseCount}
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">
                          Courses
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* COURSES                                                            */}
      {/* ================================================================== */}

      {tab === "Courses" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[13px] text-[#64748B]">
              {courses.length} courses
            </div>

            <button
              onClick={openCreateCourse}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8]"
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

              Add Course
            </button>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            {courses.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-[#64748B]">
                No courses found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#94A3B8]">
                      <th className="py-3.5 px-5">
                        Course Code
                      </th>
                      <th className="py-3.5 px-5">
                        Course Name
                      </th>
                      <th className="py-3.5 px-5">
                        Department
                      </th>
                      <th className="py-3.5 px-5">
                        Semester
                      </th>
                      <th className="py-3.5 px-5">
                        Credits
                      </th>
                      <th className="py-3.5 px-5 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#F1F5F9] text-[13px] text-[#1E293B]">
                    {courses.map((course) => (
                      <tr
                        key={course.course_id}
                        className="hover:bg-[#F8FAFC]"
                      >
                        <td className="py-3.5 px-5">
                          <span className="font-mono text-[12px] font-semibold text-[#2563EB]">
                            {course.course_id}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 font-medium">
                          {course.course_name}
                        </td>

                        <td className="py-3.5 px-5">
                          <div>
                            <div className="text-[12px]">
                              {course.department_name}
                            </div>
                            <div className="text-[10px] text-[#94A3B8]">
                              {course.department_code}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          {getSemesterLabel(
                            course.course_sem
                          )}
                        </td>

                        <td className="py-3.5 px-5">
                          {course.credits}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() =>
                                openEditCourse(course)
                              }
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#2563EB] hover:bg-[#EFF6FF]"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                setCourseToDelete(
                                  course
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#DC2626] hover:bg-[#FEF2F2]"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUBJECTS                                                           */}
      {/* ================================================================== */}

      {tab === "Subjects" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13px] text-[#64748B]">
                {facultyCourses.length} faculty-course assignments
              </div>

              <p className="text-[11px] text-[#94A3B8] mt-1">
                Subjects are managed through faculty-course
                assignments.
              </p>
            </div>

            <button
              onClick={openCreateFacultyCourse}
              disabled={
                courses.length === 0 ||
                facultyUsersWithPk.length === 0
              }
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed"
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

              Assign Faculty
            </button>
          </div>

          {facultyUsersWithPk.length === 0 && (
            <div className="mb-4 p-4 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[12px] text-[#9A3412]">
              No faculty records with a database Faculty ID are
              available. Make sure the admin users API returns
              <strong> facultyPk </strong>
              for faculty profiles.
            </div>
          )}

          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            {facultyCourses.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-[#64748B]">
                No faculty-course assignments found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#94A3B8]">
                      <th className="py-3.5 px-5">
                        Course
                      </th>
                      <th className="py-3.5 px-5">
                        Faculty
                      </th>
                      <th className="py-3.5 px-5">
                        Year / Sem
                      </th>
                      <th className="py-3.5 px-5">
                        Division
                      </th>
                      <th className="py-3.5 px-5">
                        Batch
                      </th>
                      <th className="py-3.5 px-5">
                        Type
                      </th>
                      <th className="py-3.5 px-5">
                        Academic Year
                      </th>
                      <th className="py-3.5 px-5 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#F1F5F9] text-[13px] text-[#1E293B]">
                    {facultyCourses.map((item) => (
                      <tr
                        key={item.faculty_course_id}
                        className="hover:bg-[#F8FAFC]"
                      >
                        <td className="py-3.5 px-5">
                          <div className="font-semibold">
                            {item.course_code}
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            {item.course_name}
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          <div className="font-medium">
                            {item.faculty_name}
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            {item.faculty_id}
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          <div>
                            Year {item.year}
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            {getSemesterLabel(item.sem)}
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          {item.div}
                        </td>

                        <td className="py-3.5 px-5">
                          {item.batch || "—"}
                        </td>

                        <td className="py-3.5 px-5">
                          <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#F1F5F9] text-[#475569]">
                            {item.class_type ===
                            "practical"
                              ? "Practical"
                              : "Lecture"}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-[12px]">
                          {item.academic_year}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() =>
                                openEditFacultyCourse(
                                  item
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#2563EB] hover:bg-[#EFF6FF]"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                setFacultyCourseToDelete(
                                  item
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#DC2626] hover:bg-[#FEF2F2]"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* ACADEMIC CALENDAR                                                  */}
      {/* ================================================================== */}

      {tab === "Academic Calendar" && (
        <AcademicCalendarList
          events={calendar}
          onCreate={openCreateCalendarEvent}
          onEdit={openEditCalendarEvent}
          onDelete={setCalendarEventToDelete}
        />
      )}

      {/* ================================================================== */}
      {/* TIMETABLE                                                           */}
      {/* ================================================================== */}

      {tab === "Timetable" && (
        <div className="space-y-5">
          {rooms.length === 0 && (
            <div className="p-4 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[12px] text-[#9A3412]">
              No rooms are available through the current API. Timetable
              creation requires an existing Room record.
            </div>
          )}

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0F172A]">
                {departments.find(
                  (department) =>
                    String(department.department_id) ===
                    selectedTimetableDepartment
                )?.department_code ?? "Branch"}
                {" · "}
                Semester {selectedTimetableSemester || "—"}
                {" · "}
                Division {selectedTimetableDivision || "—"}
              </h2>
              <p className="mt-1 text-[13px] text-[#94A3B8]">
                Weekly class schedule
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-2.5">
              <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                Branch
                <select
                  value={selectedTimetableDepartment}
                  onChange={(event) => {
                    setTimetableDepartmentFilter(event.target.value)
                    setTimetableSemesterFilter("")
                    setTimetableDivisionFilter("")
                  }}
                  className="h-11 min-w-[220px] rounded-xl border border-[#DCE4EF] bg-white px-4 text-[13px] font-normal normal-case tracking-normal text-[#0F172A] outline-none focus:border-[#2563EB]"
                >
                  {departments.map((department) => (
                    <option
                      key={department.department_id}
                      value={department.department_id}
                    >
                      {department.department_code} — {department.department_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                Semester
                <select
                  value={selectedTimetableSemester}
                  onChange={(event) => {
                    setTimetableSemesterFilter(event.target.value)
                    setTimetableDivisionFilter("")
                  }}
                  className="h-11 min-w-[130px] rounded-xl border border-[#DCE4EF] bg-white px-4 text-[13px] font-normal normal-case tracking-normal text-[#0F172A] outline-none focus:border-[#2563EB]"
                >
                  {timetableSemesters.map((semester) => (
                    <option key={semester} value={semester}>
                      Semester {semester}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                Division
                <select
                  value={selectedTimetableDivision}
                  onChange={(event) =>
                    setTimetableDivisionFilter(event.target.value)
                  }
                  className="h-11 min-w-[125px] rounded-xl border border-[#DCE4EF] bg-white px-4 text-[13px] font-normal normal-case tracking-normal text-[#0F172A] outline-none focus:border-[#2563EB]"
                >
                  {timetableDivisions.map((division) => (
                    <option key={division} value={division}>
                      Division {division}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() =>
                  setIsEditingTimetableGrid((editing) => !editing)
                }
                className="h-11 rounded-xl bg-[#2864EA] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
              >
                {isEditingTimetableGrid ? "Done Editing" : "Edit Timetable"}
              </button>
            </div>
          </div>

          {isEditingTimetableGrid && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={openCreateTimetable}
                disabled={
                  facultyCourses.length === 0 || rooms.length === 0
                }
                className="rounded-lg border border-[#BFDBFE] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add timetable entry
              </button>
            </div>
          )}

          <div className="overflow-x-auto rounded-[24px] border border-[#DCE4EF] bg-white">
            {timetable.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-[#64748B]">
                No timetable entries found.
              </div>
            ) : visibleTimetableEntries.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-[#64748B]">
                No timetable entries for this branch, semester, and division.
              </div>
            ) : (
              <table className="w-full min-w-[900px] table-fixed border-collapse text-left">
                <thead>
                  <tr className="h-[52px] border-b border-[#EDF1F6] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                    <th className="w-[135px] px-6">Time slot</th>
                    {(visibleTimetableEntries.some(
                      (entry) => entry.day === "Saturday"
                    )
                      ? days
                      : timetableWeekdays
                    ).map((day) => (
                      <th key={day} className="px-4">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timetableTimeSlots.map((slot) => {
                    const slotKey = `${slot.start}|${slot.end}`
                    return (
                      <tr
                        key={slotKey}
                        className="min-h-[98px] border-b border-[#EDF1F6] last:border-b-0"
                      >
                        <th className="px-6 py-4 align-top text-[13px] font-medium text-[#475569]">
                          {formatTimetableTime(slot.start)}–
                          {formatTimetableTime(slot.end)}
                        </th>
                        {(visibleTimetableEntries.some(
                          (entry) => entry.day === "Saturday"
                        )
                          ? days
                          : timetableWeekdays
                        ).map((day) => {
                          const entries = visibleTimetableEntries
                            .filter(
                              (entry) =>
                                entry.day === day &&
                                `${entry.start_time}|${entry.end_time}` ===
                                  slotKey
                            )
                            .sort((a, b) =>
                              a.course_name.localeCompare(b.course_name)
                            )

                          return (
                            <td
                              key={`${slotKey}-${day}`}
                              className="px-3 py-3 align-top"
                            >
                              {entries.length === 0 ? (
                                <span className="px-1 text-[#D7E0EC]">—</span>
                              ) : (
                                <div className="space-y-2">
                                  {entries.map((entry) => (
                                    <div
                                      key={entry.timetable_id}
                                      className="rounded-[18px] border border-[#D4E5FF] bg-[#EFF6FF] px-3.5 py-2.5 text-[#174293]"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <span
                                          title={entry.course_name}
                                          aria-label={`Subject ${entry.course_name}`}
                                          className="text-[13px] font-semibold leading-5"
                                        >
                                          {getSubjectInitials(entry.course_name)}
                                          {entry.class_type === "practical"
                                            ? " Lab"
                                            : ""}
                                        </span>
                                        <span
                                          title={entry.faculty_name}
                                          aria-label={`Faculty ${entry.faculty_name}`}
                                          className="inline-flex h-[22px] min-w-[27px] items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold text-[#2563EB]"
                                        >
                                          {getFacultyInitials(
                                            entry.faculty_name
                                          )}
                                        </span>
                                      </div>
                                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#64748B]">
                                        <svg
                                          width="13"
                                          height="13"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="1.8"
                                          aria-hidden="true"
                                        >
                                          <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                                          <circle cx="12" cy="10" r="2.5" />
                                        </svg>
                                        <span className="truncate">
                                          Room {entry.room_no}
                                        </span>
                                      </div>
                                      {isEditingTimetableGrid && (
                                        <div className="mt-2 flex gap-2 border-t border-[#D4E5FF] pt-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openEditTimetable(entry)
                                            }
                                            className="text-[10px] font-semibold text-[#2563EB] hover:underline"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setTimetableToDelete(entry)
                                            }
                                            className="text-[10px] font-semibold text-[#DC2626] hover:underline"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* RESULTS                                                             */}
      {/* ================================================================== */}

      {tab === "Results" && (
        <AdminResultsWorkspace
          departments={departments}
          students={studentUsers}
          courses={courses}
          results={results}
          onCreateSemesterResult={openCreateSemesterResult}
          onEditSemesterResult={openEditSemesterResult}
          onCreateCourseResult={openCreateResult}
          onEditCourseResult={openEditResult}
          onPublish={publishResults}
        />
      )}

      {false && tab === "Results" && (
        <div className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E2E8F0]">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={selectedResultDept}
                onChange={(event) =>
                  setSelectedResultDept(
                    event.target.value
                  )
                }
                className="w-auto min-w-[190px]"
              >
                <option value="">
                  All Departments
                </option>

                {resultDepartments.map((department) => (
                  <option
                    key={department.department_id}
                    value={department.department_id}
                  >
                    {department.department_name}
                  </option>
                ))}
              </Select>

              <Select
                value={selectedResultYear}
                onChange={(event) =>
                  setSelectedResultYear(
                    event.target.value
                  )
                }
                className="w-auto min-w-[130px]"
              >
                <option value="">
                  Academic year
                </option>

                {resultYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>

              <Select
                value={selectedResultStudyYear}
                onChange={(event) =>
                  setSelectedResultStudyYear(event.target.value)
                }
                className="w-auto min-w-[125px]"
              >
                <option value="">All study years</option>
                {resultStudyYears.map((year) => (
                  <option key={year} value={year}>
                    Year {year}
                  </option>
                ))}
              </Select>

              <Select
                value={selectedResultSem}
                onChange={(event) =>
                  setSelectedResultSem(
                    event.target.value
                  )
                }
                className="w-auto min-w-[140px]"
              >
                <option value="">
                  All Semesters
                </option>

                {semesterOptions.map((semester) => (
                  <option
                    key={semester}
                    value={semester}
                  >
                    {getSemesterLabel(semester)}
                  </option>
                ))}
              </Select>

              <Select
                value={selectedResultDivision}
                onChange={(event) =>
                  setSelectedResultDivision(event.target.value)
                }
                className="w-auto min-w-[125px]"
              >
                <option value="">All divisions</option>
                {resultDivisions.map((division) => (
                  <option key={division} value={division}>
                    Division {division}
                  </option>
                ))}
              </Select>

              <Select
                value={selectedResultCourse}
                onChange={(event) =>
                  setSelectedResultCourse(event.target.value)
                }
                className="w-auto min-w-[165px]"
              >
                <option value="">All subjects</option>
                {courses
                  .filter(
                    (course) =>
                      (!selectedResultSem ||
                        course.course_sem === Number(selectedResultSem)) &&
                      (!selectedResultDept ||
                        String(course.department) === selectedResultDept)
                  )
                  .map((course) => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.course_id} · {course.course_name}
                    </option>
                  ))}
              </Select>

              <input
                type="search"
                value={resultSearch}
                onChange={(event) => setResultSearch(event.target.value)}
                placeholder="Search name or roll no."
                className="h-10 w-full sm:w-56 rounded-lg border border-[#E2E8F0] px-3 text-[12px] text-[#1E293B] outline-none focus:border-[#2563EB]"
              />
            </div>

            <Button
              variant="primary"
              onClick={() => openCreateSemesterResult()}
              disabled={studentUsers.length === 0}
            >
              + Add Semester Result
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Students", value: resultStatistics.students },
              { label: "Pass", value: resultStatistics.passed },
              { label: "Fail", value: resultStatistics.failed },
              {
                label: "Average marks",
                value:
                  resultStatistics.average === null
                    ? "—"
                    : resultStatistics.average?.toFixed(1) ?? "—",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-bold text-[#1E293B]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {filteredResults.length === 0 &&
          studentsWithoutSelectedResult.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-10 text-center">
              <p className="text-[13px] text-[#64748B]">
                No semester results match the selected
                filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResults.map((semesterResult) => {
                const displayedCourseResults =
                  selectedResultCourse
                    ? semesterResult.results.filter(
                        (result) =>
                          result.course_id === selectedResultCourse
                      )
                    : semesterResult.results
                const departmentId =
                  getStudentDepartmentId(
                    semesterResult.student
                  )

                const department = departments.find(
                  (item) =>
                    item.department_id ===
                    departmentId
                )

                return (
                  <div
                    key={
                      semesterResult.semester_result_id
                    }
                    className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden"
                  >
                    <div className="px-5 py-4 border-b border-[#1E293B] bg-gradient-to-r from-indigo-900 to-slate-900 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[14px] font-semibold text-white">
                            {getStudentName(
                              semesterResult.student
                            )}
                          </h3>

                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-indigo-100 text-[10px] font-semibold">
                            {getStudentRollNo(
                              semesterResult.student
                            )}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusClasses(
                              semesterResult.result_status
                            )}`}
                          >
                            {semesterResult.result_status}
                          </span>

                          {semesterResult.is_published && (
                            <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-semibold">
                              Published
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-indigo-200 mt-1">
                          {department?.department_name ??
                            "Department unavailable"}{" "}
                          ·{" "}
                          {getSemesterLabel(
                            semesterResult.sem
                          )}{" "}
                          ·{" "}
                          {semesterResult.academic_year}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[10px] text-indigo-200">
                            SGPI
                          </div>
                          <div className="text-[16px] font-bold text-white">
                            {semesterResult.sgpi !==
                            null
                              ? Number(
                                  semesterResult.sgpi
                                ).toFixed(2)
                              : "—"}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-indigo-200">
                            CGPA
                          </div>
                          <div className="text-[16px] font-bold text-white">
                            {semesterResult.cgpa !==
                            null
                              ? Number(
                                  semesterResult.cgpa
                                ).toFixed(2)
                              : "—"}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-indigo-200">
                            Credits
                          </div>
                          <div className="text-[16px] font-bold text-white">
                            {semesterResult.total_credits ??
                              "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3 border-b border-[#F1F5F9] flex items-center justify-between bg-[#FAFBFC]">
                      <div className="text-[11px] text-[#64748B]">
                        {displayedCourseResults.length}{" "}
                        course results
                      </div>

                      <div className="flex items-center gap-2">
                        {!semesterResult.is_published && (
                          <>
                            <button
                              onClick={() =>
                                openEditSemesterResult(
                                  semesterResult
                                )
                              }
                              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-medium text-[#2563EB] hover:bg-[#EFF6FF]"
                            >
                              Edit Semester
                            </button>

                            <button
                              onClick={() =>
                                openCreateResult(
                                  semesterResult
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-[#EFF6FF] text-[11px] font-semibold text-[#2563EB] hover:bg-[#DBEAFE]"
                            >
                              + Add Course Result
                            </button>

                            <button
                              onClick={() =>
                                publishResults(
                                  semesterResult.academic_year,
                                  semesterResult.sem
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-[11px] font-semibold hover:bg-[#1D4ED8]"
                            >
                              Publish
                            </button>
                          </>
                        )}

                        {semesterResult.is_published && (
                          <span className="text-[10px] text-[#64748B]">
                            Published{" "}
                            {formatDateTime(
                              semesterResult.published_at
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {semesterResult.results.length ===
                    0 ? (
                      <div className="px-5 py-8 text-center text-[12px] text-[#94A3B8]">
                        No course results have been added
                        yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-[#F1F5F9] text-[10px] uppercase tracking-wider text-[#94A3B8]">
                              <th className="py-3 px-5">
                                Course
                              </th>
                              <th className="py-3 px-5">
                                Credits
                              </th>
                              <th className="py-3 px-5">
                                ISA
                              </th>
                              <th className="py-3 px-5">
                                MSE
                              </th>
                              <th className="py-3 px-5">
                                ESE
                              </th>
                              <th className="py-3 px-5">
                                Total
                              </th>
                              <th className="py-3 px-5">
                                Grade
                              </th>
                              <th className="py-3 px-5">
                                Grade Point
                              </th>
                              <th className="py-3 px-5 text-right">
                                Actions
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-[#F1F5F9] text-[12px] text-[#1E293B]">
                            {displayedCourseResults.map(
                              (result) => (
                                <tr
                                  key={
                                    result.result_id
                                  }
                                  className="hover:bg-[#F8FAFC]"
                                >
                                  <td className="py-3 px-5">
                                    <div className="font-semibold">
                                      {result.course_id}
                                    </div>
                                    <div className="text-[10px] text-[#64748B]">
                                      {result.course_name}
                                    </div>
                                  </td>

                                  <td className="py-3 px-5">
                                    {result.credits}
                                  </td>

                                  <td className="py-3 px-5">
                                    {result.isa ?? "—"}
                                  </td>

                                  <td className="py-3 px-5">
                                    {result.mse ?? "—"}
                                  </td>

                                  <td className="py-3 px-5">
                                    {result.ese ?? "—"}
                                  </td>

                                  <td className="py-3 px-5 font-semibold">
                                    {result.total_marks ??
                                      "—"}
                                  </td>

                                  <td className="py-3 px-5">
                                    <span
                                      className={`px-2 py-1 rounded-full text-[10px] font-semibold ${getGradeClasses(
                                        result.grade
                                      )}`}
                                    >
                                      {result.grade ??
                                        "—"}
                                    </span>
                                  </td>

                                  <td className="py-3 px-5">
                                    {result.grade_point ??
                                      "—"}
                                  </td>

                                  <td className="py-3 px-5 text-right">
                                    {!semesterResult.is_published && (
                                      <button
                                        onClick={() =>
                                          openEditResult(
                                            semesterResult,
                                            result
                                          )
                                        }
                                        className="text-[11px] font-medium text-[#2563EB] hover:underline"
                                      >
                                        Edit
                                      </button>
                                    )}

                                    {semesterResult.is_published && (
                                      <span className="text-[10px] text-[#94A3B8]">
                                        Locked
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}

              {studentsWithoutSelectedResult.map((student) => (
                <div
                  key={`missing-${student.id}`}
                  className="flex flex-col gap-3 rounded-xl border border-dashed border-[#CBD5E1] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-[#1E293B]">
                        {`${student.firstName} ${student.lastName}`.trim()}
                      </h3>
                      <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                        {student.profile?.rollNo ?? "—"}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        No semester result
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#64748B]">
                      {student.profile?.department ?? "Department unavailable"}
                      {" · "}
                      Year {student.profile?.year ?? "—"}
                      {" · Semester "}
                      {selectedResultSem}
                      {" · "}
                      {selectedResultYear ||
                        student.profile?.academicYear ||
                        "Academic year not set"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      student.profile?.studentPk !== undefined &&
                      openCreateSemesterResult(student.profile.studentPk)
                    }
                    disabled={student.profile?.studentPk === undefined}
                    className="rounded-lg bg-[#EFF6FF] px-3 py-2 text-[11px] font-semibold text-[#2563EB] hover:bg-[#DBEAFE]"
                  >
                    Create semester result
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* DEPARTMENT MODAL                                                    */}
      {/* ================================================================== */}

      <Modal
        open={showDeptForm}
        onClose={() => {
          setShowDeptForm(false)
          setEditingDepartment(null)
        }}
        title={
          editingDepartment
            ? "Edit Department"
            : "Add Department"
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeptForm(false)
                setEditingDepartment(null)
              }}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={submitDepartment}
            >
              {editingDepartment
                ? "Save changes"
                : "Add Department"}
            </Button>
          </>
        }
      >
        <Field label="Department Name" required>
          <TextInput
            value={deptForm.name}
            onChange={(event) =>
              setDeptForm((previous) => ({
                ...previous,
                name: event.target.value,
              }))
            }
            placeholder="Computer Engineering"
          />
        </Field>

        <Field label="Department Code" required>
          <TextInput
            value={deptForm.code}
            onChange={(event) =>
              setDeptForm((previous) => ({
                ...previous,
                code: event.target.value,
              }))
            }
            placeholder="CE"
          />
        </Field>
      </Modal>

      {/* ================================================================== */}
      {/* COURSE MODAL                                                        */}
      {/* ================================================================== */}

      <Modal
        open={showCourseForm}
        onClose={() => {
          setShowCourseForm(false)
          setEditingCourse(null)
        }}
        title={
          editingCourse
            ? "Edit Course"
            : "Add Course"
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowCourseForm(false)
                setEditingCourse(null)
              }}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={submitCourse}
            >
              {editingCourse
                ? "Save changes"
                : "Create Course"}
            </Button>
          </>
        }
      >
        <Field label="Course Code" required>
          <TextInput
            value={courseForm.code}
            onChange={(event) =>
              setCourseForm((previous) => ({
                ...previous,
                code: event.target.value,
              }))
            }
            disabled={!!editingCourse}
            placeholder="CS501"
          />
        </Field>

        <Field label="Course Name" required>
          <TextInput
            value={courseForm.name}
            onChange={(event) =>
              setCourseForm((previous) => ({
                ...previous,
                name: event.target.value,
              }))
            }
            placeholder="Machine Learning"
          />
        </Field>

        <Field label="Department" required>
          <Select
            value={courseForm.department}
            onChange={(event) =>
              setCourseForm((previous) => ({
                ...previous,
                department: event.target.value,
              }))
            }
          >
            <option value="">
              Select department
            </option>

            {departments.map((department) => (
              <option
                key={department.department_id}
                value={department.department_id}
              >
                {department.department_name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Semester" required>
            <Select
              value={courseForm.semester}
              onChange={(event) =>
                setCourseForm((previous) => ({
                  ...previous,
                  semester: event.target.value,
                }))
              }
            >
              {semesterOptions.map((semester) => (
                <option
                  key={semester}
                  value={semester}
                >
                  {getSemesterLabel(semester)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Credits" required>
            <TextInput
              type="number"
              min="1"
              value={courseForm.credits}
              onChange={(event) =>
                setCourseForm((previous) => ({
                  ...previous,
                  credits: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* FACULTY COURSE MODAL                                               */}
      {/* ================================================================== */}

      <Modal
        open={showFacultyCourseForm}
        onClose={() => {
          setShowFacultyCourseForm(false)
          setEditingFacultyCourse(null)
        }}
        title={
          editingFacultyCourse
            ? "Edit Subject Assignment"
            : "Assign Faculty to Subject"
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowFacultyCourseForm(false)
                setEditingFacultyCourse(null)
              }}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={submitFacultyCourse}
            >
              {editingFacultyCourse
                ? "Save changes"
                : "Assign Faculty"}
            </Button>
          </>
        }
      >
        <Field label="Faculty" required>
          <Select
            value={facultyCourseForm.faculty}
            onChange={(event) =>
              setFacultyCourseForm((previous) => ({
                ...previous,
                faculty: event.target.value,
              }))
            }
          >
            <option value="">
              Select faculty
            </option>

            {facultyUsersWithPk.map((user) => {
              const profile =
                user.profile as FacultyProfile

              return (
                <option
                  key={user.id}
                  value={profile.facultyPk}
                >
                  {user.firstName} {user.lastName}{" "}
                  ({profile.facultyId})
                </option>
              )
            })}
          </Select>
        </Field>

        <Field label="Course" required>
          <Select
            value={facultyCourseForm.course}
            onChange={(event) => {
              const selectedCourse =
                courses.find(
                  (course) =>
                    course.course_id ===
                    event.target.value
                )

              setFacultyCourseForm((previous) => ({
                ...previous,
                course: event.target.value,
                semester: selectedCourse
                  ? String(
                      selectedCourse.course_sem
                    )
                  : previous.semester,
              }))
            }}
          >
            <option value="">
              Select course
            </option>

            {courses.map((course) => (
              <option
                key={course.course_id}
                value={course.course_id}
              >
                {course.course_id} -{" "}
                {course.course_name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Semester" required>
            <Select
              value={facultyCourseForm.semester}
              onChange={(event) =>
                setFacultyCourseForm((previous) => ({
                  ...previous,
                  semester: event.target.value,
                }))
              }
            >
              {semesterOptions.map((semester) => (
                <option
                  key={semester}
                  value={semester}
                >
                  {getSemesterLabel(semester)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Year" required>
            <Select
              value={facultyCourseForm.year}
              onChange={(event) =>
                setFacultyCourseForm((previous) => ({
                  ...previous,
                  year: event.target.value,
                }))
              }
            >
              {yearOptions.map((year) => (
                <option
                  key={year}
                  value={year}
                >
                  Year {year}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Division" required>
            <Select
              value={facultyCourseForm.division}
              onChange={(event) =>
                setFacultyCourseForm((previous) => ({
                  ...previous,
                  division: event.target.value,
                }))
              }
            >
              {divisionOptions.map((division) => (
                <option
                  key={division}
                  value={division}
                >
                  Division {division}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Class Type" required>
            <Select
              value={facultyCourseForm.classType}
              onChange={(event) =>
                setFacultyCourseForm((previous) => ({
                  ...previous,
                  classType: event.target
                    .value as
                    | "lecture"
                    | "practical",
                  batch:
                    event.target.value ===
                    "lecture"
                      ? ""
                      : previous.batch,
                }))
              }
            >
              {classTypes.map((type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {facultyCourseForm.classType ===
          "practical" && (
          <Field label="Batch" required>
            <TextInput
              value={facultyCourseForm.batch}
              onChange={(event) =>
                setFacultyCourseForm((previous) => ({
                  ...previous,
                  batch: event.target.value,
                }))
              }
              placeholder="A1"
            />
          </Field>
        )}

        <Field label="Academic Year" required>
          <TextInput
            value={facultyCourseForm.academicYear}
            onChange={(event) =>
              setFacultyCourseForm((previous) => ({
                ...previous,
                academicYear: event.target.value,
              }))
            }
            placeholder="2026-2027"
          />
        </Field>
      </Modal>

      {/* ================================================================== */}
      {/* CALENDAR MODAL                                                      */}
      {/* ================================================================== */}

      <Modal
        open={showCalendarForm}
        onClose={() => {
          setShowCalendarForm(false)
          setEditingCalendarEvent(null)
        }}
        title={editingCalendarEvent ? "Edit Academic Period" : "Add Academic Period"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowCalendarForm(false)
                setEditingCalendarEvent(null)
              }}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={submitCalendarEvent}
              disabled={
                !calendarForm.title.trim() ||
                !calendarForm.academicYear.trim() ||
                !calendarForm.startDate ||
                !calendarForm.endDate ||
                calendarForm.endDate < calendarForm.startDate
              }
            >
              {editingCalendarEvent
                ? "Save changes"
                : "Add Period"}
            </Button>
          </>
        }
      >
        <Field label="Academic Year" required>
          <TextInput
            value={calendarForm.academicYear}
            onChange={(event) =>
              setCalendarForm((previous) => ({
                ...previous,
                academicYear: event.target.value,
              }))
            }
            placeholder="2026-2027"
          />
        </Field>

        <Field label="Title" required>
          <TextInput
            value={calendarForm.title}
            onChange={(event) =>
              setCalendarForm((previous) => ({
                ...previous,
                title: event.target.value,
              }))
            }
            placeholder="Semester 5"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" required>
          <Select
            value={calendarForm.category}
            onChange={(event) =>
              setCalendarForm((previous) => ({
                ...previous,
                category: event.target.value as AcademicCalendarEvent["category"],
              }))
            }
          >
            {calendarCategories.map((type) => (
              <option
                key={type.value}
                value={type.value}
              >
                {type.label}
              </option>
            ))}
          </Select>
          </Field>
          <Field label="Semester">
            <Select
              value={calendarForm.semester}
              onChange={(event) =>
                setCalendarForm((previous) => ({
                  ...previous,
                  semester: event.target.value,
                }))
              }
            >
              <option value="">Institution-wide / optional</option>
              {semesterOptions.map((semester) => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date" required>
            <TextInput
              type="date"
              value={calendarForm.startDate}
              onChange={(event) =>
                setCalendarForm((previous) => ({
                  ...previous,
                  startDate: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="End Date" required>
            <TextInput
              type="date"
              value={calendarForm.endDate}
              onChange={(event) =>
                setCalendarForm((previous) => ({
                  ...previous,
                  endDate: event.target.value,
                }))
              }
            />
          </Field>
        </div>
        <p className="text-[11px] text-[#94A3B8] -mt-2 mb-4">
          Use the same start and end date for a single-day entry.
        </p>

        <Field label="Description">
          <TextArea
            rows={4}
            value={calendarForm.description}
            onChange={(event) =>
              setCalendarForm((previous) => ({
                ...previous,
                description: event.target.value,
              }))
            }
            placeholder="Optional event description"
          />
        </Field>
      </Modal>

      {/* ================================================================== */}
      {/* TIMETABLE MODAL                                                     */}
      {/* ================================================================== */}

      <Modal
        open={showTimetableForm}
        onClose={() => {
          setShowTimetableForm(false)
          setEditingTimetable(null)
        }}
        title={
          editingTimetable
            ? "Edit Timetable Entry"
            : "Add Timetable Entry"
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowTimetableForm(false)
                setEditingTimetable(null)
              }}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={submitTimetable}
            >
              {editingTimetable
                ? "Save changes"
                : "Create Entry"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Faculty" required>
            <Select
              value={timetableForm.faculty}
              onChange={(event) => {
                const facultyId = event.target.value
                const firstSubject = facultyCourses.find(
                  (item) => String(item.faculty) === facultyId
                )
                setTimetableForm((previous) => ({
                  ...previous,
                  faculty: facultyId,
                  facultyCourse: firstSubject
                    ? String(firstSubject.faculty_course_id)
                    : "",
                }))
              }}
            >
              <option value="">Select faculty</option>
              {timetableFaculties.map((item) => (
                <option key={item.faculty} value={item.faculty}>
                  {item.faculty_name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Subject" required>
            <Select
              value={timetableForm.facultyCourse}
              onChange={(event) =>
                setTimetableForm((previous) => ({
                  ...previous,
                  facultyCourse: event.target.value,
                }))
              }
              disabled={!timetableForm.faculty}
            >
              <option value="">Select subject</option>
              {timetableSubjects.map((item) => (
                <option
                  key={item.faculty_course_id}
                  value={item.faculty_course_id}
                >
                  {item.course_name} · Semester {item.sem} · Div {item.div}
                  {item.batch ? ` · Batch ${item.batch}` : ""}
                  {item.class_type === "practical" ? " · Practical" : ""}
                </option>
              ))}
            </Select>
            {timetableForm.faculty && timetableSubjects.length === 0 && (
              <p className="mt-1 text-[11px] text-[#94A3B8]">
                No subjects are assigned to this faculty.
              </p>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Room" required>
            <Select
              value={timetableForm.room}
              onChange={(event) =>
                setTimetableForm((previous) => ({
                  ...previous,
                  room: event.target.value,
                }))
              }
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.room} value={room.room}>
                  {room.room_no} - {room.block}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Day" required>
            <Select
              value={timetableForm.day}
              onChange={(event) =>
                setTimetableForm((previous) => ({
                  ...previous,
                  day: event.target.value,
                }))
              }
            >
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Time" required>
            <TextInput
              type="time"
              value={timetableForm.startTime}
              onChange={(event) =>
                setTimetableForm((previous) => ({
                  ...previous,
                  startTime:
                    event.target.value,
                }))
              }
            />
          </Field>

          <Field label="End Time" required>
            <TextInput
              type="time"
              value={timetableForm.endTime}
              onChange={(event) =>
                setTimetableForm((previous) => ({
                  ...previous,
                  endTime:
                    event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* SEMESTER RESULT MODAL                                               */}
      {/* ================================================================== */}

      <Modal
        open={showSemesterResultForm}
        onClose={() => {
          setShowSemesterResultForm(false)
          setEditingSemesterResult(null)
        }}
        title={
          editingSemesterResult
            ? "Edit Semester Result"
            : "Add Semester Result"
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowSemesterResultForm(false)
                setEditingSemesterResult(null)
              }}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={submitSemesterResult}
            >
              {editingSemesterResult
                ? "Save changes"
                : "Create Result"}
            </Button>
          </>
        }
      >
        <Field label="Student" required>
          <Select
            value={semesterResultForm.student}
            onChange={(event) =>
              setSemesterResultForm((previous) => ({
                ...previous,
                student: event.target.value,
              }))
            }
            disabled={!!editingSemesterResult}
          >
            <option value="">
              Select student
            </option>

            {studentUsers.map((student) => (
              <option
                key={student.id}
                value={student.profile?.studentPk ?? ""}
              >
                {student.profile?.rollNo ?? "—"} -{" "}
                {student.firstName}{" "}
                {student.lastName}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Academic Year" required>
            <TextInput
              value={semesterResultForm.academicYear}
              onChange={(event) =>
                setSemesterResultForm((previous) => ({
                  ...previous,
                  academicYear:
                    event.target.value,
                }))
              }
              placeholder="2026-2027"
            />
          </Field>

          <Field label="Semester" required>
            <Select
              value={semesterResultForm.semester}
              onChange={(event) =>
                setSemesterResultForm((previous) => ({
                  ...previous,
                  semester:
                    event.target.value,
                }))
              }
            >
              {semesterOptions.map((semester) => (
                <option
                  key={semester}
                  value={semester}
                >
                  {getSemesterLabel(semester)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="SGPI" required>
            <TextInput
              type="number"
              min="0"
              max="10"
              step="0.01"
              value={semesterResultForm.sgpi}
              onChange={(event) =>
                setSemesterResultForm((previous) => ({
                  ...previous,
                  sgpi: event.target.value,
                }))
              }
              placeholder="8.50"
            />
          </Field>

          <Field label="CGPA" required>
            <TextInput
              type="number"
              min="0"
              max="10"
              step="0.01"
              value={semesterResultForm.cgpa}
              onChange={(event) =>
                setSemesterResultForm((previous) => ({
                  ...previous,
                  cgpa: event.target.value,
                }))
              }
              placeholder="8.70"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Total Credits" required>
            <TextInput
              type="number"
              min="0"
              value={
                semesterResultForm.totalCredits
              }
              onChange={(event) =>
                setSemesterResultForm((previous) => ({
                  ...previous,
                  totalCredits:
                    event.target.value,
                }))
              }
              placeholder="24"
            />
          </Field>

          <Field label="Result Status" required>
            <Select
              value={
                semesterResultForm.resultStatus
              }
              onChange={(event) =>
                setSemesterResultForm((previous) => ({
                  ...previous,
                  resultStatus:
                    event.target.value,
                }))
              }
            >
              {resultStatusOptions.map(
                (status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                )
              )}
            </Select>
          </Field>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* COURSE RESULT MODAL                                                 */}
      {/* ================================================================== */}

      <Modal
        open={showResultForm}
        onClose={() => {
          setShowResultForm(false)
          setEditingResult(null)
          setResultTargetSemester(null)
        }}
        title={
          editingResult
            ? "Edit Course Result"
            : "Add Course Result"
        }
        subtitle={
          resultTargetSemester
            ? `${getStudentName(
                resultTargetSemester.student
              )} · ${getSemesterLabel(
                resultTargetSemester.sem
              )}`
            : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowResultForm(false)
                setEditingResult(null)
                setResultTargetSemester(null)
              }}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={submitResult}
            >
              {editingResult
                ? "Save changes"
                : "Add Result"}
            </Button>
          </>
        }
      >
        <Field label="Course" required>
          <Select
            value={resultForm.course}
            onChange={(event) => {
              const selectedCourse = courses.find(
                (course) => course.course_id === event.target.value
              )
              const selectedIsLab =
                selectedCourse?.course_name.toLowerCase().includes("lab") ?? false
              setResultForm((previous) => ({
                ...previous,
                course: event.target.value,
                mse: selectedIsLab ? "0" : previous.mse,
              }))
            }}
          >
            <option value="">
              Select course
            </option>

            {courses
              .filter((course) => {
                if (
                  resultTargetSemester &&
                  course.course_sem !== resultTargetSemester.sem
                ) {
                  return false
                }
                const departmentId = resultTargetSemester
                  ? getStudentDepartmentId(resultTargetSemester.student)
                  : undefined
                return !departmentId || course.department === departmentId
              })
              .map((course) => (
              <option
                key={course.course_id}
                value={course.course_id}
              >
                {course.course_id} -{" "}
                {course.course_name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="ISA">
            <TextInput
              type="number"
              min="0"
              value={resultForm.isa}
              onChange={(event) =>
                setResultForm((previous) => ({
                  ...previous,
                  isa: event.target.value,
                }))
              }
            />
          </Field>

          {!courses
            .find((course) => course.course_id === resultForm.course)
            ?.course_name.toLowerCase()
            .includes("lab") && (
            <Field label="MSE">
          <TextInput
            type="number"
            min="0"
            value={resultForm.mse}
            onChange={(event) =>
              setResultForm((previous) => ({
                ...previous,
                mse: event.target.value,
              }))
            }
          />
            </Field>
          )}

          <Field
            label={
          courses
            .find((course) => course.course_id === resultForm.course)
            ?.course_name.toLowerCase()
            .includes("lab")
            ? "PRA"
            : "ESE"
            }
          >
            <TextInput
              type="number"
              min="0"
              value={resultForm.ese}
              onChange={(event) =>
                setResultForm((previous) => ({
                  ...previous,
                  ese: event.target.value,
                }))
              }
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Total Marks">
            <TextInput
              type="number"
              min="0"
              value={resultForm.totalMarks}
              onChange={(event) =>
                setResultForm((previous) => ({
                  ...previous,
                  totalMarks:
                    event.target.value,
                }))
              }
            />
          </Field>

          <Field label="Grade">
            <Select
              value={resultForm.grade}
              onChange={(event) =>
                setResultForm((previous) => ({
                  ...previous,
                  grade: event.target.value,
                }))
              }
            >
              <option value="">
                Select grade
              </option>

              {gradeOptions.map((grade) => (
                <option
                  key={grade}
                  value={grade}
                >
                  {grade}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Grade Point">
            <TextInput
              type="number"
              min="0"
              value={resultForm.gradePoint}
              onChange={(event) =>
                setResultForm((previous) => ({
                  ...previous,
                  gradePoint:
                    event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* CONFIRMATION DIALOGS                                                */}
      {/* ================================================================== */}

      <ConfirmDialog
        open={!!departmentToDelete}
        title="Remove this department?"
        message={`"${departmentToDelete?.department_name}" will be removed from the system. The backend will prevent deletion if related records still depend on it.`}
        confirmLabel="Delete"
        onConfirm={removeDepartment}
        onCancel={() =>
          setDepartmentToDelete(null)
        }
      />

      <ConfirmDialog
        open={!!courseToDelete}
        title="Remove this course?"
        message={`"${courseToDelete?.course_id} - ${courseToDelete?.course_name}" will be removed if no protected records depend on it.`}
        confirmLabel="Delete"
        onConfirm={removeCourse}
        onCancel={() =>
          setCourseToDelete(null)
        }
      />

      <ConfirmDialog
        open={!!facultyCourseToDelete}
        title="Remove this subject assignment?"
        message={`The faculty-course assignment for "${facultyCourseToDelete?.course_name}" will be removed.`}
        confirmLabel="Delete"
        onConfirm={removeFacultyCourse}
        onCancel={() =>
          setFacultyCourseToDelete(null)
        }
      />

      <ConfirmDialog
        open={!!calendarEventToDelete}
        title="Remove this calendar event?"
        message={`"${calendarEventToDelete?.title}" will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={removeCalendarEvent}
        onCancel={() =>
          setCalendarEventToDelete(null)
        }
      />

      <ConfirmDialog
        open={!!timetableToDelete}
        title="Remove this timetable entry?"
        message={`The timetable entry for "${timetableToDelete?.course_name}" on ${timetableToDelete?.day} will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={removeTimetable}
        onCancel={() =>
          setTimetableToDelete(null)
        }
      />
    </div>
  )
}