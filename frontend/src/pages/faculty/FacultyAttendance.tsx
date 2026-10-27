// src/pages/faculty/FacultyAttendance.tsx

import { useEffect, useMemo, useState } from "react"
import { useToast } from "../../components/ui/ToastContext"
import {
  getFacultyTimetable,
  getAttendanceStudents,
  markAttendance,
  updateAttendance,
  type FacultyAttendanceTimetable,
  type AttendanceStudent,
} from "../../api/attendance"

type AttendanceStatus = "present" | "absent"

const palette = ["#2563EB", "#9333EA", "#F97316", "#16A34A"]

function getYearLabel(year: number) {
  if (year === 1) return "FE"
  if (year === 2) return "SE"
  if (year === 3) return "TE"
  if (year === 4) return "BE"
  return `Year ${year}`
}

function getClassLabel(item: FacultyAttendanceTimetable) {
  return `${getYearLabel(item.year)} - Div ${item.div}`
}

function getTypeLabel(classType: string) {
  return classType.toLowerCase() === "practical"
    ? "Lab (Batch Wise)"
    : "Lecture (Full Class)"
}

export default function FacultyAttendance() {
  const { showToast } = useToast()

  const [timetable, setTimetable] = useState<FacultyAttendanceTimetable[]>([])
  const [students, setStudents] = useState<AttendanceStudent[]>([])

  const [selectedCourseId, setSelectedCourseId] = useState<number>(0)
  const [selectedType, setSelectedType] = useState<string>("")
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [selectedBatch, setSelectedBatch] = useState<string>("")

  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [lectureNo, setLectureNo] = useState<number>(1)

  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({})
  const [search, setSearch] = useState("")

  const [loadingTimetable, setLoadingTimetable] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)

  /*
   * Load faculty timetable from backend.
   */
  useEffect(() => {
    const loadTimetable = async () => {
      try {
        setLoadingTimetable(true)

        const data = await getFacultyTimetable()
        setTimetable(data)

        if (data.length > 0) {
          const first = data[0]

          setSelectedCourseId(first.faculty_course)
          setSelectedType(first.class_type)
          setSelectedClass(
            `${first.year}-${first.sem}-${first.div}`
          )
          setSelectedBatch(first.batch ?? "")
        }
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Failed to load timetable.",
          "error"
        )
      } finally {
        setLoadingTimetable(false)
      }
    }

    loadTimetable()
  }, [showToast])

  /*
   * Unique faculty courses.
   */
  const myCourses = useMemo(() => {
    const map = new Map<number, FacultyAttendanceTimetable>()

    timetable.forEach(item => {
      if (!map.has(item.faculty_course)) {
        map.set(item.faculty_course, item)
      }
    })

    return Array.from(map.values())
  }, [timetable])

  /*
   * Timetable entries for the selected subject.
   */
  const courseTimetable = useMemo(() => {
    return timetable.filter(
      item => item.faculty_course === selectedCourseId
    )
  }, [timetable, selectedCourseId])

  /*
   * Available session types for selected subject.
   */
  const availableTypes = useMemo(() => {
    return Array.from(
      new Map(
        courseTimetable.map(item => [
          item.class_type,
          item.class_type,
        ])
      ).values()
    )
  }, [courseTimetable])

  /*
   * Available classes for selected subject/type.
   */
  const availableClasses = useMemo(() => {
    const filtered = courseTimetable.filter(
      item =>
        !selectedType ||
        item.class_type === selectedType
    )

    const map = new Map<string, FacultyAttendanceTimetable>()

    filtered.forEach(item => {
      const key = `${item.year}-${item.sem}-${item.div}`

      if (!map.has(key)) {
        map.set(key, item)
      }
    })

    return Array.from(map.entries()).map(
      ([value, item]) => ({
        value,
        item,
      })
    )
  }, [courseTimetable, selectedType])

  /*
   * Available batches for selected practical class.
   */
  const availableBatches = useMemo(() => {
    const filtered = courseTimetable.filter(
      item =>
        (!selectedType || item.class_type === selectedType) &&
        (!selectedClass ||
          `${item.year}-${item.sem}-${item.div}` ===
            selectedClass)
    )

    return Array.from(
      new Set(
        filtered
          .map(item => item.batch)
          .filter(
            (batch): batch is string =>
              Boolean(batch)
          )
      )
    )
  }, [
    courseTimetable,
    selectedType,
    selectedClass,
  ])

  /*
   * Find the exact timetable entry that should be used
   * for attendance marking.
   */
  const selectedTimetable = useMemo(() => {
    return courseTimetable.find(item => {
      const classMatches =
        `${item.year}-${item.sem}-${item.div}` ===
        selectedClass

      const typeMatches =
        !selectedType ||
        item.class_type === selectedType

      const batchMatches =
        item.class_type.toLowerCase() === "practical"
          ? item.batch === selectedBatch
          : true

      return (
        classMatches &&
        typeMatches &&
        batchMatches
      )
    }) ?? null
  }, [
    courseTimetable,
    selectedClass,
    selectedType,
    selectedBatch,
  ])

  /*
   * Load the eligible student roster for the selected
   * timetable from the backend.
   */
  useEffect(() => {
    if (!selectedTimetable) {
      setStudents([])
      setMarks({})
      return
    }

    const loadStudents = async () => {
      try {
        setLoadingStudents(true)

        const data = await getAttendanceStudents(
          selectedTimetable.timetable_id
        )

        setStudents(data)

        const initialMarks: Record<
          string,
          AttendanceStatus
        > = {}

        data.forEach(student => {
          initialMarks[student.roll_no] =
            student.status
        })

        setMarks(initialMarks)
      } catch (error) {
        setStudents([])
        setMarks({})

        showToast(
          error instanceof Error
            ? error.message
            : "Failed to load students.",
          "error"
        )
      } finally {
        setLoadingStudents(false)
      }
    }

    loadStudents()
  }, [selectedTimetable, showToast])

  /*
   * Keep dependent selections valid when the subject changes.
   */
  useEffect(() => {
    if (availableTypes.length === 0) {
      setSelectedType("")
      return
    }

    if (!availableTypes.includes(selectedType)) {
      setSelectedType(availableTypes[0])
    }
  }, [availableTypes, selectedType])

  useEffect(() => {
    if (availableClasses.length === 0) {
      setSelectedClass("")
      return
    }

    const exists = availableClasses.some(
      item => item.value === selectedClass
    )

    if (!exists) {
      setSelectedClass(
        availableClasses[0].value
      )
    }
  }, [availableClasses, selectedClass])

  useEffect(() => {
    if (selectedType.toLowerCase() !== "practical") {
      setSelectedBatch("")
      return
    }

    if (availableBatches.length === 0) {
      setSelectedBatch("")
      return
    }

    if (!availableBatches.includes(selectedBatch)) {
      setSelectedBatch(availableBatches[0])
    }
  }, [
    selectedType,
    availableBatches,
    selectedBatch,
  ])

  /*
   * Search students by name or roll number.
   */
  const filteredRoster = students.filter(student => {
    const query = search.toLowerCase()

    return (
      student.student_name
        .toLowerCase()
        .includes(query) ||
      student.roll_no
        .toLowerCase()
        .includes(query)
    )
  })

  const markedValues = students.map(
    student => marks[student.roll_no]
  )

  const presentCount = markedValues.filter(
    value => value === "present"
  ).length

  const absentCount = markedValues.filter(
    value => value === "absent"
  ).length

  const unmarkedCount =
    students.length -
    presentCount -
    absentCount

  const courseIdx = Math.max(
    myCourses.findIndex(
      course =>
        course.faculty_course === selectedCourseId
    ),
    0
  )

  const color =
    palette[courseIdx % palette.length]

  const selectedCourse =
    myCourses.find(
      course =>
        course.faculty_course ===
        selectedCourseId
    ) ?? null

  const markAll = (
    status: AttendanceStatus
  ) => {
    setMarks(prev => {
      const updated = { ...prev }

      filteredRoster.forEach(student => {
        updated[student.roll_no] = status
      })

      return updated
    })
  }

  const handleSave = async () => {
    if (!selectedTimetable) {
      showToast(
        "Please select a valid timetable entry.",
        "error"
      )
      return
    }

    if (students.length === 0) {
      showToast(
        "No students found for this class.",
        "error"
      )
      return
    }

    if (!lectureNo || lectureNo < 1) {
      showToast(
        "Enter a valid lecture number.",
        "error"
      )
      return
    }

    try {
      setSaving(true)

      const attendance = students.map(student => ({
        roll_no: student.roll_no,
        student_name: student.student_name,
        status:
          marks[student.roll_no] ??
          "present",
      }))

      const payload = {
        timetable_id:
          selectedTimetable.timetable_id,
        date,
        lecture_no: lectureNo,
        attendance,
      }

      /*
       * POST creates attendance.
       * PUT updates attendance when records already exist.
       *
       * Since the backend currently handles POST/PUT
       * separately, try POST first. If the backend reports
       * that attendance already exists, use PUT.
       */
      try {
        await markAttendance(payload)
      } catch {
        await updateAttendance(payload)
      }

      showToast(
        `Attendance saved for ${
          selectedCourse?.course_name ?? "the selected subject"
        } (${getTypeLabel(
          selectedTimetable.class_type
        )} - ${getClassLabel(
          selectedTimetable
        )}${
          selectedTimetable.class_type.toLowerCase() ===
          "practical"
            ? ` Batch ${selectedTimetable.batch}`
            : ""
        })`,
        "success"
      )
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to save attendance.",
        "error"
      )
    } finally {
      setSaving(false)
    }
  }

  if (loadingTimetable) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            Attendance Management
          </h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            Take and manage attendance for your lectures and practical labs
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-10 text-center text-[13px] text-[#94A3B8]">
          Loading your timetable...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
          Attendance Management
        </h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">
          Take and manage attendance for your lectures and practical labs
        </p>
      </div>

      {timetable.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-10 text-center text-[13px] text-[#94A3B8]">
          You have no timetable entries assigned yet.
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 mb-5 shadow-sm">
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-4 items-end ${
                selectedType.toLowerCase() === "practical"
                  ? "lg:grid-cols-6"
                  : "lg:grid-cols-5"
              }`}
            >

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Subject
                </label>

                <select
                  value={selectedCourseId}
                  onChange={e => {
                    const value = Number(e.target.value)

                    setSelectedCourseId(value)

                    const first =
                      timetable.find(
                        item =>
                          item.faculty_course === value
                      )

                    if (first) {
                      setSelectedType(first.class_type)
                      setSelectedClass(
                        `${first.year}-${first.sem}-${first.div}`
                      )
                      setSelectedBatch(
                        first.batch ?? ""
                      )
                    }

                    setMarks({})
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                >
                  {myCourses.map(course => (
                    <option
                      key={course.faculty_course}
                      value={course.faculty_course}
                    >
                      {course.course_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Type
                </label>

                <select
                  value={selectedType}
                  onChange={e => {
                    setSelectedType(e.target.value)
                    setMarks({})
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                >
                  {availableTypes.map(type => (
                    <option
                      key={type}
                      value={type}
                    >
                      {getTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Class & Division
                </label>

                <select
                  value={selectedClass}
                  onChange={e => {
                    setSelectedClass(e.target.value)
                    setMarks({})
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                >
                  {availableClasses.map(
                    ({ value, item }) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {getClassLabel(item)}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Batch */}
              {selectedType.toLowerCase() ===
              "practical" && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider mb-1.5">
                    Select Batch
                  </label>

                  <select
                    value={selectedBatch}
                    onChange={e => {
                      setSelectedBatch(
                        e.target.value
                      )
                      setMarks({})
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-blue-300 text-[13px] focus:outline-none focus:border-[#2563EB] bg-blue-50/50 text-[#1E293B] font-medium"
                  >
                    {availableBatches.map(batch => (
                      <option
                        key={batch}
                        value={batch}
                      >
                        Batch {batch}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lecture number */}
              <div>
                <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Lecture No.
                </label>

                <input
                  type="number"
                  min={1}
                  value={lectureNo}
                  onChange={e =>
                    setLectureNo(Number(e.target.value))
                  }
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Date
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={e =>
                    setDate(e.target.value)
                  }
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />
              </div>
            </div>

            {selectedTimetable && (
              <div className="text-[11px] text-[#94A3B8] mt-2">
                {selectedTimetable.day} ·{" "}
                {selectedTimetable.start_time} -{" "}
                {selectedTimetable.end_time} ·{" "}
                {selectedTimetable.room_no}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col items-end gap-3 mt-4 pt-4 border-t border-[#F1F5F9]">
              <div className="flex flex-wrap items-center justify-end gap-2 w-full">
                <button
                  onClick={() =>
                    markAll("present")
                  }
                  disabled={
                    loadingStudents ||
                    students.length === 0
                  }
                  className="h-9 px-3 rounded-lg text-[12px] font-medium bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] hover:bg-[#DCFCE7] transition-colors disabled:opacity-50"
                >
                  Mark All Present
                </button>

                <button
                  onClick={() =>
                    markAll("absent")
                  }
                  disabled={
                    loadingStudents ||
                    students.length === 0
                  }
                  className="h-9 px-3 rounded-lg text-[12px] font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] hover:bg-[#FEE2E2] transition-colors disabled:opacity-50"
                >
                  Mark All Absent
                </button>

                <button
                  onClick={handleSave}
                  disabled={
                    saving ||
                    loadingStudents ||
                    students.length === 0 ||
                    !selectedTimetable
                  }
                  className="h-9 px-4 rounded-lg text-[12px] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{
                    backgroundColor: color,
                  }}
                >
                  {saving
                    ? "Saving..."
                    : "Save Attendance"}
                </button>
              </div>
            </div>

            {markedValues.length > 0 && (
              <div className="flex items-center justify-end gap-4 mt-3 pt-3 border-t border-[#F1F5F9]">
                <div className="text-[12px] text-[#64748B]">
                  <span className="font-semibold text-[#16A34A]">
                    {presentCount} present
                  </span>

                  <span className="mx-1.5">
                    ·
                  </span>

                  <span className="font-semibold text-[#DC2626]">
                    {absentCount} absent
                  </span>

                  <span className="mx-1.5">
                    ·
                  </span>

                  <span>
                    {unmarkedCount} unmarked
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9] flex-wrap gap-2">
              <div className="text-[13px] font-semibold text-[#1E293B] flex items-center gap-2">
                <span>
                  {selectedCourse?.course_name ??
                    "Attendance"}{" "}
                  —{" "}
                  {selectedType
                    ? getTypeLabel(
                        selectedType
                      )
                    : "Attendance"}{" "}
                  Sheet
                </span>

                {selectedTimetable && (
                  <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 border border-slate-200">
                    {getClassLabel(
                      selectedTimetable
                    )}
                  </span>
                )}

                {selectedTimetable &&
                  selectedTimetable.class_type.toLowerCase() ===
                    "practical" && (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      Batch{" "}
                      {
                        selectedTimetable.batch
                      }
                    </span>
                  )}
              </div>

              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                  width="12"
                  height="12"
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
                  value={search}
                  onChange={e =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search student..."
                  className="h-8 pl-7 pr-3 rounded-lg border border-[#E2E8F0] text-[12px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC]">
                  {[
                    "#",
                    "Roll No.",
                    "Student Name",
                    "Present",
                    "Absent",
                  ].map(header => (
                    <th
                      key={header}
                      className="text-left px-5 py-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F1F5F9]">
                {loadingStudents ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-10 text-[13px] text-[#94A3B8]"
                    >
                      Loading students...
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map(
                    (student, index) => {
                      const mark =
                        marks[
                          student.roll_no
                        ]

                      return (
                        <tr
                          key={
                            student.roll_no
                          }
                          className={`hover:bg-[#F8FAFC] transition-colors ${
                            mark === "absent"
                              ? "bg-[#FFF5F5]"
                              : mark ===
                                "present"
                              ? "bg-[#F0FDF4]/50"
                              : ""
                          }`}
                        >
                          <td className="px-5 py-3.5 text-[12px] text-[#94A3B8]">
                            {index + 1}
                          </td>

                          <td className="px-5 py-3.5 text-[12px] font-mono text-[#64748B]">
                            {student.roll_no}
                          </td>

                          <td className="px-5 py-3.5 text-[13px] font-medium text-[#1E293B]">
                            {
                              student.student_name
                            }
                          </td>

                          {(
                            [
                              "present",
                              "absent",
                            ] as const
                          ).map(status => (
                            <td
                              key={status}
                              className="px-5 py-3.5"
                            >
                              <button
                                onClick={() =>
                                  setMarks(
                                    prev => ({
                                      ...prev,
                                      [student.roll_no]:
                                        status,
                                    })
                                  )
                                }
                                className={`w-8 h-8 rounded-full text-[11px] font-bold border-2 transition-all ${
                                  mark ===
                                  status
                                    ? status ===
                                      "present"
                                      ? "bg-[#16A34A] text-white border-[#16A34A] scale-110"
                                      : "bg-[#DC2626] text-white border-[#DC2626] scale-110"
                                    : "border-[#E2E8F0] text-[#94A3B8] hover:border-[#94A3B8] hover:text-[#64748B]"
                                }`}
                              >
                                {status ===
                                "present"
                                  ? "P"
                                  : "A"}
                              </button>
                            </td>
                          ))}
                        </tr>
                      )
                    }
                  )
                )}

                {!loadingStudents &&
                  filteredRoster.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-10 text-[13px] text-[#94A3B8]"
                      >
                        No students found for
                        this selection
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}