import { useEffect, useMemo, useState } from "react"
import { useToast } from "../../components/ui/ToastContext"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { Button } from "../../components/ui/FormControls"
import {
  getAdminUsers,
  getAdminDepartments,
  createAdminUser,
  updateAdminUserStatus,
  updateAdminUser,
  deleteAdminUser,
  type AdminUser,
  type AdminDepartment,
} from "../../api/users"
import { getAccessToken } from "../../api/session"

const statusStyle: Record<string, { bg: string; text: string }> = {
  active: { bg: "#F0FDF4", text: "#16A34A" },
  inactive: { bg: "#F8FAFC", text: "#94A3B8" },
  pending: { bg: "#FFF7ED", text: "#F97316" },
  suspended: { bg: "#FEF2F2", text: "#DC2626" },
}

const roleColor: Record<string, { bg: string; text: string }> = {
  student: { bg: "#EFF6FF", text: "#2563EB" },
  faculty: { bg: "#FDF4FF", text: "#9333EA" },
}

interface EditForm {
  firstName: string
  lastName: string
  email: string
  department: number | ""
  rollNo: string
  year: number | ""
  sem: number | ""
  div: string
  academicYear: string
  scheme: string
  branch: string
  batch: string
  specialization: string
  phone: string
  address: string
  facultyId: string
  facultySubject: string
  designation: string
  qualification: string
  experience: number | ""
  bio: string
  officeRoom: string
}

interface AddForm {
  firstName: string
  lastName: string
  email: string
  role: "student" | "faculty"
  department: number | ""
  rollNo: string
  year: number | ""
  sem: number | ""
  div: string
  academicYear: string
  scheme: string
  branch: string
  batch: string
  specialization: string
  facultyId: string
  facultySubject: string
  designation: string
  phone: string
  qualification: string
  experience: number | ""
  bio: string
  officeRoom: string
}

const emptyAddForm: AddForm = {
  firstName: "",
  lastName: "",
  email: "",
  role: "student",
  department: "",
  rollNo: "",
  year: "",
  sem: "",
  div: "",
  academicYear: "",
  scheme: "",
  branch: "",
  batch: "",
  specialization: "",
  facultyId: "",
  facultySubject: "",
  designation: "",
  phone: "",
  qualification: "",
  experience: "",
  bio: "",
  officeRoom: "",
}

const emptyEditForm: EditForm = {
  firstName: "",
  lastName: "",
  email: "",
  department: "",
  rollNo: "",
  year: "",
  sem: "",
  div: "",
  academicYear: "",
  scheme: "",
  branch: "",
  batch: "",
  specialization: "",
  phone: "",
  address: "",
  facultyId: "",
  facultySubject: "",
  designation: "",
  qualification: "",
  experience: "",
  bio: "",
  officeRoom: "",
}

export default function Users() {
  const { showToast } = useToast()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [departments, setDepartments] = useState<AdminDepartment[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<
    "all" | "student" | "faculty"
  >("all")
  const [deptFilter, setDeptFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("all")

  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [toDelete, setToDelete] = useState<AdminUser | null>(null)

  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm)
  const [addForm, setAddForm] = useState<AddForm>(emptyAddForm)
  const [savingEdit, setSavingEdit] = useState(false)
  const [savingAdd, setSavingAdd] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      const token = getAccessToken()

      if (!token) {
        showToast("Admin session expired. Please log in again.", "error")
        setLoading(false)
        return
      }

      try {
        const [userData, departmentData] = await Promise.all([
          getAdminUsers(token),
          getAdminDepartments(token),
        ])

        setUsers(userData)
        setDepartments(departmentData)
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Failed to load users.",
          "error"
        )
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [showToast])

  const allUsers = users

  const depts = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          allUsers
            .map(u => u.profile?.department)
            .filter(Boolean)
        )
      ),
    ],
    [allUsers]
  )

  const filtered = allUsers.filter(u => {
    const fullName = `${u.firstName} ${u.lastName}`.trim()

    const q =
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())

    const r = roleFilter === "all" || u.role === roleFilter

    const department = u.profile?.department ?? ""
    const d =
      deptFilter === "All" ||
      department === deptFilter

    const s =
      statusFilter === "all" ||
      u.status === statusFilter

    return q && r && d && s
  })

  const toggleStatus = async (u: AdminUser) => {
    const token = getAccessToken()

    if (!token) {
      showToast("Admin session expired. Please log in again.", "error")
      return
    }

    const next =
      u.status === "active"
        ? "inactive"
        : "active"

    try {
      const response = await updateAdminUserStatus(
        token,
        u.id,
        next
      )

      setUsers(current =>
        current.map(user =>
          user.id === u.id
            ? {
                ...user,
                status: response.user.status,
              }
            : user
        )
      )

      if (selected?.id === u.id) {
        setSelected(current =>
          current
            ? {
                ...current,
                status: response.user.status,
              }
            : null
        )
      }

      showToast(
        `${u.firstName} ${u.lastName} ${
          next === "active"
            ? "activated"
            : "deactivated"
        }`,
        "info"
      )
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update user status.",
        "error"
      )
    }
  }

  const getUserName = (u: AdminUser) =>
    `${u.firstName} ${u.lastName}`.trim()

  const getUserAvatar = (u: AdminUser) =>
    `${u.firstName?.charAt(0) ?? ""}${
      u.lastName?.charAt(0) ?? ""
    }`.toUpperCase()

  const getUserDepartment = (u: AdminUser) =>
    u.profile?.department ?? "Not assigned"

  const openEdit = (u: AdminUser) => {
    const profile = u.profile

    setEditing(u)

    setEditForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,

      department:
        profile?.departmentId ??
        "",

      rollNo:
        profile?.rollNo ??
        "",

      year:
        profile?.year ??
        "",

      sem:
        profile?.sem ??
        "",

      div:
        profile?.division ??
        "",

      academicYear:
        profile?.academicYear ??
        "",

      scheme:
        profile?.scheme ??
        "",

      branch:
        profile?.branch ??
        "",

      batch:
        profile?.batch ??
        "",

      specialization:
        profile?.specialization ??
        "",

      phone:
        profile?.phone ??
        "",

      address:
        profile?.address ??
        "",

      facultyId:
        profile?.facultyId ??
        "",

      facultySubject:
        profile?.facultySubject ??
        "",

      designation:
        profile?.designation ??
        "",

      qualification:
        profile?.qualification ??
        "",

      experience:
        profile?.experience ??
        "",

      bio:
        profile?.bio ??
        "",

      officeRoom:
        profile?.officeRoom ??
        "",
    })
  }

  const closeEdit = () => {
    if (savingEdit) return

    setEditing(null)
    setEditForm(emptyEditForm)
  }

  const updateField = <K extends keyof EditForm>(
    field: K,
    value: EditForm[K]
  ) => {
    setEditForm(current => ({
      ...current,
      [field]: value,
    }))
  }

  const updateAddField = <K extends keyof AddForm>(
    field: K,
    value: AddForm[K]
  ) => {
    setAddForm(current => ({
      ...current,
      [field]: value,
    }))
  }

  const closeAdd = () => {
    if (savingAdd) return

    setShowAddForm(false)
    setAddForm(emptyAddForm)
  }

  const submitAdd = async () => {
    const token = getAccessToken()

    if (!token) {
      showToast("Admin session expired. Please log in again.", "error")
      return
    }

    if (
      !addForm.firstName.trim() ||
      !addForm.lastName.trim() ||
      !addForm.email.trim()
    ) {
      showToast(
        "First name, last name and email are required.",
        "error"
      )
      return
    }

    if (!addForm.department) {
      showToast("Please select a department.", "error")
      return
    }

    if (
      addForm.role === "student" &&
      (!addForm.rollNo.trim() ||
        addForm.year === "" ||
        addForm.sem === "" ||
        !addForm.div.trim() ||
        !addForm.academicYear.trim() ||
        !addForm.scheme.trim() ||
        !addForm.branch.trim())
    ) {
      showToast(
        "Complete the required student fields.",
        "error"
      )
      return
    }

    if (
      addForm.role === "faculty" &&
      (!addForm.facultyId.trim() ||
        !addForm.designation.trim())
    ) {
      showToast(
        "Faculty ID and designation are required.",
        "error"
      )
      return
    }

    setSavingAdd(true)

    try {
      await createAdminUser(token, {
        firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim(),
        email: addForm.email.trim().toLowerCase(),
        role: addForm.role,
        department: Number(addForm.department),
        ...(addForm.role === "student"
          ? {
              rollNo: addForm.rollNo.trim(),
              year: Number(addForm.year),
              sem: Number(addForm.sem),
              div: addForm.div.trim(),
              academicYear: addForm.academicYear.trim(),
              scheme: addForm.scheme.trim(),
              branch: addForm.branch.trim(),
              batch: addForm.batch.trim() || undefined,
              specialization:
                addForm.specialization.trim() || undefined,
            }
          : {
              facultyId: addForm.facultyId.trim(),
              facultySubject:
                addForm.facultySubject.trim() || undefined,
              designation: addForm.designation.trim(),
              phone: addForm.phone.trim() || undefined,
              qualification:
                addForm.qualification.trim() || undefined,
              experience:
                addForm.experience === ""
                  ? undefined
                  : Number(addForm.experience),
              specialization:
                addForm.specialization.trim() || undefined,
              bio: addForm.bio.trim() || undefined,
              officeRoom:
                addForm.officeRoom.trim() || undefined,
            }),
      })

      setUsers(await getAdminUsers(token))
      setShowAddForm(false)
      setAddForm(emptyAddForm)
      showToast(
        "User account created successfully. The account is inactive until registration and verification are completed.",
        "info"
      )
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to create user account.",
        "error"
      )
    } finally {
      setSavingAdd(false)
    }
  }

  const submitEdit = async () => {
    if (!editing) return

    const token = getAccessToken()

    if (!token) {
      showToast("Admin session expired. Please log in again.", "error")
      return
    }

    if (
      !editForm.firstName.trim() ||
      !editForm.lastName.trim() ||
      !editForm.email.trim()
    ) {
      showToast(
        "First name, last name and email are required.",
        "error"
      )
      return
    }

    if (!editForm.department) {
      showToast("Please select a department.", "error")
      return
    }

    if (
      editing.role === "student" &&
      !editForm.rollNo.trim()
    ) {
      showToast("Roll number is required.", "error")
      return
    }

    if (
      editing.role === "faculty" &&
      !editForm.facultyId.trim()
    ) {
      showToast("Faculty ID is required.", "error")
      return
    }

    setSavingEdit(true)

    try {
      await updateAdminUser(
        token,
        editing.id,
        {
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          email: editForm.email.trim().toLowerCase(),
          department: Number(editForm.department),

          ...(editing.role === "student"
            ? {
                rollNo: editForm.rollNo.trim(),
                year:
                  editForm.year === ""
                    ? undefined
                    : Number(editForm.year),
                sem:
                  editForm.sem === ""
                    ? undefined
                    : Number(editForm.sem),
                div: editForm.div.trim(),
                academicYear:
                  editForm.academicYear.trim(),
                scheme: editForm.scheme.trim(),
                branch: editForm.branch.trim(),
                batch: editForm.batch.trim() || null,
                specialization:
                  editForm.specialization.trim() || null,
                phone: editForm.phone.trim() || null,
                address:
                  editForm.address.trim() || null,
              }
            : {
                facultyId: editForm.facultyId.trim(),
                facultySubject:
                  editForm.facultySubject.trim() || null,
                designation:
                  editForm.designation.trim(),
                specialization:
                  editForm.specialization.trim() || null,
                phone: editForm.phone.trim() || null,
                qualification:
                  editForm.qualification.trim() || null,
                experience:
                  editForm.experience === ""
                    ? null
                    : Number(editForm.experience),
                bio: editForm.bio.trim() || null,
                officeRoom:
                  editForm.officeRoom.trim() || null,
              }),
        }
      )

      const refreshedUsers = await getAdminUsers(token)

      setUsers(refreshedUsers)

      const updatedUser =
        refreshedUsers.find(
          user => user.id === editing.id
        ) ?? null

      setSelected(current =>
        current?.id === editing.id
          ? updatedUser
          : current
      )

      setEditing(null)
      setEditForm(emptyEditForm)

      showToast(
        "User profile updated successfully.",
        "info"
      )
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update user profile.",
        "error"
      )
    } finally {
      setSavingEdit(false)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return

    const token = getAccessToken()

    if (!token) {
      showToast("Admin session expired. Please log in again.", "error")
      return
    }

    setDeleting(true)

    try {
      await deleteAdminUser(token, toDelete.id)

      setUsers(current =>
        current.filter(
          user => user.id !== toDelete.id
        )
      )

      if (selected?.id === toDelete.id) {
        setSelected(null)
      }

      if (editing?.id === toDelete.id) {
        setEditing(null)
        setEditForm(emptyEditForm)
      }

      showToast(
        `${getUserName(toDelete)} was deleted successfully.`,
        "info"
      )

      setToDelete(null)
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete user.",
        "error"
      )
    } finally {
      setDeleting(false)
    }
  }

  const resetPassword = (u: AdminUser) => {
    showToast(
      `Password reset for ${u.firstName} ${u.lastName} is not connected yet.`,
      "info"
    )
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1E293B] tracking-tight">
            Users
          </h1>

          <p className="text-[13px] text-[#64748B] mt-0.5">
            {
              allUsers.filter(
                u => u.role === "student"
              ).length
            }{" "}
            students ·{" "}
            {
              allUsers.filter(
                u => u.role === "faculty"
              ).length
            }{" "}
            faculty ·{" "}
            <span className="text-[#F97316]">
              {
                allUsers.filter(
                  u => u.status === "pending"
                ).length
              }{" "}
              pending
            </span>
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            setAddForm(emptyAddForm)
            setSelected(null)
          }}
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
            <line
              x1="12"
              y1="5"
              x2="12"
              y2="19"
            />
            <line
              x1="5"
              y1="12"
              x2="19"
              y2="12"
            />
          </svg>
          Add User
        </button>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 mb-5">
          <h3 className="text-[14px] font-semibold text-[#1E293B] mb-4">
            Add New User
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              value={addForm.firstName}
              onChange={e =>
                updateAddField("firstName", e.target.value)
              }
              placeholder="First Name"
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            />

            <input
              value={addForm.lastName}
              onChange={e =>
                updateAddField("lastName", e.target.value)
              }
              placeholder="Last Name"
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            />

            <input
              type="email"
              value={addForm.email}
              onChange={e =>
                updateAddField("email", e.target.value)
              }
              placeholder="Email address"
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            />

            <select
              value={addForm.role}
              onChange={e =>
                updateAddField(
                  "role",
                  e.target.value as AddForm["role"]
                )
              }
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            >
              <option value="student">
                Student
              </option>
              <option value="faculty">
                Faculty
              </option>
            </select>

            <select
              value={addForm.department}
              onChange={e =>
                updateAddField(
                  "department",
                  e.target.value
                    ? Number(e.target.value)
                    : ""
                )
              }
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
            >
              <option value="" disabled>
                Department
              </option>

              {departments.map(department => (
                <option
                  key={department.department_id}
                  value={department.department_id}
                >
                  {department.department_name}
                </option>
              ))}
            </select>

            {addForm.role === "student" ? (
              <>
                <input
                  value={addForm.rollNo}
                  onChange={e =>
                    updateAddField("rollNo", e.target.value)
                  }
                  placeholder="Roll Number"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  type="number"
                  min="1"
                  value={addForm.year}
                  onChange={e =>
                    updateAddField(
                      "year",
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  placeholder="Year"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  type="number"
                  min="1"
                  value={addForm.sem}
                  onChange={e =>
                    updateAddField(
                      "sem",
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  placeholder="Semester"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  value={addForm.div}
                  onChange={e =>
                    updateAddField("div", e.target.value)
                  }
                  placeholder="Division"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  value={addForm.academicYear}
                  onChange={e =>
                    updateAddField("academicYear", e.target.value)
                  }
                  placeholder="Academic Year"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  value={addForm.scheme}
                  onChange={e =>
                    updateAddField("scheme", e.target.value)
                  }
                  placeholder="Scheme"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  value={addForm.branch}
                  onChange={e =>
                    updateAddField("branch", e.target.value)
                  }
                  placeholder="Branch"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  value={addForm.batch}
                  onChange={e =>
                    updateAddField("batch", e.target.value)
                  }
                  placeholder="Batch (optional)"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  value={addForm.specialization}
                  onChange={e =>
                    updateAddField("specialization", e.target.value)
                  }
                  placeholder="Specialization (optional)"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC] md:col-span-2"
                />
              </>
            ) : (
              <>
                <input
                  value={addForm.facultyId}
                  onChange={e =>
                    updateAddField("facultyId", e.target.value)
                  }
                  placeholder="Faculty ID"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  value={addForm.designation}
                  onChange={e =>
                    updateAddField("designation", e.target.value)
                  }
                  placeholder="Designation"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  value={addForm.specialization}
                  onChange={e =>
                    updateAddField("specialization", e.target.value)
                  }
                  placeholder="Specialization (optional)"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  value={addForm.facultySubject}
                  onChange={e =>
                    updateAddField("facultySubject", e.target.value)
                  }
                  placeholder="Subject (optional)"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  value={addForm.phone}
                  onChange={e =>
                    updateAddField("phone", e.target.value)
                  }
                  placeholder="Phone (optional)"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  value={addForm.qualification}
                  onChange={e =>
                    updateAddField("qualification", e.target.value)
                  }
                  placeholder="Qualification (optional)"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  type="number"
                  min="0"
                  value={addForm.experience}
                  onChange={e =>
                    updateAddField(
                      "experience",
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  placeholder="Experience (years)"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <input
                  value={addForm.officeRoom}
                  onChange={e =>
                    updateAddField("officeRoom", e.target.value)
                  }
                  placeholder="Office Room (optional)"
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]"
                />

                <textarea
                  value={addForm.bio}
                  onChange={e =>
                    updateAddField("bio", e.target.value)
                  }
                  placeholder="Bio (optional)"
                  rows={2}
                  className="px-3 py-2 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC] md:col-span-2"
                />
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={submitAdd}
              disabled={savingAdd}
              className="px-4 py-1.5 rounded-lg bg-[#2563EB] text-white text-[12px] font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
            >
              {savingAdd ? "Creating..." : "Create Account"}
            </button>

            <button
              onClick={closeAdd}
              disabled={savingAdd}
              className="px-4 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] text-[#64748B]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            width="13"
            height="13"
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
            placeholder="Search users..."
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-white"
          />
        </div>

        <div className="flex gap-1 bg-[#F1F5F9] rounded-lg p-0.5">
          {(
            ["all", "student", "faculty"] as const
          ).map(r => (
            <button
              key={r}
              onClick={() =>
                setRoleFilter(r)
              }
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all capitalize ${
                roleFilter === r
                  ? "bg-white text-[#1E293B] shadow-sm"
                  : "text-[#64748B]"
              }`}
            >
              {r === "all"
                ? "All"
                : r.charAt(0).toUpperCase() +
                  r.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={deptFilter}
          onChange={e =>
            setDeptFilter(e.target.value)
          }
          className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] focus:outline-none focus:border-[#2563EB] bg-white"
        >
          {depts.map(d => (
            <option key={d}>{d}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e =>
            setStatusFilter(e.target.value)
          }
          className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] focus:outline-none focus:border-[#2563EB] bg-white"
        >
          <option value="all">
            All Status
          </option>
          <option value="active">
            Active
          </option>
          <option value="pending">
            Pending
          </option>
          <option value="inactive">
            Inactive
          </option>
          <option value="suspended">
            Suspended
          </option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F1F5F9]">
                {[
                  "User",
                  "Role",
                  "Department",
                  "Status",
                  "Actions",
                ].map(h => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-[13px] text-[#94A3B8]"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : (
                filtered.map(u => {
                  const ss =
                    statusStyle[u.status]
                  const rc =
                    roleColor[u.role]

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                        selected?.id === u.id
                          ? "bg-[#EFF6FF]"
                          : ""
                      }`}
                      onClick={() =>
                        setSelected(u)
                      }
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                            style={{
                              backgroundColor:
                                rc.bg,
                              color:
                                rc.text,
                            }}
                          >
                            {getUserAvatar(u)}
                          </div>

                          <div>
                            <div className="text-[13px] font-medium text-[#1E293B]">
                              {getUserName(u)}
                            </div>

                            <div className="text-[11px] text-[#94A3B8]">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                          style={{
                            backgroundColor:
                              rc.bg,
                            color: rc.text,
                          }}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-[12px] text-[#64748B]">
                        {getUserDepartment(u)}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                          style={{
                            backgroundColor:
                              ss.bg,
                            color: ss.text,
                          }}
                        >
                          {u.status}
                        </span>
                      </td>

                      <td
                        className="px-5 py-3.5"
                        onClick={e =>
                          e.stopPropagation()
                        }
                      >
                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              openEdit(u)
                            }
                            className="text-[11px] px-2 py-0.5 rounded text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              toggleStatus(u)
                            }
                            className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                              u.status ===
                              "active"
                                ? "text-[#F97316] hover:bg-[#FFF7ED]"
                                : "text-[#16A34A] hover:bg-[#F0FDF4]"
                            }`}
                          >
                            {u.status ===
                            "active"
                              ? "Deactivate"
                              : "Activate"}
                          </button>

                          <button
                            onClick={() =>
                              setToDelete(u)
                            }
                            className="text-[11px] px-2 py-0.5 rounded text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {!loading &&
            filtered.length === 0 && (
              <div className="text-center py-12 text-[13px] text-[#94A3B8]">
                No users match the current
                filters
              </div>
            )}
        </div>

        {/* Profile Panel */}
        {selected ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden h-fit">
            <div className="h-16 bg-gradient-to-br from-[#2563EB] to-[#7C3AED] relative">
              <div className="absolute -bottom-7 left-5">
                <div
                  className="w-14 h-14 rounded-xl bg-white border-2 border-white shadow flex items-center justify-center text-[22px] font-bold"
                  style={{
                    color:
                      roleColor[
                        selected.role
                      ]?.text,
                  }}
                >
                  {getUserAvatar(selected)}
                </div>
              </div>
            </div>

            <div className="pt-10 px-5 pb-5">
              <div className="font-bold text-[15px] text-[#1E293B]">
                {getUserName(selected)}
              </div>

              <div className="text-[12px] text-[#64748B]">
                {getUserDepartment(
                  selected
                )}
              </div>

              {selected.profile?.year && (
                <div className="text-[11px] text-[#94A3B8]">
                  Year{" "}
                  {selected.profile.year}
                </div>
              )}

              <div className="mt-3 flex flex-col gap-1.5 text-[12px] text-[#64748B]">
                <div className="flex items-center gap-2">
                  <span>📧</span>
                  <span>
                    {selected.email}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span>🏛️</span>
                  <span>
                    {getUserDepartment(
                      selected
                    )}
                  </span>
                </div>

                {selected.role ===
                  "student" &&
                  selected.profile
                    ?.rollNo && (
                    <div className="flex items-center gap-2">
                      <span>🆔</span>
                      <span>
                        {
                          selected
                            .profile
                            .rollNo
                        }
                      </span>
                    </div>
                  )}

                {selected.role ===
                  "faculty" &&
                  selected.profile
                    ?.facultyId && (
                    <div className="flex items-center gap-2">
                      <span>🆔</span>
                      <span>
                        {
                          selected
                            .profile
                            .facultyId
                        }
                      </span>
                    </div>
                  )}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() =>
                    openEdit(selected)
                  }
                  className="w-full py-2 rounded-lg bg-[#2563EB] text-white text-[12px] font-semibold hover:bg-[#1D4ED8] transition-colors"
                >
                  Edit Profile
                </button>

                <button
                  onClick={() =>
                    resetPassword(
                      selected
                    )
                  }
                  className="w-full py-2 rounded-lg border border-[#E2E8F0] text-[12px] font-medium text-[#64748B] hover:border-[#F97316] hover:text-[#F97316] transition-all"
                >
                  Reset Password
                </button>

                <button
                  onClick={() =>
                    setToDelete(
                      selected
                    )
                  }
                  className="w-full py-2 rounded-lg text-[12px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E2E8F0] flex items-center justify-center h-48 text-[#94A3B8] text-[13px]">
            Select a user to view profile
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      <Modal
        open={!!editing}
        onClose={closeEdit}
        title="Edit User"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeEdit}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={submitEdit}
              disabled={savingEdit}
            >
              {savingEdit
                ? "Saving..."
                : "Save changes"}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Common fields */}
            <div>
              <label className="block text-[12px] font-medium text-[#475569] mb-1">
                First name
              </label>
              <input
                value={editForm.firstName}
                onChange={e =>
                  updateField(
                    "firstName",
                    e.target.value
                  )
                }
                className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#475569] mb-1">
                Last name
              </label>
              <input
                value={editForm.lastName}
                onChange={e =>
                  updateField(
                    "lastName",
                    e.target.value
                  )
                }
                className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#475569] mb-1">
                Email
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={e =>
                  updateField(
                    "email",
                    e.target.value
                  )
                }
                className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#475569] mb-1">
                Role
              </label>
              <input
                value={
                  editing.role ===
                  "student"
                    ? "Student"
                    : "Faculty"
                }
                disabled
                className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] bg-[#F8FAFC] text-[#64748B]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#475569] mb-1">
                Department
              </label>

              <select
                value={editForm.department}
                onChange={e =>
                  updateField(
                    "department",
                    e.target.value
                      ? Number(
                          e.target.value
                        )
                      : ""
                  )
                }
                className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-white"
              >
                <option value="">
                  Select department
                </option>

                {departments.map(
                  department => (
                    <option
                      key={
                        department.department_id
                      }
                      value={
                        department.department_id
                      }
                    >
                      {
                        department.department_name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Student fields */}
            {editing.role ===
              "student" && (
              <>
                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Roll number
                  </label>
                  <input
                    value={
                      editForm.rollNo
                    }
                    onChange={e =>
                      updateField(
                        "rollNo",
                        e.target.value
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[#475569] mb-1">
                      Year
                    </label>
                    <select
                      value={
                        editForm.year
                      }
                      onChange={e =>
                        updateField(
                          "year",
                          e.target.value
                            ? Number(
                                e.target
                                  .value
                              )
                            : ""
                        )
                      }
                      className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] bg-white"
                    >
                      <option value="">
                        Select year
                      </option>
                      <option value="1">
                        First Year
                      </option>
                      <option value="2">
                        Second Year
                      </option>
                      <option value="3">
                        Third Year
                      </option>
                      <option value="4">
                        Fourth Year
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#475569] mb-1">
                      Semester
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={
                        editForm.sem
                      }
                      onChange={e =>
                        updateField(
                          "sem",
                          e.target.value
                            ? Number(
                                e.target
                                  .value
                              )
                            : ""
                        )
                      }
                      className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[#475569] mb-1">
                      Division
                    </label>
                    <input
                      value={
                        editForm.div
                      }
                      onChange={e =>
                        updateField(
                          "div",
                          e.target.value
                        )
                      }
                      className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#475569] mb-1">
                      Academic year
                    </label>
                    <input
                      value={
                        editForm.academicYear
                      }
                      onChange={e =>
                        updateField(
                          "academicYear",
                          e.target.value
                        )
                      }
                      className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Scheme
                  </label>
                  <input
                    value={
                      editForm.scheme
                    }
                    onChange={e =>
                      updateField(
                        "scheme",
                        e.target.value
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Branch
                  </label>
                  <input
                    value={
                      editForm.branch
                    }
                    onChange={e =>
                      updateField(
                        "branch",
                        e.target.value
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Batch
                  </label>
                  <input
                    value={
                      editForm.batch
                    }
                    onChange={e =>
                      updateField(
                        "batch",
                        e.target.value
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Specialization
                  </label>
                  <input
                    value={
                      editForm.specialization
                    }
                    onChange={e =>
                      updateField(
                        "specialization",
                        e.target.value
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Phone
                  </label>
                  <input
                    value={
                      editForm.phone
                    }
                    onChange={e =>
                      updateField(
                        "phone",
                        e.target.value
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Address
                  </label>
                  <textarea
                    value={
                      editForm.address
                    }
                    onChange={e =>
                      updateField(
                        "address",
                        e.target.value
                      )
                    }
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </>
            )}

            {/* Faculty fields */}
            {editing.role ===
              "faculty" && (
              <>
                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Faculty ID
                  </label>
                  <input
                    value={
                      editForm.facultyId
                    }
                    onChange={e =>
                      updateField(
                        "facultyId",
                        e.target.value
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Designation
                  </label>
                  <select
                    value={
                      editForm.designation
                    }
                    onChange={e =>
                      updateField(
                        "designation",
                        e.target.value
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] bg-white"
                  >
                    <option value="">
                      Select designation
                    </option>
                    <option value="Assistant Professor">
                      Assistant Professor
                    </option>
                    <option value="Associate Professor">
                      Associate Professor
                    </option>
                    <option value="Professor">
                      Professor
                    </option>
                    <option value="Head of Department">
                      Head of Department
                    </option>
                    <option value="Visiting Faculty">
                      Visiting Faculty
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Specialization
                  </label>
                  <input
                    value={
                      editForm.specialization
                    }
                    onChange={e =>
                      updateField(
                        "specialization",
                        e.target.value
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Subject
                  </label>
                  <input
                    value={
                      editForm.facultySubject
                    }
                    onChange={e =>
                      updateField(
                        "facultySubject",
                        e.target.value
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Phone
                  </label>
                  <input
                    value={
                      editForm.phone
                    }
                    onChange={e =>
                      updateField(
                        "phone",
                        e.target.value
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Qualification
                  </label>
                  <input
                    value={
                      editForm.qualification
                    }
                    onChange={e =>
                      updateField(
                        "qualification",
                        e.target.value
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={
                      editForm.experience
                    }
                    onChange={e =>
                      updateField(
                        "experience",
                        e.target.value
                          ? Number(
                              e.target.value
                            )
                          : ""
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Office room
                  </label>
                  <input
                    value={
                      editForm.officeRoom
                    }
                    onChange={e =>
                      updateField(
                        "officeRoom",
                        e.target.value
                      )
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1">
                    Bio
                  </label>
                  <textarea
                    value={
                      editForm.bio
                    }
                    onChange={e =>
                      updateField(
                        "bio",
                        e.target.value
                      )
                    }
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!toDelete}
        title="Delete this account?"
        message={`This will permanently remove ${
          toDelete
            ? getUserName(toDelete)
            : ""
        }'s account and sign-in access. This can't be undone.`}
        confirmLabel={
          deleting ? "Deleting..." : "Delete"
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) {
            setToDelete(null)
          }
        }}
      />
    </div>
  )
}