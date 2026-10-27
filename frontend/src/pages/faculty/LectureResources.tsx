
import { useEffect, useMemo, useState } from "react"
import {
  Folder,
  ChevronRight,
  FileText,
  Upload,
  Calendar,
  Layers,
  ArrowLeft,
  Trash2,
  HardDrive,
  Paperclip,
  Eye,
  Download,
} from "lucide-react"

import { useToast } from "../../components/ui/ToastContext"
import {
  getFacultyResources,
  createResource,
  deleteResource,
  type Resource,
  type ResourceType,
} from "../../api/resources"
import { previewFile, downloadFile } from "../../api/files"
import { getFacultyCourses, type FacultyCourse } from "../../api/assignments"

type Division = "A" | "B" | "C"

type NavLevel =
  | "DEPARTMENT"
  | "SEMESTER"
  | "YEAR"
  | "SUBJECT"
  | "RESOURCE_FOLDER"
  | "DIVISION"
  | "FILES"

const DIVISIONS: Division[] = ["A", "B", "C"]

const RESOURCE_FOLDERS: { type: ResourceType; label: string }[] = [
  { type: "study_material", label: "Study Material" },
  { type: "ppt_notes", label: "PPT / Notes" },
  { type: "ebooks", label: "E-Books" },
  { type: "assignments", label: "Assignments" },
  { type: "practical", label: "Practical" },
  { type: "tutorials", label: "Tutorials" },
  { type: "syllabus", label: "Syllabus" },
  { type: "question_papers", label: "Question Papers" },
  { type: "mse", label: "MSE" },
  { type: "ese", label: "ESE" },
  { type: "other", label: "Other" },
]

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getFileType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? ""

  if (extension === "pdf") return "PDF"
  if (["ppt", "pptx"].includes(extension)) return "PPT"
  if (["doc", "docx"].includes(extension)) return "DOC"
  if (["mp4", "mov", "avi", "mkv"].includes(extension)) return "VIDEO"

  return extension.toUpperCase() || "FILE"
}

export default function LectureResources() {
  const { showToast } = useToast()

  const [courses, setCourses] = useState<FacultyCourse[]>([])
  const [resources, setResources] = useState<Resource[]>([])

  const [selectedDept, setSelectedDept] = useState<string | null>(null)
  const [selectedSem, setSelectedSem] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedResourceType, setSelectedResourceType] =
    useState<ResourceType | null>(null)
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null)

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [form, setForm] = useState({ title: "" })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const activeCourse = courses.find(
    course => course.faculty_course_id === selectedCourseId
  )

  const activeFolder = RESOURCE_FOLDERS.find(
    folder => folder.type === selectedResourceType
  )

  const isPptNotes = selectedResourceType === "ppt_notes"

  const loadCourses = async () => {
    try {
      setLoading(true)
      const data = await getFacultyCourses()
      setCourses(data)

      if (data.length > 0) {
        setSelectedDept(
          data[0].course_code
            ? data[0].course_code.split("-")[0]
            : "Department"
        )
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to load faculty courses.",
        "error"
      )
    } finally {
      setLoading(false)
    }
  }

  const loadResources = async () => {
    try {
      setResources(await getFacultyResources())
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to load resources.",
        "error"
      )
    }
  }

  useEffect(() => {
    void loadCourses()
    void loadResources()
  }, [])

  const semesters = useMemo(() => {
    if (!selectedDept) return []

    return Array.from(new Set(courses.map(course => course.sem))).sort(
      (a, b) => a - b
    )
  }, [courses, selectedDept])

  const academicYears = useMemo(() => {
    if (!selectedSem) return []

    return Array.from(
      new Set(
        courses
          .filter(course => course.sem === selectedSem)
          .map(course => course.academic_year)
      )
    )
  }, [courses, selectedSem])

  const subjectCourses = useMemo(() => {
    if (!selectedSem || !selectedYear) return []

    return courses.filter(
      course =>
        course.sem === selectedSem &&
        course.academic_year === selectedYear
    )
  }, [courses, selectedSem, selectedYear])

  const courseResources = useMemo(() => {
    if (!selectedCourseId) return []

    return resources.filter(
      resource => resource.faculty_course === selectedCourseId
    )
  }, [resources, selectedCourseId])

  const folderResources = useMemo(() => {
    if (!selectedResourceType) return []

    const matchingType = courseResources.filter(
      resource => resource.resource_type === selectedResourceType
    )

    // PPT / Notes must be isolated by the selected resource division.
    // Never show a file with a missing or different division here.
    if (selectedResourceType === "ppt_notes") {
      if (!selectedDivision) return []

      return matchingType.filter(
        resource => resource.resource_division === selectedDivision
      )
    }

    return matchingType
  }, [courseResources, selectedResourceType, selectedDivision])

  const activeLevel = (): NavLevel => {
    if (selectedResourceType === "ppt_notes" && !selectedDivision) {
      return "DIVISION"
    }

    if (selectedResourceType) return "FILES"
    if (selectedCourseId) return "RESOURCE_FOLDER"
    if (selectedYear) return "SUBJECT"
    if (selectedSem) return "YEAR"
    if (selectedDept) return "SEMESTER"

    return "DEPARTMENT"
  }

  const level = activeLevel()

  const resetToRoot = () => {
    setSelectedDept(null)
    setSelectedSem(null)
    setSelectedYear(null)
    setSelectedCourseId(null)
    setSelectedResourceType(null)
    setSelectedDivision(null)
  }

  const openResourceFolder = (type: ResourceType) => {
    setSelectedResourceType(type)
    setSelectedDivision(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)

    if (!form.title) {
      setForm(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, ""),
      }))
    }
  }

  const handleUpload = async () => {
    if (!selectedCourseId || !selectedResourceType) {
      showToast("Please select a subject and resource folder.", "error")
      return
    }

    if (isPptNotes && !selectedDivision) {
      showToast("Please select Division A, B, or C first.", "error")
      return
    }

    if (!form.title.trim()) {
      showToast("Please enter a resource title.", "error")
      return
    }

    if (!selectedFile) {
      showToast("Please select a file to upload.", "error")
      return
    }

    try {
      setUploading(true)

      const resource = await createResource(
        selectedCourseId,
        form.title.trim(),
        selectedResourceType,
        selectedFile,
        isPptNotes ? selectedDivision : null
      )

      setResources(prev => [...prev, resource])

      showToast("Resource uploaded successfully.", "success")
      setForm({ title: "" })
      setSelectedFile(null)
      setShowUploadModal(false)
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to upload resource.",
        "error"
      )
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (resourceId: number) => {
    try {
      await deleteResource(resourceId)

      setResources(prev =>
        prev.filter(resource => resource.resource_id !== resourceId)
      )

      showToast("Resource removed from course repository.", "info")
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to delete resource.",
        "error"
      )
    }
  }

  
  const handleView = async (resource: Resource) => {
    const filename = resource.original_file_name || resource.title

    try {
      await previewFile(
        `/api/academics/resources/${resource.resource_id}/file/`,
        filename
      )
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to preview this resource.",
        "error"
      )
    }
  }

  const handleDownload = async (resource: Resource) => {
    const filename = resource.original_file_name || resource.title

    try {
      await downloadFile(
        `/api/academics/resources/${resource.resource_id}/file/?download=1`,
        filename
      )
      showToast("Download started.", "success")
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to download this resource.",
        "error"
      )
    }
  }

  const renderBadgeType = (type: string) => {
    const styles: Record<string, string> = {
      PDF: "bg-blue-50 text-blue-700 border-blue-200",
      PPT: "bg-amber-50 text-amber-700 border-amber-200",
      DOC: "bg-emerald-50 text-emerald-700 border-emerald-200",
      VIDEO: "bg-purple-50 text-purple-700 border-purple-200",
    }

    return (
      <span
        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
          styles[type] ?? "bg-slate-100 text-slate-700 border-slate-200"
        }`}
      >
        {type}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            Faculty Resource Portal
          </h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            Manage lecture resources for your assigned subjects
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-10 text-center text-[13px] text-[#94A3B8]">
          Loading resources...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            Faculty Resource Portal
          </h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            {resources.length} resources uploaded across {courses.length} assigned
            subject directories
          </p>
        </div>

        {selectedCourseId &&
          selectedResourceType &&
          (!isPptNotes || selectedDivision) && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Upload to {activeFolder?.label}
              {isPptNotes ? ` · Division ${selectedDivision}` : ""}
            </button>
          )}
      </div>

      {/* Breadcrumb */}
      <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex items-center flex-wrap gap-1.5 text-xs text-[#64748B] font-medium mb-4">
        <button
          onClick={resetToRoot}
          className={`flex items-center gap-1 hover:text-blue-600 transition-colors ${
            level === "DEPARTMENT" ? "text-blue-600 font-bold" : ""
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          Departments
        </button>

        {selectedDept && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => {
                setSelectedSem(null)
                setSelectedYear(null)
                setSelectedCourseId(null)
                setSelectedResourceType(null)
                setSelectedDivision(null)
              }}
              className={`hover:text-blue-600 ${
                level === "SEMESTER" ? "text-blue-600 font-bold" : ""
              }`}
            >
              {selectedDept}
            </button>
          </>
        )}

        {selectedSem && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => {
                setSelectedYear(null)
                setSelectedCourseId(null)
                setSelectedResourceType(null)
                setSelectedDivision(null)
              }}
              className={`hover:text-blue-600 ${
                level === "YEAR" ? "text-blue-600 font-bold" : ""
              }`}
            >
              SEM {selectedSem}
            </button>
          </>
        )}

        {selectedYear && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => {
                setSelectedCourseId(null)
                setSelectedResourceType(null)
                setSelectedDivision(null)
              }}
              className={`hover:text-blue-600 ${
                level === "SUBJECT" ? "text-blue-600 font-bold" : ""
              }`}
            >
              {selectedYear}
            </button>
          </>
        )}

        {activeCourse && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => {
                setSelectedResourceType(null)
                setSelectedDivision(null)
              }}
              className={`hover:text-blue-600 ${
                level === "RESOURCE_FOLDER" ? "text-blue-600 font-bold" : ""
              }`}
            >
              {activeCourse.course_name}
            </button>
          </>
        )}

        {activeFolder && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            {isPptNotes && selectedDivision ? (
              <button
                onClick={() => setSelectedDivision(null)}
                className="hover:text-blue-600"
              >
                {activeFolder.label}
              </button>
            ) : (
              <span
                className={
                  level === "DIVISION"
                    ? "text-blue-600 font-bold"
                    : ""
                }
              >
                {activeFolder.label}
              </span>
            )}
          </>
        )}

        {isPptNotes && selectedDivision && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-blue-600 font-bold">
              Division {selectedDivision}
            </span>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {/* Department */}
        {level === "DEPARTMENT" && (
          <div className="divide-y divide-slate-100">
            <div className="px-4 py-2.5 bg-[#F8FAFC] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Department
            </div>
            <div
              onClick={() =>
                setSelectedDept(
                  resources[0]?.department_name ?? "Department"
                )
              }
              className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Folder className="w-5 h-5 text-blue-500 fill-blue-100 group-hover:scale-105 transition-transform" />
                <span className="text-xs font-bold text-[#1E293B]">
                  {resources[0]?.department_name ?? "Department"}
                </span>
              </div>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Faculty Access
              </span>
            </div>
          </div>
        )}

        {/* Semester */}
        {level === "SEMESTER" && (
          <div className="divide-y divide-slate-100">
            <div className="px-4 py-2.5 bg-[#F8FAFC] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Select Semester
            </div>
            {semesters.map(sem => (
              <div
                key={sem}
                onClick={() => {
                  setSelectedSem(sem)
                  setSelectedYear(null)
                  setSelectedCourseId(null)
                  setSelectedResourceType(null)
                  setSelectedDivision(null)
                }}
                className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-indigo-500 fill-indigo-100 group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-semibold text-[#1E293B] group-hover:text-blue-600">
                    SEM {sem}
                  </span>
                </div>
                <span className="text-xs text-slate-400">View Folder</span>
              </div>
            ))}
          </div>
        )}

        {/* Academic Year */}
        {level === "YEAR" && (
          <div className="divide-y divide-slate-100">
            <div className="px-4 py-2.5 bg-[#F8FAFC] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Academic Year
            </div>
            {academicYears.map(year => (
              <div
                key={year}
                onClick={() => setSelectedYear(year)}
                className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-amber-500 group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-semibold text-[#1E293B] group-hover:text-blue-600">
                    {year}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {subjectCourses.length} Subject Folder(s)
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Subjects */}
        {level === "SUBJECT" && (
          <div className="divide-y divide-slate-100">
            <div className="px-4 py-2.5 bg-[#F8FAFC] text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
              <span>Your Assigned Subjects</span>
              <span>Permissions</span>
            </div>

            {subjectCourses.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No subjects assigned for this semester.
              </div>
            ) : (
              subjectCourses.map(course => (
                <div
                  key={course.faculty_course_id}
                  onClick={() => {
                    setSelectedCourseId(course.faculty_course_id)
                    setSelectedResourceType(null)
                    setSelectedDivision(null)
                  }}
                  className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-emerald-500 group-hover:scale-105 transition-transform" />
                    <div>
                      <span className="text-xs font-semibold text-[#1E293B] group-hover:text-blue-600">
                        {course.course_name}
                      </span>
                      <span className="text-[10px] text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded ml-2">
                        {course.course_code}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Manage Resources
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Resource folders */}
        {level === "RESOURCE_FOLDER" && activeCourse && (
          <div>
            <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {activeCourse.course_name} Resource Directory
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Upload and manage resources in your assigned subject folders.
                </p>
              </div>
              <button
                onClick={() => setSelectedCourseId(null)}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-semibold px-2.5 py-1 rounded border border-slate-200 bg-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {RESOURCE_FOLDERS.map(folder => {
                const count = courseResources.filter(
                  resource => resource.resource_type === folder.type
                ).length

                return (
                  <div
                    key={folder.type}
                    onClick={() => openResourceFolder(folder.type)}
                    className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="w-5 h-5 text-blue-500 fill-blue-100 group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-semibold text-[#1E293B] group-hover:text-blue-600">
                        {folder.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {count} file{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Division folders for PPT / Notes */}
        {level === "DIVISION" && activeCourse && activeFolder && (
          <div>
            <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {activeCourse.course_name} · PPT / Notes
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select a division to view or upload its resources.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedResourceType(null)
                  setSelectedDivision(null)
                }}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-semibold px-2.5 py-1 rounded border border-slate-200 bg-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {DIVISIONS.map(division => {
                const count = courseResources.filter(
                  resource =>
                    resource.resource_type === "ppt_notes" &&
                    resource.resource_division === division
                ).length

                return (
                  <div
                    key={division}
                    onClick={() => setSelectedDivision(division)}
                    className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="w-5 h-5 text-indigo-500 fill-indigo-100 group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-semibold text-[#1E293B] group-hover:text-blue-600">
                        Division {division}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {count} file{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Files */}
        {level === "FILES" && activeCourse && activeFolder && (
          <div>
            <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {activeFolder.label}
                  {isPptNotes ? ` · Division ${selectedDivision}` : ""}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeCourse.course_name} · Faculty-owned resource folder
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isPptNotes) {
                      setSelectedDivision(null)
                    } else {
                      setSelectedResourceType(null)
                    }
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-semibold px-2.5 py-1 rounded border border-slate-200 bg-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Resource
                </button>
              </div>
            </div>

            {folderResources.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">
                  No resources uploaded in this folder yet.
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-3 text-xs text-blue-600 font-bold hover:underline inline-block"
                >
                  Click here to upload the first file
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {folderResources.map(resource => {
                  const fileType = getFileType(resource.title)

                  return (
                    <div
                      key={resource.resource_id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-[#1E293B]">
                              {resource.title}
                            </h4>
                            {renderBadgeType(fileType)}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Uploaded by {resource.faculty_name} ·{" "}
                            {formatDate(resource.upload_date)}
                          </p>
                        </div>
                      </div>

                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void handleView(resource)}
                          title="View resource"
                          className="flex items-center gap-1 px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded border border-blue-200 text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        <button
                          onClick={() => void handleDownload(resource)}
                          title="Download resource"
                          className="flex items-center gap-1 px-2.5 py-1 text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200 text-xs font-medium transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>

                        <button
                          onClick={() => void handleDelete(resource.resource_id)}
                          title="Delete resource"
                          className="flex items-center gap-1 px-2.5 py-1 text-red-600 hover:bg-red-50 rounded border border-red-200 text-xs font-medium transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && activeCourse && activeFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden p-6">
            <h3 className="text-base font-bold text-[#1E293B] mb-1">
              Upload New Resource
            </h3>

            <p className="text-xs text-[#64748B] mb-4">
              Uploading to:{" "}
              <span className="font-semibold text-blue-600">
                {activeCourse.course_name}
              </span>{" "}
              →{" "}
              <span className="font-semibold text-blue-600">
                {activeFolder.label}
              </span>
              {isPptNotes && selectedDivision && (
                <>
                  {" "}→{" "}
                  <span className="font-semibold text-blue-600">
                    Division {selectedDivision}
                  </span>
                </>
              )}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Attach File
                </label>
                <div className="relative border border-dashed border-slate-300 bg-slate-50 rounded-lg p-3 text-center hover:bg-slate-100/80 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                    <Paperclip className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">
                      {selectedFile
                        ? selectedFile.name
                        : "Choose a file to attach..."}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Resource Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ title: e.target.value })}
                  placeholder="e.g. Unit 3 - Normalization Slides"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setSelectedFile(null)
                  setForm({ title: "" })
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || (isPptNotes && !selectedDivision)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload File"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
