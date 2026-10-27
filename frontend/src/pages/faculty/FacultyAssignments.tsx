import { useEffect, useState, useRef, ChangeEvent } from "react"
import {
  getAssignments,
  getFacultyCourses,
  createAssignment,
  getAssignmentSubmissions,
  updateAssignment,
  gradeSubmission,
  returnSubmission,
  type Assignment as BackendAssignment,
  type FacultyCourse,
  type Submission as BackendSubmission,
  type SubmissionFile,
} from "../../api/assignments"
import { getFacultyCourseStudents } from "../../api/faculty"
import { useToast } from "../../components/ui/ToastContext"
import { previewFile } from "../../api/files"

const palette = ["#2563EB", "#9333EA", "#F97316", "#16A34A", "#0891B2", "#D97706"]

interface Announcement {
  id: number
  courseId: number
  title: string
  content: string
  createdAt: string
  refFiles?: string[]
}

interface UiCourse {
  id: number
  name: string
  code: string
  description: string
  facultyId: string
}

interface UiSubmission {
  id: number | null
  studentId: number
  studentName: string
  studentRollNo: string
  status: "draft" | "submitted" | "returned" | "not_submitted"
  grade: number | null
  feedback: string | null
  submittedAt: string | null
  isLate: boolean
  attachedFiles: SubmissionFile[]
}

interface UiAssignment {
  id: number
  title: string
  courseId: number
  description: string
  instructions: string
  due: string
  dueDate: string
  closeDate?: string
  maxMarks: number
  referenceMaterials: string[]
  isActive: boolean
  submissions: UiSubmission[]
}

const formatDueDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const toIsoDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const isHandedIn = (submission: UiSubmission) =>
  submission.status === "submitted" || submission.status === "returned"

const getAssignmentTimingStatus = (dueDate: string) => {
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return "Date unavailable"

  const now = new Date()
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  if (dueDay === today) return "Due Today"
  return dueDay > today ? "Upcoming" : "Past Due"
}

export default function FacultyAssignments() {
  const { showToast } = useToast()

  const assignmentFileInputRef = useRef<HTMLInputElement>(null)
  const announcementFileInputRef = useRef<HTMLInputElement>(null)

  const [facultyCourses, setFacultyCourses] = useState<FacultyCourse[]>([])
  const [backendAssignments, setBackendAssignments] = useState<BackendAssignment[]>([])
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState<
    Record<number, UiSubmission[]>
  >({})
  const [enrolledStudentCounts, setEnrolledStudentCounts] = useState<
    Record<number, number>
  >({})
  const [loading, setLoading] = useState(true)

  const myCourses: UiCourse[] = facultyCourses.map((course) => ({
    id: course.faculty_course_id,
    name: course.course_name,
    code: course.course_code,
    description: `${course.year} Year • Semester ${course.sem} • Division ${course.div}`,
    facultyId: course.faculty_id,
  }))

  const myAssignments: UiAssignment[] = backendAssignments.map((assignment) => ({
    id: assignment.assignment_id,
    title: assignment.title,
    courseId: assignment.faculty_course,
    description: assignment.description || "",
    instructions: "",
    due: formatDueDate(assignment.due_date),
    dueDate: assignment.due_date,
    maxMarks: assignment.max_marks,
    referenceMaterials: assignment.files.map((file) => file.file_name),
    isActive: assignment.is_active,
    submissions: submissionsByAssignment[assignment.assignment_id] ?? [],
  }))

  const toUiSubmission = (submission: BackendSubmission): UiSubmission => ({
    id: submission.submission_id,
    studentId: submission.student_id,
    studentName: submission.student_name,
    studentRollNo: submission.student_roll_no,
    status: submission.status,
    grade: submission.marks,
    feedback: submission.feedback,
    submittedAt: submission.submitted_at
      ? formatDueDate(submission.submitted_at)
      : null,
    isLate: submission.is_late,
    attachedFiles: submission.files,
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [coursesData, assignmentsData] = await Promise.all([
          getFacultyCourses(),
          getAssignments(),
        ])
        setFacultyCourses(coursesData)
        setBackendAssignments(assignmentsData)

        const [submissionResults, rosterResults] = await Promise.all([
          Promise.allSettled(
            assignmentsData.map((assignment) =>
              getAssignmentSubmissions(assignment.assignment_id)
            )
          ),
          Promise.allSettled(
            [...new Set(assignmentsData.map((assignment) => assignment.faculty_course))]
              .map(async (facultyCourseId) => ({
                facultyCourseId,
                students: await getFacultyCourseStudents(facultyCourseId),
              }))
          ),
        ])
        const submissions: Record<number, UiSubmission[]> = {}
        const studentCounts: Record<number, number> = {}
        let failedLoads = 0

        submissionResults.forEach((result, index) => {
          const assignment = assignmentsData[index]
          if (result.status === "fulfilled") {
            submissions[assignment.assignment_id] =
              result.value.map(toUiSubmission)
          } else {
            failedLoads += 1
            console.error(
              `Failed to load submissions for assignment ${assignment.assignment_id}:`,
              result.reason
            )
            submissions[assignment.assignment_id] = []
          }
        })

        rosterResults.forEach((result) => {
          if (result.status === "fulfilled") {
            studentCounts[result.value.facultyCourseId] = result.value.students.length
          } else {
            failedLoads += 1
            console.error("Failed to load faculty course roster:", result.reason)
          }
        })

        setSubmissionsByAssignment(submissions)
        setEnrolledStudentCounts(studentCounts)
        if (failedLoads > 0) {
          showToast(
            "Some assignment turn-ins or course rosters could not be loaded. Please refresh and try again.",
            "error"
          )
        }
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Failed to load assignments",
          "error"
        )
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [showToast])

  // Navigation States
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<"assignments" | "announcements">("assignments")

  // Modal / Form States
  const [showCreateAssignment, setShowCreateAssignment] = useState(false)
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false)
  const [showEditAssignment, setShowEditAssignment] = useState(false)

  // Evaluation Drafts
  const [draftMarks, setDraftMarks] = useState<Record<number, string>>({})
  const [draftFeedback, setDraftFeedback] = useState<Record<number, string>>({})
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [savingGrade, setSavingGrade] = useState(false)
  const [returningSubmission, setReturningSubmission] = useState(false)

  // Custom Local State for Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    refFiles: [] as string[],
    newRefInput: "",
  })

  // Assignment Form State (Used for both Create & Edit)
  const [form, setForm] = useState({
    id: null as number | null,
    title: "",
    courseId: "",
    desc: "",
    instructions: "",
    due: "",
    closeDate: "",
    maxMarks: "100",
    refFiles: [] as string[],
    newRefInput: "",
  })

  // Selected Course & Assignment Helpers
  const selectedCourse = myCourses.find((c) => c.id === selectedCourseId)
  const subjectAssignments = myAssignments.filter((a) => a.courseId === selectedCourseId)
  const selectedAssignment = myAssignments.find(
    (assignment) => assignment.id === selectedAssignmentId
  )
  const selectedStudent =
    selectedAssignment?.submissions.find(
      (submission) => submission.studentId === selectedStudentId
    ) ?? null
  const handedInSubmissions =
    selectedAssignment?.submissions.filter(isHandedIn) ?? []
  const ungradedSubmissions = handedInSubmissions.filter(
    (submission) => submission.grade === null
  )
  const gradedSubmissions = handedInSubmissions.filter(
    (submission) => submission.grade !== null
  )

  const colorFor = (courseId: number | null) => {
    const idx = myCourses.findIndex((c) => c.id === courseId)
    return palette[Math.max(idx, 0) % palette.length]
  }

  // File Handler - Assignment (Local Upload)
  const handleAssignmentFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fileNames = Array.from(files).map((f) => f.name)
    setForm((prev) => ({
      ...prev,
      refFiles: [...prev.refFiles, ...fileNames],
    }))
    e.target.value = ""
  }

  const handleAddFile = () => {
    if (!form.newRefInput.trim()) return
    setForm((prev) => ({
      ...prev,
      refFiles: [...prev.refFiles, prev.newRefInput.trim()],
      newRefInput: "",
    }))
  }

  const handleRemoveFile = (index: number) => {
    setForm((prev) => ({
      ...prev,
      refFiles: prev.refFiles.filter((_, i) => i !== index),
    }))
  }

  // File Handler - Announcement (Local Upload)
  const handleAnnouncementFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fileNames = Array.from(files).map((f) => f.name)
    setAnnouncementForm((prev) => ({
      ...prev,
      refFiles: [...prev.refFiles, ...fileNames],
    }))
    e.target.value = ""
  }

  const handleAddAnnouncementFile = () => {
    if (!announcementForm.newRefInput.trim()) return
    setAnnouncementForm((prev) => ({
      ...prev,
      refFiles: [...prev.refFiles, prev.newRefInput.trim()],
      newRefInput: "",
    }))
  }

  const handleRemoveAnnouncementFile = (index: number) => {
    setAnnouncementForm((prev) => ({
      ...prev,
      refFiles: prev.refFiles.filter((_, i) => i !== index),
    }))
  }

  const resetForm = () => {
    setForm({
      id: null,
      title: "",
      courseId: String(selectedCourseId ?? myCourses[0]?.id ?? ""),
      desc: "",
      instructions: "",
      due: "",
      closeDate: "",
      maxMarks: "100",
      refFiles: [],
      newRefInput: "",
    })
  }

  // Open Edit Form
  const openEditModal = () => {
    if (!selectedAssignment) return

    const backendAssignment = backendAssignments.find(
      (assignment) => assignment.assignment_id === selectedAssignment.id
    )
    if (!backendAssignment) return

    setForm({
      id: selectedAssignment.id,
      title: backendAssignment.title,
      courseId: String(backendAssignment.faculty_course),
      desc: backendAssignment.description || "",
      instructions: "",
      due: backendAssignment.due_date,
      closeDate: "",
      maxMarks: String(backendAssignment.max_marks),
      refFiles: backendAssignment.files.map((file) => file.file_name),
      newRefInput: "",
    })
    setShowEditAssignment(true)
  }

  // Submit Create Assignment
  const submitCreate = async () => {
    if (!form.title.trim() || !form.due.trim()) {
      showToast("Title and due date are required", "error")
      return
    }

    const facultyCourseId = Number(form.courseId)
    if (!facultyCourseId) {
      showToast("Select a subject for the assignment", "error")
      return
    }

    const dueDate = toIsoDate(form.due)
    if (!dueDate) {
      showToast("Enter a valid due date", "error")
      return
    }

    try {
      const description = [form.desc.trim(), form.instructions.trim()]
        .filter(Boolean)
        .join("\n\n")

      const created = await createAssignment({
        faculty_course: facultyCourseId,
        title: form.title.trim(),
        description,
        due_date: dueDate,
        max_marks: Number(form.maxMarks) || 100,
        allow_late_submission: true,
        is_active: true,
      })

      setBackendAssignments((prev) => [created, ...prev])
      showToast("Assignment created and published", "success")
      setShowCreateAssignment(false)
      setSelectedAssignmentId(created.assignment_id)
      setSelectedStudentId(null)
      resetForm()
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to create assignment",
        "error"
      )
    }
  }

  // Submit Update Assignment
  const submitUpdate = async () => {
    if (!form.id || !form.title.trim() || !form.due.trim()) {
      showToast("Title and due date are required", "error")
      return
    }

    const dueDate = toIsoDate(form.due)
    if (!dueDate) {
      showToast("Enter a valid due date", "error")
      return
    }

    try {
      const description = [form.desc.trim(), form.instructions.trim()]
        .filter(Boolean)
        .join("\n\n")

      const updated = await updateAssignment(form.id, {
        title: form.title.trim(),
        description,
        due_date: dueDate,
        max_marks: Number(form.maxMarks) || 100,
      })

      setBackendAssignments((prev) =>
        prev.map((assignment) =>
          assignment.assignment_id === updated.assignment_id
            ? updated
            : assignment
        )
      )
      showToast("Assignment updated successfully", "success")
      setShowEditAssignment(false)
      resetForm()
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to update assignment",
        "error"
      )
    }
  }

  // Submit Announcement
  const submitAnnouncement = () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim() || !selectedCourseId) {
      showToast("Title and content are required", "error")
      return
    }

    const finalFiles = [...announcementForm.refFiles]
    if (announcementForm.newRefInput.trim()) {
      finalFiles.push(announcementForm.newRefInput.trim())
    }

    setAnnouncements((prev) => [
      ...prev,
      {
        id: Date.now(),
        courseId: selectedCourseId,
        title: announcementForm.title.trim(),
        content: announcementForm.content.trim(),
        createdAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        refFiles: finalFiles,
      },
    ])
    showToast("Announcement published", "success")
    setAnnouncementForm({ title: "", content: "", refFiles: [], newRefInput: "" })
    setShowCreateAnnouncement(false)
  }

  
  const openSubmissionFile = (file: SubmissionFile) => {
    if (!selectedAssignment) {
      showToast("Select an assignment first.", "error")
      return
    }

    if (!file.submission_file_id || !file.file_name) {
      showToast("This submission file is missing required information.", "error")
      return
    }

    void previewFile(
      `/api/academics/assignments/${selectedAssignment.id}/submission/files/${file.submission_file_id}/file/`,
      file.file_name
    ).catch((error: unknown) => {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to preview this submission file.",
        "error"
      )
    })
  }


  const saveGrade = async (submissionId: number, studentId: number) => {
    if (!selectedAssignment) {
      showToast("Select an assignment first", "error")
      return
    }

    const submission = selectedAssignment.submissions.find(
      (item) => item.studentId === studentId
    )
    if (!submission || submission.status !== "submitted") {
      showToast("Only submitted work can be graded", "error")
      return
    }

    const rawMarks =
      draftMarks[studentId] ?? String(submission.grade ?? "")
    if (rawMarks.trim() === "") {
      showToast("Enter marks before saving", "error")
      return
    }

    const marks = Number(rawMarks)
    if (
      !Number.isInteger(marks) ||
      marks < 0 ||
      marks > selectedAssignment.maxMarks
    ) {
      showToast(
        `Marks must be a whole number between 0 and ${selectedAssignment.maxMarks}`,
        "error"
      )
      return
    }

    const feedback =
      draftFeedback[studentId] ?? submission.feedback ?? ""

    try {
      setSavingGrade(true)
      const updated = await gradeSubmission(
        selectedAssignment.id,
        submissionId,
        marks,
        feedback
      )
      const updatedUiSubmission = toUiSubmission(updated)

      setSubmissionsByAssignment((previous) => ({
        ...previous,
        [selectedAssignment.id]: (
          previous[selectedAssignment.id] ?? []
        ).map((item) =>
          item.studentId === studentId ? updatedUiSubmission : item
        ),
      }))
      setDraftMarks((previous) => {
        const next = { ...previous }
        delete next[studentId]
        return next
      })
      setDraftFeedback((previous) => {
        const next = { ...previous }
        delete next[studentId]
        return next
      })
      showToast("Grade and feedback saved", "success")
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to save grade",
        "error"
      )
    } finally {
      setSavingGrade(false)
    }
  }

  const handleReturnSubmission = async (
    submissionId: number,
    studentId: number
  ) => {
    if (!selectedAssignment) return

    const submission = selectedAssignment.submissions.find(
      (item) => item.studentId === studentId
    )
    if (
      !submission ||
      submission.status !== "submitted" ||
      submission.grade === null
    ) {
      showToast("Save a grade before returning this work", "error")
      return
    }

    try {
      setReturningSubmission(true)
      const updated = await returnSubmission(
        selectedAssignment.id,
        submissionId
      )
      const updatedUiSubmission = toUiSubmission(updated)

      setSubmissionsByAssignment((previous) => ({
        ...previous,
        [selectedAssignment.id]: (
          previous[selectedAssignment.id] ?? []
        ).map((item) =>
          item.studentId === studentId ? updatedUiSubmission : item
        ),
      }))
      showToast("Evaluated work returned to the student", "success")
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to return submission",
        "error"
      )
    } finally {
      setReturningSubmission(false)
    }
  }

  // ---------------------------------------------------------------------------
  // RENDER: LEVEL 1 — SUBJECT CARDS VIEW
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-[#94A3B8] text-[13px]">
          Loading your subjects and assignments...
        </div>
      </div>
    )
  }

  if (!selectedCourseId) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">Your Subjects</h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">Select a subject to view and manage assignments or announcements.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {myCourses.map((course) => {
            const courseAssignments = myAssignments.filter((a) => a.courseId === course.id)
            const activeCount = courseAssignments.filter((a) => a.isActive).length
            const color = colorFor(course.id)

            return (
              <button
                key={course.id}
                onClick={() => {
                  setSelectedCourseId(course.id)
                  setSelectedAssignmentId(null)
                  setSelectedStudentId(null)
                  setActiveTab("assignments")
                  setShowCreateAssignment(false)
                  setShowCreateAnnouncement(false)
                }}
                className="text-left bg-white rounded-xl border border-[#E2E8F0] p-5 hover:border-[#2563EB]/40 hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className="w-1.5 h-full absolute left-0 top-0" style={{ backgroundColor: color }} />
                <div className="pl-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
                      {course.code || "Course"}
                    </span>
                    <span className="text-[11px] text-[#94A3B8] font-medium">{courseAssignments.length} total assignments</span>
                  </div>
                  <h2 className="text-[16px] font-bold text-[#1E293B] group-hover:text-[#2563EB] transition-colors mb-1">
                    {course.name}
                  </h2>
                  <p className="text-[12px] text-[#64748B] line-clamp-2 mb-4">{course.description || "No description provided."}</p>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                    <span className="text-[12px] font-semibold text-[#16A34A]">{activeCount} Active</span>
                    <span className="text-[12px] font-semibold text-[#2563EB] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                      View Hub →
                    </span>
                  </div>
                </div>
              </button>
            )
          })}

          {myCourses.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-[#94A3B8] text-[13px]">
              No assigned courses found for your faculty account.
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: LEVEL 2 & 3 — SUBJECT HUB & ASSIGNMENT DETAILS
  // ---------------------------------------------------------------------------
  const subjectAnnouncements = announcements.filter((a) => a.courseId === selectedCourseId)

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header Navigation */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <button
            onClick={() => {
              setSelectedCourseId(null)
              setSelectedAssignmentId(null)
              setSelectedStudentId(null)
              setShowCreateAssignment(false)
              setShowCreateAnnouncement(false)
            }}
            className="text-[12px] font-medium text-[#2563EB] hover:underline mb-1 inline-flex items-center gap-1"
          >
            ← Back to All Subjects
          </button>
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">{selectedCourse?.name}</h1>
          <p className="text-[13px] text-[#64748B]">Manage coursework, post updates, and grade submissions</p>
        </div>

        {/* Create Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowCreateAnnouncement(true)
              setShowCreateAssignment(false)
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#374151] text-[13px] font-semibold hover:bg-[#F8FAFC] transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.684A1.76 1.76 0 013 12V8a1.76 1.76 0 012.436-1.684l.232.08" />
            </svg>
            Create Announcement
          </button>

          <button
            onClick={() => {
              resetForm()
              setShowCreateAssignment(true)
              setShowCreateAnnouncement(false)
              setSelectedAssignmentId(null)
              setSelectedStudentId(null)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Assignment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-[#E2E8F0] mb-6">
        <button
          onClick={() => setActiveTab("assignments")}
          className={`pb-2.5 text-[13px] font-semibold transition-all relative ${
            activeTab === "assignments" ? "text-[#2563EB]" : "text-[#64748B] hover:text-[#1E293B]"
          }`}
        >
          Assignments ({subjectAssignments.length})
          {activeTab === "assignments" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          className={`pb-2.5 text-[13px] font-semibold transition-all relative ${
            activeTab === "announcements" ? "text-[#2563EB]" : "text-[#64748B] hover:text-[#1E293B]"
          }`}
        >
          Announcements & Posts ({subjectAnnouncements.length})
          {activeTab === "announcements" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-full" />}
        </button>
      </div>

      {/* TAB 1: ASSIGNMENTS VIEW */}
      {activeTab === "assignments" && (
        <div className="flex flex-col gap-5">
          {/* Show the assignment list only until an assignment is selected. */}
          {!selectedAssignmentId && !showCreateAssignment && (
            <div className="flex flex-col gap-3">
            {subjectAssignments.map((a) => {
              const handedInCount = a.submissions.filter(isHandedIn).length
              const color = colorFor(a.courseId)
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelectedAssignmentId(a.id)
                    setSelectedStudentId(null)
                    setShowCreateAssignment(false)
                  }}
                  className={`text-left p-4 bg-white rounded-xl border transition-all ${
                    selectedAssignmentId === a.id && !showCreateAssignment
                      ? "border-[#2563EB] shadow-md shadow-[#2563EB]/10"
                      : "border-[#E2E8F0] hover:border-[#2563EB]/30 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-semibold ${selectedAssignmentId === a.id ? "text-[#2563EB]" : "text-[#1E293B]"}`}>
                        {a.title}
                      </div>
                      <div className="text-[11px] text-[#94A3B8] mt-0.5">Due: {a.due}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB]">
                      {a.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F8FAFC] text-[#64748B]">
                      {getAssignmentTimingStatus(a.dueDate)}
                    </span>
                    <span className="text-[11px] text-[#94A3B8]">
                      {handedInCount}/{enrolledStudentCounts[a.courseId] ?? "—"} Turn-ins
                    </span>
                  </div>
                </button>
              )
            })}

            {subjectAssignments.length === 0 && !showCreateAssignment && (
              <div className="text-center py-10 text-[13px] text-[#94A3B8] bg-white rounded-xl border border-[#E2E8F0] p-4">
                No assignments created yet for this subject.
              </div>
            )}
            </div>
          )}

          {/* Full-width assignment creation or detail view */}
          <div className="w-full min-w-0">
            {/* Create Assignment Form */}
            {showCreateAssignment && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
                <h2 className="text-[15px] font-semibold text-[#1E293B] mb-5">Create New Assignment ({selectedCourse?.name})</h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Assignment Title *</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Normalization Exercise"
                      className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 bg-[#F8FAFC]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Max Marks</label>
                      <input
                        type="number"
                        value={form.maxMarks}
                        onChange={(e) => setForm((p) => ({ ...p, maxMarks: e.target.value }))}
                        className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Due Date *</label>
                      <input
                        placeholder="e.g. Aug 20, 2026, 11:59 PM"
                        value={form.due}
                        onChange={(e) => setForm((p) => ({ ...p, due: e.target.value }))}
                        className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-1.5">
                      Close Date <span className="text-[#94A3B8] font-normal">(Optional — restricts Turn In after this date)</span>
                    </label>
                    <input
                      placeholder="e.g. Aug 22, 2026, 11:59 PM"
                      value={form.closeDate}
                      onChange={(e) => setForm((p) => ({ ...p, closeDate: e.target.value }))}
                      className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Description</label>
                    <textarea
                      value={form.desc}
                      onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))}
                      rows={2}
                      placeholder="Brief summary of assignment..."
                      className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-[13px] resize-none focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 bg-[#F8FAFC]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Detailed Instructions (Teams View)</label>
                    <textarea
                      value={form.instructions}
                      onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                      rows={3}
                      placeholder="Provide step-by-step instructions for students..."
                      className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-[13px] resize-none focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 bg-[#F8FAFC]"
                    />
                  </div>

                  {/* Reference Materials List & Upload Field */}
                  <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Reference Materials</label>
                    
                    {/* Hidden Input for Local Device Files */}
                    <input
                      type="file"
                      ref={assignmentFileInputRef}
                      onChange={handleAssignmentFileUpload}
                      className="hidden"
                      multiple
                    />

                    <div className="flex gap-2 mb-2">
                      <input
                        placeholder="e.g. Lab_Manual_v1.pdf or https://docs.example.com"
                        value={form.newRefInput}
                        onChange={(e) => setForm((p) => ({ ...p, newRefInput: e.target.value }))}
                        className="flex-1 h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                      />
                      <button
                        type="button"
                        onClick={handleAddFile}
                        className="px-3.5 py-1.5 rounded-lg bg-[#F1F5F9] text-[#374151] text-[12px] font-semibold hover:bg-[#E2E8F0] transition-colors"
                      >
                        + Add Link
                      </button>
                      <button
                        type="button"
                        onClick={() => assignmentFileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-lg bg-[#2563EB]/10 text-[#2563EB] text-[12px] font-semibold hover:bg-[#2563EB]/20 transition-colors"
                      >
                        📁 Upload File
                      </button>
                    </div>

                    {form.refFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {form.refFiles.map((f, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] rounded-md text-[12px]"
                          >
                            📎 {f}
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="text-[#EF4444] font-bold hover:text-[#DC2626] ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={submitCreate}
                      className="flex-1 py-2.5 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] transition-colors"
                    >
                      Create & Publish
                    </button>
                    <button
                      onClick={() => setShowCreateAssignment(false)}
                      className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Assignment Detail View */}
            {selectedAssignment && !showCreateAssignment && (
              <div>
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 mb-4 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB]"
                        >
                          {selectedAssignment.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F8FAFC] text-[#64748B]">
                          {getAssignmentTimingStatus(selectedAssignment.dueDate)}
                        </span>
                        <span className="text-[11px] text-[#94A3B8]">Due {selectedAssignment.due}</span>
                        {(selectedAssignment as any).closeDate && (
                          <span className="text-[11px] text-[#EF4444] font-medium">
                            · Closes {(selectedAssignment as any).closeDate}
                          </span>
                        )}
                      </div>
                      <h2 className="text-[18px] font-bold text-[#1E293B]">{selectedAssignment.title}</h2>
                      <p className="text-[12px] text-[#64748B] mt-1">{selectedAssignment.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedAssignmentId(null)
                          setSelectedStudentId(null)
                          setShowEditAssignment(false)
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[#374151] text-[12px] font-semibold hover:border-[#2563EB] hover:text-[#2563EB] transition-all"
                      >
                        ← All Assignments
                      </button>
                      <button
                        onClick={openEditModal}
                        className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#374151] hover:border-[#2563EB] hover:text-[#2563EB] transition-all"
                      >
                        ✏️ Update Assignment
                      </button>
                    </div>
                  </div>

                  {/* Attached Reference Files Display */}
                  {selectedAssignment.referenceMaterials && selectedAssignment.referenceMaterials.length > 0 && (
                    <div className="mb-4 pt-3 border-t border-[#F1F5F9]">
                      <div className="text-[11px] font-semibold text-[#64748B] mb-1.5">Reference Materials:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedAssignment.referenceMaterials.map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] text-[12px] text-[#374151] rounded-md font-medium">
                            📎 {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[#F1F5F9]">
                    <div>
                      <div className="text-[11px] text-[#94A3B8] mb-0.5">Submissions</div>
                      <div className="text-[20px] font-bold text-[#1E293B]">
                        {handedInSubmissions.length}
                        <span className="text-[13px] text-[#94A3B8]">/{enrolledStudentCounts[selectedAssignment.courseId] ?? "—"}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#94A3B8] mb-0.5">Ungraded</div>
                      <div className="text-[20px] font-bold text-[#F97316]">
                        {ungradedSubmissions.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#94A3B8] mb-0.5">Avg. Marks</div>
                      <div className="text-[20px] font-bold text-[#1E293B]">
                        {(() => {
                          return gradedSubmissions.length
                            ? Math.round(
                                gradedSubmissions.reduce(
                                  (sum, submission) => sum + (submission.grade ?? 0),
                                  0
                                ) / gradedSubmissions.length
                              )
                            : "—"
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedStudent && (
                  <div className="bg-white rounded-xl border border-[#BFDBFE] p-5 mb-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-[#64748B] mb-1">
                          Submission Evaluation
                        </p>
                        <h3 className="text-[17px] font-bold text-[#1E293B]">
                          {selectedStudent.studentName}
                        </h3>
                        <p className="text-[12px] text-[#64748B] mt-1">
                          Roll No: {selectedStudent.studentRollNo || "—"}
                          {" · "}
                          {selectedStudent.submittedAt ?? "Not submitted"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(null)}
                        className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#64748B] hover:text-[#1E293B]"
                      >
                        Close
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-[11px] font-semibold capitalize">
                        {selectedStudent.status.replace("_", " ")}
                      </span>
                      {selectedStudent.isLate && (
                        <span className="px-2.5 py-1 rounded-full bg-[#FEF2F2] text-[#B91C1C] text-[11px] font-semibold">
                          Late submission
                        </span>
                      )}
                      {selectedStudent.grade !== null && (
                        <span className="px-2.5 py-1 rounded-full bg-[#F0FDF4] text-[#166534] text-[11px] font-semibold">
                          {selectedStudent.grade}/{selectedAssignment.maxMarks} marks
                        </span>
                      )}
                    </div>

                    <div className="mb-5">
                      <h4 className="text-[12px] font-semibold text-[#334155] mb-2">
                        Submitted Files ({selectedStudent.attachedFiles.length})
                      </h4>

                      {selectedStudent.attachedFiles.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {selectedStudent.attachedFiles.map((file) => (
                            <div
                              key={file.submission_file_id}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]"
                            >
                              <div className="min-w-0">
                                <p className="text-[12px] font-medium text-[#1E293B] break-words">
                                  {file.file_name}
                                </p>
                                <p className="text-[10px] text-[#94A3B8] mt-1">
                                  Uploaded {formatDueDate(file.uploaded_at)}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => openSubmissionFile(file)}
                                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] text-[11px] font-semibold hover:bg-[#DBEAFE] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                                aria-label={`Preview ${file.file_name}`}
                                title={`Preview ${file.file_name}`}
                              >
                                Preview ↗
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] text-[#94A3B8] py-3">
                          No files attached to this submission.
                        </p>
                      )}
                    </div>

                    {selectedStudent.status === "submitted" &&
                    selectedStudent.id !== null ? (
                      <div className="border-t border-[#E2E8F0] pt-4">
                        <h4 className="text-[12px] font-semibold text-[#334155] mb-3">
                          Grade and Feedback
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                              Marks (max {selectedAssignment.maxMarks})
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={selectedAssignment.maxMarks}
                              step={1}
                              value={
                                draftMarks[selectedStudent.studentId] ??
                                (selectedStudent.grade === null
                                  ? ""
                                  : String(selectedStudent.grade))
                              }
                              onChange={(event) =>
                                setDraftMarks((previous) => ({
                                  ...previous,
                                  [selectedStudent.studentId]: event.target.value,
                                }))
                              }
                              className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] text-[13px] focus:outline-none focus:border-[#2563EB]"
                              placeholder="Enter marks"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                              Feedback
                            </label>
                            <textarea
                              rows={2}
                              value={
                                draftFeedback[selectedStudent.studentId] ??
                                selectedStudent.feedback ??
                                ""
                              }
                              onChange={(event) =>
                                setDraftFeedback((previous) => ({
                                  ...previous,
                                  [selectedStudent.studentId]: event.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] text-[13px] resize-y focus:outline-none focus:border-[#2563EB]"
                              placeholder="Explain the result, corrections, or areas to improve..."
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            type="button"
                            disabled={savingGrade || returningSubmission}
                            onClick={() => {
                              if (selectedStudent.id !== null) {
                                void saveGrade(
                                  selectedStudent.id,
                                  selectedStudent.studentId
                                )
                              }
                            }}
                            className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-[12px] font-semibold hover:bg-[#1D4ED8] disabled:opacity-50"
                          >
                            {savingGrade ? "Saving..." : "Save Grade"}
                          </button>

                          <button
                            type="button"
                            disabled={
                              savingGrade ||
                              returningSubmission ||
                              selectedStudent.grade === null
                            }
                            onClick={() => {
                              if (selectedStudent.id !== null) {
                                void handleReturnSubmission(
                                  selectedStudent.id,
                                  selectedStudent.studentId
                                )
                              }
                            }}
                            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#334155] text-[12px] font-semibold hover:bg-[#F8FAFC] disabled:opacity-50"
                          >
                            {returningSubmission ? "Returning..." : "Return to Student"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#64748B] border-t border-[#E2E8F0] pt-3">
                        {selectedStudent.status === "returned"
                          ? "This graded work has already been returned to the student."
                          : "This submission is not ready for evaluation. The student must turn it in first."}
                      </p>
                    )}
                  </div>
                )}

                {/* Submissions Table / List */}
                <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 border-b border-[#F1F5F9]">
                    <h3 className="text-[13px] font-semibold text-[#1E293B]">
                      Student Submissions ({selectedAssignment.submissions.length} students)
                    </h3>
                  </div>
                  <div className="divide-y divide-[#F1F5F9]">
                    {selectedAssignment.submissions.map((s) => (
                      <div
                        key={s.id !== null ? `submission-${s.id}` : `student-${s.studentId}`}
                        className={`flex flex-col gap-2 px-5 py-3.5 transition-colors ${
                          selectedStudentId === s.studentId
                            ? "bg-[#F8FAFC]"
                            : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] text-[11px] font-bold flex-shrink-0">
                            {s.studentName[0] ?? "S"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedStudentId(s.studentId)}
                              className="text-left text-[13px] font-semibold text-[#1E293B] hover:text-[#2563EB] hover:underline"
                            >
                              {s.studentName}
                            </button>
                            <div className="text-[11px] text-[#94A3B8]">
                              {s.studentRollNo || "—"} · {s.submittedAt ?? "Not submitted"}
                              {s.isLate && (
                                <span className="ml-2 font-semibold text-[#DC2626]">Late</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              s.status === "draft"
                                ? "bg-[#F8FAFC] text-[#64748B]"
                                : s.status === "not_submitted"
                                  ? "bg-[#F8FAFC] text-[#94A3B8]"
                                  : s.status === "returned"
                                    ? "bg-[#FFF7ED] text-[#C2410C]"
                                    : "bg-[#EFF6FF] text-[#2563EB]"
                            }`}>
                              {s.status === "draft"
                                ? "Draft"
                                : s.status === "not_submitted"
                                  ? "Not submitted"
                                  : s.status === "returned"
                                    ? "Returned"
                                    : "Submitted"}
                            </span>
                            {s.grade !== null && (
                              <span className="text-[13px] font-bold text-[#16A34A]">
                                {s.grade}/{selectedAssignment.maxMarks}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Student attached work */}
                        {s.attachedFiles && s.attachedFiles.length > 0 && (
                          <div className="ml-11 flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[11px] font-medium text-[#64748B]">Attached Work:</span>
                            {s.attachedFiles.map((file) => (
                              <button
                                key={file.submission_file_id}
                                type="button"
                                onClick={() => openSubmissionFile(file)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] rounded-md text-[11px] font-medium hover:bg-[#DCFCE7]"
                              >
                                <span aria-hidden="true">↗</span>
                                {file.file_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedAssignment.submissions.length === 0 && (
                      <div className="px-5 py-8 text-center text-[12px] text-[#94A3B8]">
                        No students found in this assignment's cohort.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!selectedAssignment && !showCreateAssignment && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] flex items-center justify-center h-48 text-[#94A3B8] text-[13px]">
                Select an assignment to view details and submissions
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ANNOUNCEMENTS VIEW */}
      {activeTab === "announcements" && (
        <div className="max-w-[900px] flex flex-col gap-4">
          {showCreateAnnouncement && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <h2 className="text-[14px] font-bold text-[#1E293B] mb-3">Post Announcement for {selectedCourse?.name}</h2>
              <div className="flex flex-col gap-3">
                <input
                  placeholder="Announcement Title..."
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />
                <textarea
                  rows={3}
                  placeholder="Share news, schedule changes, or announcements..."
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[13px] resize-none focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                {/* Announcement Attached Files */}
                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Attachments / Links</label>
                  
                  <input
                    type="file"
                    ref={announcementFileInputRef}
                    onChange={handleAnnouncementFileUpload}
                    className="hidden"
                    multiple
                  />

                  <div className="flex gap-2 mb-2">
                    <input
                      placeholder="Add link or file name..."
                      value={announcementForm.newRefInput}
                      onChange={(e) => setAnnouncementForm((p) => ({ ...p, newRefInput: e.target.value }))}
                      className="flex-1 h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                    />
                    <button
                      type="button"
                      onClick={handleAddAnnouncementFile}
                      className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] text-[#374151] text-[12px] font-semibold hover:bg-[#E2E8F0]"
                    >
                      + Add Link
                    </button>
                    <button
                      type="button"
                      onClick={() => announcementFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-[#2563EB]/10 text-[#2563EB] text-[12px] font-semibold hover:bg-[#2563EB]/20"
                    >
                      📁 Upload File
                    </button>
                  </div>

                  {announcementForm.refFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {announcementForm.refFiles.map((f, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] rounded-md text-[12px]"
                        >
                          📎 {f}
                          <button
                            type="button"
                            onClick={() => handleRemoveAnnouncementFile(idx)}
                            className="text-[#EF4444] font-bold hover:text-[#DC2626] ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setShowCreateAnnouncement(false)}
                    className="px-3 py-1.5 text-[12px] text-[#64748B] hover:text-[#1E293B]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitAnnouncement}
                    className="px-4 py-1.5 rounded-lg bg-[#2563EB] text-white text-[12px] font-semibold hover:bg-[#1D4ED8]"
                  >
                    Post Announcement
                  </button>
                </div>
              </div>
            </div>
          )}

          {subjectAnnouncements.map((post) => (
            <div key={post.id} className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[14px] font-bold text-[#1E293B]">{post.title}</h3>
                <span className="text-[11px] text-[#94A3B8]">{post.createdAt}</span>
              </div>
              <p className="text-[13px] text-[#475569] leading-relaxed">{post.content}</p>

              {post.refFiles && post.refFiles.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex flex-wrap gap-2">
                  {post.refFiles.map((f, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] text-[12px] text-[#374151] rounded-md font-medium">
                      📎 {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {subjectAnnouncements.length === 0 && !showCreateAnnouncement && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-10 text-center text-[13px] text-[#94A3B8]">
              No announcements posted for this subject yet.
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* UPDATE ASSIGNMENT MODAL */}
      {/* --------------------------------------------------------------------- */}
      {showEditAssignment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 w-full max-w-[600px] shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
              <h2 className="text-[16px] font-bold text-[#1E293B]">Update Assignment</h2>
              <button
                onClick={() => setShowEditAssignment(false)}
                className="text-[#94A3B8] hover:text-[#1E293B] text-[18px] font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Assignment Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Max Marks</label>
                  <input
                    type="number"
                    value={form.maxMarks}
                    onChange={(e) => setForm((p) => ({ ...p, maxMarks: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Due Date *</label>
                  <input
                    value={form.due}
                    onChange={(e) => setForm((p) => ({ ...p, due: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#374151] mb-1.5">
                  Close Date <span className="text-[#94A3B8] font-normal">(Optional — restricts Turn In after this date)</span>
                </label>
                <input
                  placeholder="e.g. Aug 22, 2026, 11:59 PM"
                  value={form.closeDate}
                  onChange={(e) => setForm((p) => ({ ...p, closeDate: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Description</label>
                <textarea
                  value={form.desc}
                  onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[13px] resize-none focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Instructions</label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[13px] resize-none focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />
              </div>

              {/* Edit Attached Files */}
              <div>
                <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Reference Materials</label>
                
                <input
                  type="file"
                  ref={assignmentFileInputRef}
                  onChange={handleAssignmentFileUpload}
                  className="hidden"
                  multiple
                />

                <div className="flex gap-2 mb-2">
                  <input
                    placeholder="Add reference file link or name..."
                    value={form.newRefInput}
                    onChange={(e) => setForm((p) => ({ ...p, newRefInput: e.target.value }))}
                    className="flex-1 h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                  />
                  <button
                    type="button"
                    onClick={handleAddFile}
                    className="px-3.5 py-1.5 rounded-lg bg-[#F1F5F9] text-[#374151] text-[12px] font-semibold hover:bg-[#E2E8F0]"
                  >
                    + Add Link
                  </button>
                  <button
                    type="button"
                    onClick={() => assignmentFileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-lg bg-[#2563EB]/10 text-[#2563EB] text-[12px] font-semibold hover:bg-[#2563EB]/20"
                  >
                    📁 Upload File
                  </button>
                </div>

                {form.refFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.refFiles.map((f, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] rounded-md text-[12px]"
                      >
                        📎 {f}
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-[#EF4444] font-bold hover:text-[#DC2626] ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  onClick={submitUpdate}
                  className="flex-1 py-2.5 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowEditAssignment(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}