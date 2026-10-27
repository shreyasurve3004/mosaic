import { useEffect, useState } from "react"
import { useAuth } from "../store/AuthContext"
import { useToast } from "../components/ui/ToastContext"
import Modal from "../components/ui/Modal"
import { Field, TextInput, Button } from "../components/ui/FormControls"
import { apiRequest } from "../api/client"
import { getAccessToken } from "../api/session"
import { getStudentResults, type SemesterResult } from "../api/academics"

interface StudentProfileData {
  roll_no: string
  full_name: string
  department_id: number | null
  department_name: string | null
  department_code: string | null
  year: number | null
  sem: number | null
  div: string | null
  academic_year: string | null
  scheme: string | null
  branch: string | null
  batch: string | null
  specialization: string | null
}

export default function Profile() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [profile, setProfile] = useState<StudentProfileData | null>(null)
  const [semesterResults, setSemesterResults] = useState<SemesterResult[]>([])
  const [resultsError, setResultsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    department: "",
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)

      const profileData = await apiRequest<StudentProfileData>(
        "/api/users/me/student/",
        {
          method: "GET",
          token: getAccessToken() ?? undefined,
        }
      )

      setProfile(profileData)

      try {
        setSemesterResults(await getStudentResults())
        setResultsError(null)
      } catch (error) {
        setSemesterResults([])
        setResultsError(
          error instanceof Error
            ? error.message
            : "Unable to load academic results."
        )
      }

      setForm({
        name: profileData.full_name ?? "",
        phone: currentUser?.phone ?? "",
        address: currentUser?.address ?? "",
        department: profileData.department_name ?? "",
      })
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to load profile.",
        "error"
      )
    } finally {
      setLoading(false)
    }
  }

  const openEdit = () => {
    setForm({
      name: profile?.full_name ?? currentUser?.name ?? "",
      phone: currentUser?.phone ?? "",
      address: currentUser?.address ?? "",
      department: profile?.department_name ?? "",
    })

    setEditing(true)
  }

  const saveEdit = () => {
    /*
     * The current backend profile endpoint is read-only.
     * Do not pretend to save fields that have no PATCH/PUT endpoint.
     */
    showToast(
      "Profile editing is not connected to the backend yet.",
      "error"
    )
  }

  const subjectResults = semesterResults.flatMap((semesterResult) =>
    semesterResult.results.map((result) => ({
      ...result,
      semester: semesterResult.sem,
      academicYear: semesterResult.academic_year,
    }))
  )

  const gradedResults = subjectResults.filter(
    (result) => result.grade !== null
  )

  const latestCgpa = semesterResults.find(
    (result) => result.cgpa !== null
  )?.cgpa

  const totalCredits = semesterResults.reduce(
    (sum, result) => sum + (result.total_credits ?? 0),
    0
  )

  const currentSemesterResult =
    semesterResults.find(
      (result) =>
        result.sem === profile?.sem &&
        result.academic_year === profile.academic_year
    ) ??
    semesterResults.find((result) => result.sem === profile?.sem)

  const grades = currentSemesterResult?.results ?? []

  const academicRemark = resultsError
    ? "Academic results could not be loaded. Retry to check your latest results."
    : !currentSemesterResult
      ? `Your Semester ${profile?.sem ?? ""} results are not available yet. They will appear here when recorded.`
      : grades.length === 0
        ? `Your Semester ${currentSemesterResult.sem} record is available, but subject marks have not been entered yet.`
        : currentSemesterResult.is_published
          ? `Semester ${currentSemesterResult.sem} result published: ${currentSemesterResult.result_status.toUpperCase()}.`
          : `Semester ${currentSemesterResult.sem} results are being prepared. This is not yet published.`

  if (loading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="text-[14px] text-[#6B7280]">
          Loading profile...
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="bg-white rounded-3xl border border-[#E5E7EB] p-8 text-center">
          <div className="text-[15px] font-semibold text-[#111827]">
            Unable to load student profile
          </div>
          <div className="text-[13px] text-[#6B7280] mt-1">
            Please try again.
          </div>

          <button
            onClick={loadProfile}
            className="mt-5 px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-[26px] font-bold text-[#111827] tracking-tight">
          Student Profile
        </h1>

        <p className="text-[14px] text-[#6B7280]">
          Academic Year {profile.academic_year ?? "—"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - User Details */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm">
            <div className="h-28 bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#7C3AED] relative">
              <div className="absolute -bottom-8 left-6">
                <div className="w-18 h-18 rounded-2xl bg-white p-1 shadow-md border border-[#E5E7EB]">
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center text-[26px] font-bold text-white">
                    {profile.full_name?.charAt(0).toUpperCase() ?? "S"}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-12 p-6">
              <h2 className="text-[20px] font-bold text-[#111827]">
                {profile.full_name}
              </h2>

              <p className="text-[14px] text-[#2563EB] font-medium">
                {profile.department_name ?? "—"}
              </p>

              <p className="text-[12px] text-[#6B7280]">
                Semester {profile.sem ?? "—"} · Roll No.{" "}
                {profile.roll_no ?? "—"}
              </p>

              <div className="mt-6 space-y-2.5 text-[13px] text-[#4B5563] border-t border-[#F3F4F6] pt-4">
                <div className="flex items-center gap-2.5">
                  <span className="opacity-70">📧</span>
                  <span className="truncate">
                    {currentUser?.email ?? "—"}
                  </span>
                </div>

                {currentUser?.phone && (
                  <div className="flex items-center gap-2.5">
                    <span className="opacity-70">📞</span>
                    <span>{currentUser.phone}</span>
                  </div>
                )}

                {currentUser?.address && (
                  <div className="flex items-center gap-2.5">
                    <span className="opacity-70">🏠</span>
                    <span className="truncate">
                      {currentUser.address}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <span className="opacity-70">🎓</span>
                  <span>
                    {profile.branch ?? "—"}
                    {profile.specialization
                      ? ` · ${profile.specialization}`
                      : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="opacity-70">📚</span>
                  <span>
                    Division {profile.div ?? "—"} ·{" "}
                    {profile.scheme ?? "—"}
                  </span>
                </div>
              </div>

              <button
                onClick={openEdit}
                className="mt-6 w-full py-2.5 rounded-xl border border-[#D1D5DB] text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] hover:border-[#9CA3AF] transition-all duration-200"
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-[#E5E7EB] p-6 shadow-sm">
            <h3 className="text-[14px] font-bold text-[#111827] uppercase tracking-wider mb-4">
              Academic Overview
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "CGPA",
                  val:
                    latestCgpa === undefined
                      ? "—"
                      : Number(latestCgpa).toFixed(2),
                  color: "#2563EB",
                  bg: "#EFF6FF",
                },
                {
                  label: "Subjects",
                  val:
                    resultsError || semesterResults.length === 0
                      ? "—"
                      : String(subjectResults.length),
                  color: "#16A34A",
                  bg: "#F0FDF4",
                },
                {
                  label: "Graded",
                  val:
                    resultsError || semesterResults.length === 0
                      ? "—"
                      : String(gradedResults.length),
                  color: "#9333EA",
                  bg: "#FDF4FF",
                },
                {
                  label: "Credits",
                  val:
                    resultsError || semesterResults.length === 0
                      ? "—"
                      : String(totalCredits),
                  color: "#F97316",
                  bg: "#FFF7ED",
                },
              ].map((s) => (
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

        {/* Right Column - Academic Performance & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Semester Progress */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[#F3F4F6]">
              <h3 className="text-[15px] font-bold text-[#111827]">
                Current Semester Performance
              </h3>
            </div>

            <div className="px-6 py-3 bg-blue-50/70 text-[12px] text-blue-800">
              {resultsError ? (
                <button
                  type="button"
                  onClick={loadProfile}
                  className="font-semibold underline underline-offset-2"
                >
                  {academicRemark} Retry
                </button>
              ) : (
                academicRemark
              )}
            </div>

            <div className="divide-y divide-[#F3F4F6]">
              {grades.map((s) => (
                <div
                  key={s.result_id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[#F9FAFB]/50 transition-colors"
                >
                  <div className="flex-1 text-[14px] font-semibold text-[#1F2937] truncate">
                    {s.course_name}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-medium text-[#6B7280] text-right">
                      {s.total_marks === null
                        ? "Marks pending"
                        : `${s.total_marks} marks`}
                    </span>

                    <span className="text-[14px] font-extrabold text-[#2563EB] w-8 text-center">
                      {s.grade ?? "—"}
                    </span>
                  </div>
                </div>
              ))}

              {grades.length === 0 && !resultsError && (
                <div className="px-6 py-8 text-center text-[13px] text-[#9CA3AF]">
                  {currentSemesterResult
                    ? "Subject performance will appear here once marks are entered."
                    : "No subject performance has been recorded for the current semester yet."}
                </div>
              )}
              {resultsError && (
                <div className="px-6 py-8 text-center text-[13px] text-rose-600">
                  {resultsError}
                </div>
              )}
            </div>
          </div>

          {/* Student Information */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-[#E5E7EB] p-6 shadow-sm">
            <h3 className="text-[15px] font-bold text-[#111827] mb-4">
              Academic Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                  Department
                </div>
                <div className="text-[13px] font-semibold text-[#374151] mt-1">
                  {profile.department_name ?? "—"}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                  Department Code
                </div>
                <div className="text-[13px] font-semibold text-[#374151] mt-1">
                  {profile.department_code ?? "—"}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                  Branch
                </div>
                <div className="text-[13px] font-semibold text-[#374151] mt-1">
                  {profile.branch ?? "—"}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                  Specialization
                </div>
                <div className="text-[13px] font-semibold text-[#374151] mt-1">
                  {profile.specialization ?? "—"}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                  Academic Year
                </div>
                <div className="text-[13px] font-semibold text-[#374151] mt-1">
                  {profile.academic_year ?? "—"}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                  Scheme
                </div>
                <div className="text-[13px] font-semibold text-[#374151] mt-1">
                  {profile.scheme ?? "—"}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                  Division
                </div>
                <div className="text-[13px] font-semibold text-[#374151] mt-1">
                  {profile.div ?? "—"}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                  Batch
                </div>
                <div className="text-[13px] font-semibold text-[#374151] mt-1">
                  {profile.batch ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit Profile Information"
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
              onChange={(e) =>
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
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: e.target.value,
                })
              }
              placeholder="+91 90000 00000"
            />
          </Field>

          <Field label="Address / Residence">
            <TextInput
              value={form.address}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: e.target.value,
                })
              }
            />
          </Field>

          <Field label="Department">
            <TextInput
              value={form.department}
              onChange={(e) =>
                setForm({
                  ...form,
                  department: e.target.value,
                })
              }
            />
          </Field>
        </div>
      </Modal>
    </div>
  )
}