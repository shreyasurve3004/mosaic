import { useEffect, useMemo, useState } from "react"
import { useToast } from "../components/ui/ToastContext"
import { downloadFile, previewFile } from "../api/files"
import {
  getAssignment,
  getAssignments,
  getStudentSubmission,
  uploadSubmissionFiles,
  handInSubmission,
  undoHandInSubmission,
  deleteSubmissionFile,
  type Assignment,
  type Submission,
} from "../api/assignments"
import {
  ArrowLeft,
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Lock,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react"

type ViewLevel = "GRID" | "CHANNEL" | "DETAIL"
type StatusTab = "upcoming" | "past_due" | "completed"

const subjectColors: Record<
  string,
  {
    bg: string
    text: string
    gradient: string
  }
> = {
  "Database Systems": {
    bg: "bg-fuchsia-50",
    text: "text-fuchsia-700",
    gradient: "from-fuchsia-600 to-pink-500",
  },
  "Software Engineering": {
    bg: "bg-sky-50",
    text: "text-sky-700",
    gradient: "from-sky-600 to-blue-500",
  },
  "Operating Systems": {
    bg: "bg-purple-50",
    text: "text-purple-700",
    gradient: "from-purple-600 to-indigo-500",
  },
  "Computer Networks": {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    gradient: "from-emerald-600 to-teal-500",
  },
  "Theory of Computation": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    gradient: "from-amber-600 to-orange-500",
  },
}

const getSubjectStyle = (subject: string) => {
  return (
    subjectColors[subject] || {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      gradient: "from-indigo-600 to-violet-500",
    }
  )
}

function formatDueDate(value: string) {
  const date = new Date(value)

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatSubmittedDate(value: string | null) {
  if (!value) return null

  const date = new Date(value)

  return date.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function isPastDue(assignment: Assignment) {
  return new Date(assignment.due_date).getTime() < Date.now()
}

function isSubmitted(submission: Submission | null) {
  return (
    submission?.status === "submitted" ||
    submission?.status === "returned"
  )
}

function isAssignmentSubmitted(assignment: Assignment) {
  return (
    assignment.my_submission_status === "submitted" ||
    assignment.my_submission_status === "returned"
  )
}

function isEditableSubmission(submission: Submission | null) {
  return (
    submission === null ||
    submission.status === "draft" ||
    submission?.status === "returned"
  )
}

export default function Assignments() {
  const { showToast } = useToast()

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [currentView, setCurrentView] =
    useState<ViewLevel>("GRID")

  const [selectedSubject, setSelectedSubject] =
    useState<string | null>(null)

  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null)

  const [submission, setSubmission] =
    useState<Submission | null>(null)

  const [activeTab, setActiveTab] =
    useState<StatusTab>("upcoming")

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const modernFontClass =
    "font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]"

  useEffect(() => {
    loadAssignments()
  }, [])

  async function loadAssignments() {
    try {
      setLoading(true)

      const data = await getAssignments()

      setAssignments(data)
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to load assignments.",
        "error"
      )
    } finally {
      setLoading(false)
    }
  }

  function handleOpenFile(endpoint: string, fileName: string) {
    void previewFile(endpoint, fileName).catch((error: unknown) => {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to open this file.",
        "error"
      )
    })
  }

  function handleDownloadFile(endpoint: string, fileName: string) {
    void downloadFile(endpoint, fileName).catch((error: unknown) => {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to download this file.",
        "error"
      )
    })
  }

  async function openAssignment(assignment: Assignment) {
    try {
      setSelectedAssignment(assignment)
      setSubmission(null)
      setDetailLoading(true)
      setCurrentView("DETAIL")

      const [latestAssignment, latestSubmission] =
        await Promise.all([
          getAssignment(assignment.assignment_id),
          getStudentSubmission(assignment.assignment_id),
        ])

      setSelectedAssignment(latestAssignment)
      setSubmission(latestSubmission)
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to load assignment.",
        "error"
      )
    } finally {
      setDetailLoading(false)
    }
  }

  function openSubject(subject: string) {
    setSelectedSubject(subject)
    setActiveTab("upcoming")
    setCurrentView("CHANNEL")
  }

  function goBackToChannel() {
    setSubmission(null)
    setCurrentView("CHANNEL")
  }

  function goBackToGrid() {
    setSubmission(null)
    setSelectedSubject(null)
    setSelectedAssignment(null)
    setCurrentView("GRID")
  }

  async function handleFileUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    if (!selectedAssignment) return

    const files = Array.from(event.target.files ?? [])

    if (!files.length) return

    try {
      setActionLoading(true)

      await uploadSubmissionFiles(
        selectedAssignment.assignment_id,
        files
      )

      const updatedSubmission =
        await getStudentSubmission(
          selectedAssignment.assignment_id
        )

      setSubmission(updatedSubmission)

      showToast(
        `${files.length} file${files.length > 1 ? "s" : ""} attached successfully.`,
        "success"
      )
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to upload file.",
        "error"
      )
    } finally {
      setActionLoading(false)
      event.target.value = ""
    }
  }

  async function handleRemoveFile(fileId: number) {
    if (!selectedAssignment) return

    try {
      setActionLoading(true)

      await deleteSubmissionFile(
        selectedAssignment.assignment_id,
        fileId
      )

      setSubmission((current) => {
        if (!current) return current

        return {
          ...current,
          files: current.files.filter(
            (file) => file.submission_file_id !== fileId
          ),
        }
      })

      showToast("File removed.", "info")
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to remove file.",
        "error"
      )
    } finally {
      setActionLoading(false)
    }
  }

  async function handleTurnIn() {
    if (!selectedAssignment) return

    try {
      setActionLoading(true)

      const updatedSubmission = await handInSubmission(
        selectedAssignment.assignment_id
      )

      setSubmission(updatedSubmission)
      setAssignments((current) =>
        current.map((assignment) =>
          assignment.assignment_id ===
          updatedSubmission.assignment_id
            ? {
                ...assignment,
                my_submission_status: updatedSubmission.status,
              }
            : assignment
        )
      )

      showToast(
        `"${selectedAssignment.title}" turned in successfully!`,
        "success"
      )
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to turn in assignment.",
        "error"
      )
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUndoTurnIn() {
    if (!selectedAssignment) return

    try {
      setActionLoading(true)

      const updatedSubmission =
        await undoHandInSubmission(
          selectedAssignment.assignment_id
        )

      setSubmission(updatedSubmission)
      setAssignments((current) =>
        current.map((assignment) =>
          assignment.assignment_id ===
          updatedSubmission.assignment_id
            ? {
                ...assignment,
                my_submission_status: updatedSubmission.status,
              }
            : assignment
        )
      )

      showToast(
        "Turn in undone. You can now edit your work.",
        "info"
      )
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to undo turn in.",
        "error"
      )
    } finally {
      setActionLoading(false)
    }
  }

  const subjects = useMemo(() => {
    return Array.from(
      new Set(
        assignments.map(
          (assignment) => assignment.course_name
        )
      )
    )
  }, [assignments])

  const subjectAssignments = useMemo(() => {
    if (!selectedSubject) return []

    return assignments.filter(
      (assignment) =>
        assignment.course_name === selectedSubject
    )
  }, [assignments, selectedSubject])

  const filteredAssignments = useMemo(() => {
    return subjectAssignments.filter((assignment) => {
      const submitted = isAssignmentSubmitted(assignment)

      if (activeTab === "completed") {
        return submitted
      }

      if (activeTab === "past_due") {
        return !submitted && isPastDue(assignment)
      }

      return !submitted && !isPastDue(assignment)
    })
  }, [subjectAssignments, activeTab])

  if (loading) {
    return (
      <div
        className={`min-h-screen bg-[#F5F5F5] p-4 md:p-5 max-w-[1200px] mx-auto ${modernFontClass}`}
      >
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">
            Loading assignments...
          </p>
        </div>
      </div>
    )
  }

  if (currentView === "DETAIL" && selectedAssignment) {
    const submitted = isSubmitted(submission)
    const editable = isEditableSubmission(submission)

    return (
      <div
        className={`min-h-screen bg-[#F5F5F5] p-4 md:p-5 max-w-[1200px] mx-auto text-[#1E293B] ${modernFontClass}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 mb-4 bg-white p-3.5 rounded-xl border shadow-sm">
          <button
            onClick={goBackToChannel}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>
              Back to {selectedAssignment.course_name}
            </span>
          </button>

          <div className="flex items-center gap-3">
            {submission?.marks !== null && submission?.marks !== undefined ? (
              <div className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300">
                Graded: {submission.marks} /{" "}
                {selectedAssignment.max_marks}
              </div>
            ) : null}

            {submission?.status === "submitted" ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs italic text-slate-500 font-medium">
                  <Check className="w-3.5 h-3.5 text-blue-600" />

                  <span>
                    Turned in{" "}
                    {formatSubmittedDate(
                      submission.submitted_at
                    )}
                  </span>
                </span>

                <button
                  onClick={handleUndoTurnIn}
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-medium shadow-sm transition-all"
                >
                  Undo turn in
                </button>
              </div>
            ) : (
              <button
                onClick={handleTurnIn}
                disabled={
                  actionLoading ||
                  !submission ||
                  submission.files.length === 0
                }
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-medium shadow-sm transition-all"
              >
                Turn in
              </button>
            )}
          </div>
        </div>

        {detailLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 text-center">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />

            <p className="text-xs text-slate-500">
              Loading assignment details...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {selectedAssignment.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />

                      Due{" "}
                      {formatDueDate(
                        selectedAssignment.due_date
                      )}
                    </span>

                    <span>•</span>

                    <span className="text-blue-600 font-medium">
                      {selectedAssignment.course_name}
                    </span>

                    <span>•</span>

                    <span>
                      {selectedAssignment.faculty_name}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Instructions
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {selectedAssignment.description ||
                      "No specific instructions provided for this assignment."}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Reference Materials
                </h3>

                {selectedAssignment.files.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No reference files attached.
                  </p>
                ) : (
                  selectedAssignment.files.map((file) => (
                    <div
                      key={file.assignment_file_id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 bg-pink-100 text-pink-600 rounded-md flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>

                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => {
                            event.preventDefault()
                            handleOpenFile(
                              `/api/academics/assignments/`
                                + `${selectedAssignment.assignment_id}/files/`
                                + `${file.assignment_file_id}/file/`,
                              file.file_name
                            )
                          }}
                          className="font-semibold text-slate-800 truncate hover:underline"
                          title={`Open ${file.file_name}`}
                        >
                          {file.file_name}
                        </a>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadFile(
                              `/api/academics/assignments/`
                                + `${selectedAssignment.assignment_id}/files/`
                                + `${file.assignment_file_id}/file/?download=1`,
                              file.file_name
                            )
                          }
                          className="p-1.5 text-slate-500 hover:text-blue-600 transition-colors"
                          title="Download file"
                          aria-label={`Download ${file.file_name}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    My Work
                  </h3>

                  {submission?.status === "submitted" && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                      <Lock className="w-3 h-3" />
                      Locked after turn in
                    </span>
                  )}
                </div>

                {!submission || submission.files.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No files attached yet. Upload your work below.
                  </p>
                ) : (
                  submission.files.map((file) => (
                    <div
                      key={file.submission_file_id}
                      className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0" />

                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => {
                            event.preventDefault()
                            handleOpenFile(
                              `/api/academics/assignments/`
                                + `${selectedAssignment.assignment_id}/submission/files/`
                                + `${file.submission_file_id}/file/`,
                              file.file_name
                            )
                          }}
                          className="font-medium text-emerald-950 truncate hover:underline"
                          title={`Open ${file.file_name}`}
                        >
                          {file.file_name}
                        </a>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadFile(
                              `/api/academics/assignments/`
                                + `${selectedAssignment.assignment_id}/submission/files/`
                                + `${file.submission_file_id}/file/?download=1`,
                              file.file_name
                            )
                          }
                          className="p-1 text-emerald-700 hover:text-emerald-900"
                          title="Download file"
                          aria-label={`Download ${file.file_name}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {editable && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveFile(
                                file.submission_file_id
                              )
                            }
                            disabled={actionLoading}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Remove attachment"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {editable && (
                  <div className="pt-1">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors">
                      <Paperclip className="w-3.5 h-3.5" />

                      <span>
                        {actionLoading
                          ? "Uploading..."
                          : "Attach files"}
                      </span>

                      <input
                        type="file"
                        multiple
                        className="hidden"
                        disabled={actionLoading}
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                )}

                {submission?.status === "submitted" && (
                  <div className="pt-1">
                    <p className="text-[10px] text-slate-400">
                      Undo turn in to modify your submission.
                    </p>
                  </div>
                )}
              </div>

              {submission?.feedback && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-0.5">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Faculty Feedback
                  </div>

                  <div className="text-xs text-emerald-900 font-medium">
                    {submission.feedback}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Points Allocation
                  </div>

                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {selectedAssignment.max_marks
                      ? `${selectedAssignment.max_marks} pts`
                      : "Unrated"}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />

                  <span>
                    {selectedAssignment.allow_late_submission
                      ? "Late submissions are allowed for this assignment."
                      : "Submissions after the due date are not accepted."}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Assignment Details
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">
                      Faculty
                    </span>

                    <span className="text-slate-700 font-medium text-right">
                      {selectedAssignment.faculty_name}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">
                      Division
                    </span>

                    <span className="text-slate-700 font-medium">
                      {selectedAssignment.div || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">
                      Academic Year
                    </span>

                    <span className="text-slate-700 font-medium">
                      {selectedAssignment.academic_year}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">
                      Status
                    </span>

                    <span className="text-slate-700 font-medium capitalize">
                      {!submission
                        ? "Not submitted"
                        : submission.status === "returned"
                        ? "Returned"
                        : submission.status === "submitted"
                          ? "Submitted"
                          : "Draft"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (currentView === "CHANNEL" && selectedSubject) {
    const subjStyle = getSubjectStyle(selectedSubject)

    return (
      <div
        className={`min-h-screen bg-[#F5F5F5] p-4 md:p-5 max-w-[1200px] mx-auto text-[#1E293B] ${modernFontClass}`}
      >
        <button
          onClick={goBackToGrid}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 mb-4 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>All Subject Channels</span>
        </button>

        <div className="p-4 bg-white border border-slate-200 rounded-xl mb-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg bg-gradient-to-tr ${subjStyle.gradient} text-white font-bold text-sm flex items-center justify-center`}
            >
              {selectedSubject
                .substring(0, 2)
                .toUpperCase()}
            </div>

            <div>
              <h1 className="text-base font-bold text-slate-900">
                {selectedSubject}
              </h1>

              <p className="text-xs text-slate-500">
                Assignments and submission workspace
              </p>
            </div>
          </div>

          <BookOpen className="w-5 h-5 text-slate-300" />
        </div>

        <div className="flex items-center gap-6 border-b border-slate-200 mb-4">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`pb-2 text-xs font-semibold transition-all relative ${
              activeTab === "upcoming"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Upcoming
          </button>

          <button
            onClick={() => setActiveTab("past_due")}
            className={`pb-2 text-xs font-semibold transition-all relative ${
              activeTab === "past_due"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Past due

            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" />
          </button>

          <button
            onClick={() => setActiveTab("completed")}
            className={`pb-2 text-xs font-semibold transition-all relative ${
              activeTab === "completed"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Completed
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {filteredAssignments.map((assignment) => {
            const done = isAssignmentSubmitted(assignment)

            return (
              <div
                key={assignment.assignment_id}
                className="p-3 bg-white border border-slate-200 hover:border-blue-500 rounded-xl shadow-sm transition-all flex flex-wrap items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${subjStyle.gradient} text-white font-bold text-xs flex items-center justify-center shrink-0`}
                  >
                    {selectedSubject
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {assignment.title}
                    </h3>

                    <p className="text-[11px] text-slate-500 font-normal">
                      Due{" "}
                      {formatDueDate(
                        assignment.due_date
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">
                    {assignment.max_marks
                      ? `${assignment.max_marks} points`
                      : "Unrated"}
                  </span>

                  {done && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Submitted
                    </span>
                  )}

                  <button
                    onClick={() =>
                      openAssignment(assignment)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-all shadow-sm"
                  >
                    View assignment
                  </button>
                </div>
              </div>
            )
          })}

          {filteredAssignments.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs bg-white rounded-xl border border-dashed border-slate-200">
              No{" "}
              {activeTab.replace("_", " ")} assignments found
              for {selectedSubject}.
            </div>
          )}
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />

            <p className="text-xs text-slate-500">
              Assignments shown here are linked to your enrolled
              courses and current academic records.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`p-4 md:p-5 max-w-[1200px] mx-auto min-h-screen bg-[#F5F5F5] text-[#1E293B] ${modernFontClass}`}
    >
      <div className="mb-5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Class Channels
          </h1>

          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Select a subject channel to view assignments and submit
            work.
          </p>
        </div>

        <div className="hidden sm:flex p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
          <Sparkles className="w-5 h-5" />
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />

          <h2 className="text-sm font-semibold text-slate-700">
            No assignments available
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Assignments for your enrolled courses will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {subjects.map((subject) => {
            const count = assignments.filter(
              (assignment) =>
                assignment.course_name === subject
            ).length

            const style = getSubjectStyle(subject)

            return (
              <div
                key={subject}
                onClick={() => openSubject(subject)}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between h-[140px]"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`w-9 h-9 rounded-lg bg-gradient-to-tr ${style.gradient} text-white font-bold text-xs flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}
                  >
                    {subject
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>

                  <span
                    className={`text-[10px] font-semibold ${style.text} ${style.bg} px-2 py-0.5 rounded-full border border-slate-200`}
                  >
                    {count}{" "}
                    {count === 1
                      ? "Assignment"
                      : "Assignments"}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {subject}
                  </h3>

                  <p className="text-[11px] text-slate-500 mt-0.5 font-normal flex items-center gap-1 group-hover:text-slate-700 transition-colors">
                    <span>
                      View assignments and submit work
                    </span>

                    <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}