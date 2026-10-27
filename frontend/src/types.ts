// ---------------------------------------------------------------------------
// Shared domain types used across the whole application (student / faculty /
// admin). Kept in one place so every page and the global store agree on shape.
// ---------------------------------------------------------------------------

// Enforced options for Department, Academic Year, and Division
export type Department =
  | "Information Technology"
  | "Computer Engineering"
  | "Electronics and Computer Science"
  | "Electronics and Telecommunication"
  | "Biomedical"

export type AcademicYear =
  | "First Year"
  | "Second Year"
  | "Third Year"
  | "Fourth Year"

export type Division = "A" | "B" | "C"

// Constant arrays for select inputs and forms across the app
export const DEPARTMENTS: Department[] = [
  "Information Technology",
  "Computer Engineering",
  "Electronics and Computer Science",
  "Electronics and Telecommunication",
  "Biomedical",
]

export const ACADEMIC_YEARS: AcademicYear[] = [
  "First Year",
  "Second Year",
  "Third Year",
  "Fourth Year",
]

export const DIVISIONS: Division[] = ["A", "B", "C"]

export type Role = "student" | "faculty" | "admin"

export interface Account {
  id: number
  backendId?: string
  name: string
  role: Role
  email: string
  password: string // demo-only, plaintext, never do this in production
  department: Department
  year?: AcademicYear // students only
  division?: Division // students only
  status: "active" | "inactive" | "pending"
  avatar: string // single letter
  sem?: number // students only
  rollNo?: string // students only
  designation?: string // faculty only
  createdAt: string
  phone?: string
  address?: string
}

export type AssignmentStatus = "pending" | "inprogress" | "completed"

export interface Submission {
  id: number
  assignmentId: number
  studentId: number
  studentName: string
  submittedAt: string | null
  status: "pending" | "submitted" | "late" | "graded"
  grade: number | null
  feedback: string
  attachedFiles?: string[] // Student uploaded files for "My work"
}

export interface Assignment {
  id: number
  title: string
  subject: string
  courseId: number | null
  description: string
  due: string
  priority: "high" | "medium" | "low"
  createdBy: number // faculty account id
  maxMarks: number
  status: AssignmentStatus // used by the assigned student as personal kanban status
  submissions: Submission[]
  instructions?: string // Faculty detailed instructions
  referenceMaterials?: string[] // Faculty attached files/resources
}

export type EventType = "Workshop" | "Seminar" | "Hackathon" | "Cultural" | "Sports"
export type EventStatus = "upcoming" | "completed" | "cancelled" | "draft"

export interface EventItem {
  id: number
  title: string
  type: EventType
  organizer: string
  date: string
  time: string
  venue: string
  description: string
  capacity: number
  status: EventStatus
  requiresApproval: boolean
  createdBy: number
  registeredUserIds: number[]
  attachments?: string[] // Attached files/resources for the event
}

export type NoticePriority = "high" | "medium" | "low"
export type NoticeStatus = "published" | "draft" | "scheduled" | "archived"
export type NoticeAudience = "all" | "student" | "faculty"

export interface Notice {
  id: number
  title: string
  body: string
  category: string
  dept: Department | "All"
  date: string
  expiry: string
  pinned: boolean
  priority: NoticePriority
  status: NoticeStatus
  audience: NoticeAudience
  createdBy: number
  readBy: number[]
}

export interface LibraryBook {
  id: number
  title: string
  author: string
  isbn: string
  category: string
  totalCopies: number
  availableCopies: number
  coverColor: string
  pdfUrl?: string // Support for digital e-book / Cloudinary URL
}

export interface BorrowRecord {
  id: number
  bookId: number
  userId: number
  borrowedDate?: string
  dueDate?: string
  returnedDate?: string | null
  status: "reserved" | "issued" | "returned" // Two-step borrowing lifecycle
}

export interface Course {
  id: number
  code: string
  name: string
  department: Department
  description?: string
  year?: AcademicYear
  division?: Division
  semester: number
  credits: number
  facultyId: number
  studentIds: number[]
}

export interface AcademicProgram {
  id: number
  name: string
  department: Department
  duration: number
  totalSeats: number
  filledSeats: number
  status: "active" | "inactive"
}

export type AttendanceStatus = "present" | "absent"

export interface AttendanceRecord {
  id: number
  courseId: number
  studentId: number
  date: string
  status: AttendanceStatus
}

export interface ChatMessage {
  id: number
  threadId: number
  senderId: number
  senderName: string
  body: string
  time: string
}

export interface MessageThread {
  id: number
  participantIds: number[]
  participantName: string
  participantRole: string
  lastMessage: string
  lastTime: string
  unread: number
}

export interface LectureResource {
  id: number
  title: string
  courseId: number
  type: "PDF" | "PPT" | "Video" | "Link" | "Doc"
  uploadedAt: string
  size: string
  downloads: number
}