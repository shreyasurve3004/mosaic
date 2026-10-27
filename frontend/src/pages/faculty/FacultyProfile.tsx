import { useEffect, useState } from "react"
import { useAuth } from "../../store/AuthContext"
import { useToast } from "../../components/ui/ToastContext"
import Modal from "../../components/ui/Modal"
import { Field, TextInput, Button } from "../../components/ui/FormControls"
import {
  getFacultyProfile,
  getFacultyCourses,
  getFacultyCourseStudents,
  updateFacultyProfile,
  type FacultyProfile as FacultyProfileData,
  type FacultyCourse,
} from "../../api/faculty"
import { getFacultyTimetable } from "../../api/attendance"
import { getActiveNotices } from "../../api/notices"

const palette = [
  { color: "#2563EB", bg: "#EFF6FF" },
  { color: "#9333EA", bg: "#FDF4FF" },
  { color: "#F97316", bg: "#FFF7ED" },
  { color: "#16A34A", bg: "#F0FDF4" },
]

export default function FacultyProfile() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [profile, setProfile] = useState<FacultyProfileData | null>(null)
  const [myCourses, setMyCourses] = useState<FacultyCourse[]>([])
  const [courseStudentCounts, setCourseStudentCounts] = useState<Record<number, number>>({})
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalSessions, setTotalSessions] = useState(0)
  const [totalNotices, setTotalNotices] = useState(0)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    name: "",
    phone: "",
  })

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      setLoading(true)

      const [profileData, coursesData, timetableData, noticesData] = await Promise.all([
        getFacultyProfile(),
        getFacultyCourses(),
        getFacultyTimetable(),
        getActiveNotices(),
      ])

      const studentEntries = await Promise.all(
        coursesData.map(async course => ({
          courseId: course.faculty_course_id,
          students: await getFacultyCourseStudents(course.faculty_course_id),
        }))
      )
      const students = new Set(
        studentEntries.flatMap(({ students: courseStudents }) =>
          courseStudents.map(student => student.roll_no)
        )
      )

      setProfile(profileData)
      setMyCourses(coursesData)
      setCourseStudentCounts(
        Object.fromEntries(
          studentEntries.map(({ courseId, students: courseStudents }) => [
            courseId,
            courseStudents.length,
          ])
        )
      )
      setTotalStudents(students.size)
      setTotalSessions(timetableData.length)
      setTotalNotices(noticesData.length)

      setForm({
        name: profileData.full_name,
        phone: profileData.phone ?? "",
      })
    } catch (error) {
      console.error("Failed to load faculty profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const openEdit = () => {
    if (!profile) return

    setForm({
      name: profile.full_name,
      phone: profile.phone ?? "",
    })

    setEditing(true)
  }

  const saveEdit = async () => {
  const fullName = form.name.trim()
  const phone = form.phone.trim()

  if (!fullName) {
    showToast("Full name is required", "error")
    return
  }

  try {
    const updated = await updateFacultyProfile({
      full_name: fullName,
      phone,
    })

    setProfile(updated)
    setForm({
      name: updated.full_name,
      phone: updated.phone ?? "",
    })

    showToast("Profile updated successfully", "success")
    setEditing(false)
  } catch (error) {
    console.error("Failed to update faculty profile:", error)
    showToast("Failed to update profile", "error")
  }
}

  if (loading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="text-[14px] text-[#6B7280]">
          Loading faculty profile...
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-[26px] font-bold text-[#111827] tracking-tight">
          Faculty Profile
        </h1>

        <p className="text-[14px] text-[#6B7280]">
          Academic Year {myCourses[0]?.academic_year ?? "—"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Faculty Details */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm">
            <div className="h-28 bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#2563EB] relative">
              <div className="absolute -bottom-8 left-6">
                <div className="w-18 h-18 rounded-2xl bg-white p-1 shadow-md border border-[#E5E7EB]">
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-[26px] font-bold text-white">
                    {profile?.full_name
                      ? profile.full_name
                          .split(" ")
                          .map(part => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : currentUser?.avatar}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-12 p-6">
              <h2 className="text-[20px] font-bold text-[#111827]">
                {profile?.full_name}
              </h2>

              <p className="text-[14px] text-[#7C3AED] font-semibold">
                {profile?.designation || "Faculty"}
              </p>

              <p className="text-[12px] text-[#6B7280]">
                {profile?.department}
              </p>

              <div className="mt-6 space-y-2.5 text-[13px] text-[#4B5563] border-t border-[#F3F4F6] pt-4">
                <div className="flex items-center gap-2.5">
                  <span className="opacity-70">📧</span>
                  <span className="truncate">
                    {profile?.faculty_email}
                  </span>
                </div>

                {profile?.phone && (
                  <div className="flex items-center gap-2.5">
                    <span className="opacity-70">📞</span>
                    <span>{profile.phone}</span>
                  </div>
                )}

                {profile?.specialization && (
                  <div className="flex items-center gap-2.5">
                    <span className="opacity-70">🎓</span>
                    <span className="truncate">
                      {profile.specialization}
                    </span>
                  </div>
                )}

                {profile?.faculty_id && (
                  <div className="flex items-center gap-2.5">
                    <span className="opacity-70">🪪</span>
                    <span>{profile.faculty_id}</span>
                  </div>
                )}
              </div>

              <button
                onClick={openEdit}
                className="mt-6 w-full py-2.5 rounded-xl border border-[#D1D5DB] text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] hover:border-[#9CA3AF] transition-all duration-200"
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* Academic Overview Stats */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-[#E5E7EB] p-6 shadow-sm">
            <h3 className="text-[14px] font-bold text-[#111827] uppercase tracking-wider mb-4">
              Teaching Overview
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Courses",
                  val: String(myCourses.length),
                  color: "#2563EB",
                  bg: "#EFF6FF",
                },
                {
                  label: "Students",
                  val: String(totalStudents),
                  color: "#9333EA",
                  bg: "#FDF4FF",
                },
                {
                  label: "Sessions",
                  val: String(totalSessions),
                  color: "#16A34A",
                  bg: "#F0FDF4",
                },
                {
                  label: "Notices",
                  val: String(totalNotices),
                  color: "#F97316",
                  bg: "#FFF7ED",
                },
              ].map(s => (
                <div
                  key={s.label}
                  className="rounded-2xl p-4 text-center"
                  style={{ backgroundColor: s.bg }}
                >
                  <div
                    className="text-[22px] font-extrabold"
                    style={{ color: s.color }}
                  >
                    {s.val}
                  </div>

                  <div className="text-[12px] font-medium text-[#6B7280] mt-0.5">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Teaching & Research Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Courses */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[#F3F4F6]">
              <h3 className="text-[15px] font-bold text-[#111827]">
                Assigned Courses
              </h3>
            </div>

            <div className="divide-y divide-[#F3F4F6]">
              {myCourses.map((course, i) => {
                const p = palette[i % palette.length]

                return (
                  <div
                    key={course.faculty_course_id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[#F9FAFB]/50 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: p.bg }}
                    >
                      <div
                        className="w-3 h-3 rounded-md"
                        style={{ backgroundColor: p.color }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-[#111827] truncate">
                        {course.course_name}
                      </div>

                      <div className="text-[12px] text-[#6B7280]">
                        {course.course_code} · Sem {course.sem}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div
                        className="text-[15px] font-extrabold"
                        style={{ color: p.color }}
                      >
                        {courseStudentCounts[course.faculty_course_id] ?? 0}
                      </div>

                      <div className="text-[11px] text-[#9CA3AF]">
                        students
                      </div>
                    </div>
                  </div>
                )
              })}

              {myCourses.length === 0 && (
                <div className="px-6 py-8 text-center text-[13px] text-[#9CA3AF]">
                  No courses assigned yet
                </div>
              )}
            </div>
          </div>

          {/* Research & Expertise */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-[#E5E7EB] p-6 shadow-sm">
              <h3 className="text-[15px] font-bold text-[#111827] mb-3">
                Areas of Expertise
              </h3>

              {profile?.specialization ? (
                <div className="flex flex-wrap gap-2">
                  <span className="text-[12px] font-semibold px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB]">
                    {profile.specialization}
                  </span>
                </div>
              ) : (
                <p className="text-[13px] text-[#9CA3AF]">
                  No specialization added
                </p>
              )}
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-[#E5E7EB] p-6 shadow-sm">
              <h3 className="text-[15px] font-bold text-[#111827] mb-3">
                Recent Publications
              </h3>

              <div className="py-4 text-[13px] text-[#9CA3AF]">
                No publications available
              </div>
            </div>
          </div>

          {/* Faculty Activity Log */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-[#E5E7EB] p-6 shadow-sm">
            <h3 className="text-[15px] font-bold text-[#111827] mb-4">
              Recent Activity
            </h3>

            <div className="space-y-3">
              <div className="text-[13px] text-[#9CA3AF] text-center py-4">
                No recent activity logged.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit Faculty Profile"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={saveEdit}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Full Name" required>
            <TextInput
              value={form.name}
              onChange={e =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
            />
          </Field>

          <Field label="Phone Number">
            <TextInput
              value={form.phone}
              onChange={e =>
                setForm({
                  ...form,
                  phone: e.target.value,
                })
              }
              placeholder="+91 90000 00000"
            />
          </Field>
        </div>
      </Modal>
    </div>
  )
}