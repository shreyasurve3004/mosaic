import { useEffect, useState } from "react"
import { AuthProvider, useAuth } from "./store/AuthContext"
import { ToastProvider } from "./components/ui/ToastContext"

import Landing from "./pages/Landing"
import Login from "./pages/Login"
import AppLayout from "./layouts/AppLayout"
import FacultyLayout from "./layouts/FacultyLayout"
import AdminLayout from "./layouts/AdminLayout"
import AdminDashboard from "./pages/admin/AdminDashboard"
import AcademicManagement from "./pages/admin/AcademicManagement"
import Users from "./pages/admin/Users"
import AdminLibrary from "./pages/admin/AdminLibrary"
import AdminNotices from "./pages/admin/AdminNotices"
import AdminEvents from "./pages/admin/AdminEvents"
import Reports from "./pages/admin/Reports"
import AdminSettings from "./pages/admin/AdminSettings"
import Signup from "./pages/Signup"
import Dashboard from "./pages/Dashboard"
import Academics from "./pages/Academics"
import Assignments from "./pages/Assignments"
import Events from "./pages/Events"
import Notices from "./pages/Notices"
import Library from "./pages/Library"
import Profile from "./pages/Profile"
import FacultyDashboard from "./pages/faculty/FacultyDashboard"
import MyCourses from "./pages/faculty/MyCourses"
import CourseWorkspace from "./pages/faculty/CourseWorkspace"
import FacultyAttendance from "./pages/faculty/FacultyAttendance"
import FacultyAssignments from "./pages/faculty/FacultyAssignments"
import LectureResources from "./pages/faculty/LectureResources"
import StudentPerformance from "./pages/faculty/StudentPerformance"
import FacultyEvents from "./pages/faculty/FacultyEvents"
import FacultyNotices from "./pages/faculty/FacultyNotices"
import FacultyProfile from "./pages/faculty/FacultyProfile"
import Settings from "./pages/setting"

type Page = string

const adminPages = new Set([
  "admin-dashboard",
  "admin-academics",
  "admin-users",
  "admin-library",
  "admin-notices",
  "admin-events",
  "admin-reports",
  "admin-settings",
])

const facultyPages = new Set([
  "faculty-dashboard",
  "faculty-courses",
  "faculty-course",
  "faculty-attendance",
  "faculty-assignments",
  "faculty-resources",
  "faculty-performance",
  "faculty-events",
  "faculty-notices",
  "faculty-library",
  "faculty-profile",
  "faculty-settings",
])

const publicPages = new Set(["landing", "login", "signup"])

function homePageFor(role: "student" | "faculty" | "admin") {
  if (role === "faculty") return "faculty-dashboard"
  if (role === "admin") return "admin-dashboard"
  return "dashboard"
}

function AppShell() {
  const { currentUser, logout } = useAuth()
  const [page, setPage] = useState<Page>("landing")
  const [selectedCourse, setSelectedCourse] = useState(1)

  const navigate = (p: string) => setPage(p)

  const openCourse = (courseId: number) => {
    setSelectedCourse(courseId)
    setPage("faculty-course")
  }

  useEffect(() => {
    if (currentUser) {
      const inRightBucket =
        (currentUser.role === "admin" && adminPages.has(page)) ||
        (currentUser.role === "faculty" && facultyPages.has(page)) ||
        (currentUser.role === "student" &&
          !adminPages.has(page) &&
          !facultyPages.has(page) &&
          !publicPages.has(page))

      if (publicPages.has(page) || !inRightBucket) {
        setPage(homePageFor(currentUser.role))
      }
    } else if (!publicPages.has(page)) {
      setPage("landing")
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  const handleLogout = () => {
    logout()
    setPage("landing")
  }

  if (!currentUser) {
    if (page === "login") return <Login onNavigate={navigate} />
    if (page === "signup") return <Signup onNavigate={navigate} />

    return <Landing onNavigate={navigate} />
  }

    const userBadge = {
    name: currentUser.name,
    avatar: currentUser.avatar,
    subtitle:
      currentUser.role === "student"
        ? `${currentUser.department?.split(" ")[0] ?? ""} · Sem ${currentUser.sem ?? "-"}`
        : "",
  }

  // Admin workspace
  if (currentUser.role === "admin") {
    const renderAdminPage = () => {
      switch (page) {
        case "admin-academics":
          return <AcademicManagement />

        case "admin-users":
          return <Users />

        case "admin-library":
          return <AdminLibrary />

        case "admin-notices":
          return <AdminNotices />

        case "admin-events":
          return <AdminEvents />

        case "admin-reports":
          return <Reports />

        case "admin-settings":
          return <AdminSettings />

        default:
          return <AdminDashboard onNavigate={navigate} />
      }
    }

    return (
      <AdminLayout
        activePage={page}
        onNavigate={navigate}
        onLogout={handleLogout}
        user={userBadge}
      >
        {renderAdminPage()}
      </AdminLayout>
    )
  }

  // Faculty workspace
  if (currentUser.role === "faculty") {
    const renderFacultyPage = () => {
      switch (page) {
        case "faculty-courses":
          return (
            <MyCourses
              onNavigate={navigate}
              onOpenCourse={openCourse}
            />
          )

        case "faculty-course":
          return (
            <CourseWorkspace
              courseId={selectedCourse}
              onBack={() => navigate("faculty-courses")}
              onNavigate={navigate}
            />
          )

        case "faculty-attendance":
          return <FacultyAttendance />

        case "faculty-assignments":
          return <FacultyAssignments />

        case "faculty-resources":
          return <LectureResources />

        case "faculty-performance":
          return <StudentPerformance />

        case "faculty-events":
          return <FacultyEvents />

        case "faculty-notices":
          return <FacultyNotices />

        case "faculty-library":
          return <Library />

        case "faculty-profile":
          return <FacultyProfile />

        case "faculty-settings":
          return <Settings />

        default:
          return <FacultyDashboard onNavigate={navigate} />
      }
    }

    return (
      <FacultyLayout
        activePage={page}
        onNavigate={navigate}
        onLogout={handleLogout}
        user={userBadge}
      >
        {renderFacultyPage()}
      </FacultyLayout>
    )
  }

  // Student workspace
  const renderStudentPage = () => {
    switch (page) {
      case "academics":
        return <Academics />

      case "assignments":
        return <Assignments />

      case "events":
        return <Events />

      case "notices":
        return <Notices />

      case "library":
        return <Library />

      case "profile":
        return <Profile />

      case "settings":
        return <Settings />

      default:
        return <Dashboard onNavigate={navigate} />
    }
  }

  return (
    <AppLayout
      activePage={page}
      onNavigate={navigate}
      onLogout={handleLogout}
      user={userBadge}
    >
      {renderStudentPage()}
    </AppLayout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AuthProvider>
  )
}