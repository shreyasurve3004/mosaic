import { useEffect, useRef, useState } from "react"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import Modal from "../../components/ui/Modal"
import { Field, Select, TextArea, TextInput, Button } from "../../components/ui/FormControls"
import { useToast } from "../../components/ui/ToastContext"
import {
  getAllNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  renewNotice,
  uploadNoticeAttachments,
  deleteNoticeAttachment,
  type CreateNoticeData,
  type Notice,
} from "../../api/notices"

const emptyForm: CreateNoticeData = {
  title: "",
  category: "Academic",
  priority: "Medium",
  content: "",
  published_date: null,
  expiry_date: null,
  status: "Published",
  target_year: "ALL",
}

function dateValue(value: string | null) {
  return value ? value.slice(0, 10) : ""
}

function dateIso(value: string) {
  return value ? new Date(`${value}T23:59:59`).toISOString() : null
}

function displayDate(value: string | null) {
  if (!value) return "Not published"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN")
}

export default function FacultyNotices() {
  const { showToast } = useToast()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CreateNoticeData>(emptyForm)
  const [editing, setEditing] = useState<Notice | null>(null)
  const [toDelete, setToDelete] = useState<Notice | null>(null)
  const [createFiles, setCreateFiles] = useState<File[]>([])
  const createFileInputRef = useRef<HTMLInputElement | null>(null)

  const loadNotices = async () => {
    try {
      setLoading(true)
      setNotices(await getAllNotices())
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load notices", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotices()
  }, [])

  const createNewNotice = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      showToast("Title and content are required", "error")
      return
    }
    try {
      setSaving(true)
      let created = await createNotice({
        title: form.title.trim(),
        category: form.category,
        priority: form.priority,
        content: form.content.trim(),
        published_date: form.status === "Published" ? new Date().toISOString() : null,
        expiry_date: form.expiry_date,
        status: form.status,
        target_year: form.target_year,
      })
      if (createFiles.length > 0) {
        created = await uploadNoticeAttachments(created.notice_id, createFiles)
      }
      setNotices(current => [created, ...current])
      setForm(emptyForm)
      setCreateFiles([])
      showToast(created.status === "Published" ? "Notice published" : "Notice saved as draft", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to create notice", "error")
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async () => {
    if (!editing || !editing.title.trim() || !editing.content.trim()) {
      showToast("Title and content are required", "error")
      return
    }
    try {
      setSaving(true)
      const updated = await updateNotice(editing.notice_id, {
        title: editing.title.trim(),
        category: editing.category,
        priority: editing.priority,
        content: editing.content.trim(),
        published_date: editing.published_date,
        expiry_date: editing.expiry_date,
        status: editing.status,
        target_year: editing.target_year,
      })
      setNotices(current => current.map(item => item.notice_id === updated.notice_id ? updated : item))
      setEditing(null)
      showToast("Notice updated", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update notice", "error")
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteNotice(toDelete.notice_id)
      setNotices(current => current.filter(item => item.notice_id !== toDelete.notice_id))
      setToDelete(null)
      showToast("Notice deleted", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete notice", "error")
    }
  }

  const renew = async (notice: Notice) => {
    const expiry = notice.expiry_date ? new Date(notice.expiry_date) : new Date()
    expiry.setMonth(expiry.getMonth() + 1)
    try {
      const response = await renewNotice(notice.notice_id, expiry.toISOString())
      setNotices(current => current.map(item => item.notice_id === response.notice.notice_id ? response.notice : item))
      showToast("Notice renewed", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to renew notice", "error")
    }
  }

  const uploadFiles = async (notice: Notice, files: File[]) => {
    if (!files.length) return
    try {
      const updated = await uploadNoticeAttachments(notice.notice_id, files)
      setNotices(current => current.map(item => item.notice_id === updated.notice_id ? updated : item))
      showToast("Attachment(s) uploaded", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to upload attachments", "error")
    }
  }

  const removeAttachment = async (notice: Notice, publicId: string) => {
    try {
      const updated = await deleteNoticeAttachment(notice.notice_id, publicId)
      setNotices(current => current.map(item => item.notice_id === updated.notice_id ? updated : item))
      showToast("Attachment removed", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to remove attachment", "error")
    }
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#1E293B]">Notices</h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">Create and manage notices for students</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-5 h-fit">
          <h2 className="text-[14px] font-semibold text-[#1E293B] mb-4">Create Notice</h2>
          <div className="flex flex-col gap-4">
            <TextInput value={form.title} placeholder="Notice title..." onChange={e => setForm(current => ({ ...current, title: e.target.value }))} />
            <TextArea rows={5} value={form.content} placeholder="Notice content..." onChange={e => setForm(current => ({ ...current, content: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.priority} onChange={e => setForm(current => ({ ...current, priority: e.target.value as Notice["priority"] }))}><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></Select>
              <Select value={form.category} onChange={e => setForm(current => ({ ...current, category: e.target.value }))}><option>Academic</option><option>Examinations</option><option>Events</option><option>Resources</option></Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Select value={form.target_year} onChange={e => setForm(current => ({ ...current, target_year: e.target.value as Notice["target_year"] }))}><option value="ALL">All Years</option><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option></Select>
              <Select value={form.status} onChange={e => setForm(current => ({ ...current, status: e.target.value as Notice["status"] }))}><option value="Published">Published</option><option value="Draft">Draft</option></Select>
              <input type="date" value={dateValue(form.expiry_date ?? null)} onChange={e => setForm(current => ({ ...current, expiry_date: dateIso(e.target.value) }))} className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] bg-[#F8FAFC]" />
            </div>
            <div className="flex items-center justify-between"><span className="text-[12px] font-medium text-[#334155]">Attachments</span><button type="button" onClick={() => createFileInputRef.current?.click()} disabled={saving} className="text-[11px] px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[#64748B]">Add files</button><input ref={createFileInputRef} type="file" multiple className="hidden" onChange={e => { setCreateFiles(e.target.files ? Array.from(e.target.files) : []); e.currentTarget.value = "" }} /></div>
            {createFiles.length > 0 && <div className="space-y-1.5">{createFiles.map((file, index) => <div key={`${file.name}-${index}`} className="flex justify-between gap-2 text-[11px] text-[#475569]"><span className="truncate">{file.name}</span><button type="button" onClick={() => setCreateFiles(current => current.filter((_, fileIndex) => fileIndex !== index))} className="text-[#DC2626]">Remove</button></div>)}</div>}
            <div className="flex gap-2"><button onClick={createNewNotice} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold disabled:opacity-50">{saving ? "Saving..." : form.status === "Published" ? "Publish Notice" : "Save Draft"}</button><button onClick={() => { setForm(emptyForm); setCreateFiles([]) }} disabled={saving} className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] text-[#64748B]">Reset</button></div>
          </div>
        </div>
        <div className="lg:col-span-3 flex flex-col gap-3">
          <h2 className="text-[14px] font-semibold text-[#1E293B]">Your Notices</h2>
          {loading ? <div className="text-center py-16 text-[13px] text-[#94A3B8]">Loading notices...</div> : notices.map(notice => <div key={notice.notice_id} className="bg-white rounded-xl border border-[#E2E8F0] p-5"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] text-[#64748B]">{notice.priority} · {notice.category}</span><h3 className="text-[14px] font-semibold text-[#1E293B]">{notice.title}</h3></div><div className="flex gap-2"><button onClick={() => setEditing(notice)} className="text-[11px] text-[#2563EB]">Edit</button><button onClick={() => setToDelete(notice)} className="text-[11px] text-[#DC2626]">Delete</button></div></div><p className="mt-2 text-[13px] text-[#475569] whitespace-pre-wrap">{notice.content}</p><div className="mt-3 flex items-center gap-3 text-[11px] text-[#94A3B8]"><span>{displayDate(notice.published_date)}</span><span>{notice.status}</span><button onClick={() => renew(notice)} className="ml-auto text-[#2563EB]">Renew</button></div><div className="mt-3 border-t border-[#F1F5F9] pt-3"><div className="flex items-center justify-between mb-2"><span className="text-[12px] font-semibold text-[#1E293B]">Attachments</span><label htmlFor={`notice-files-${notice.notice_id}`} className="text-[11px] text-[#2563EB] cursor-pointer">Add files</label><input id={`notice-files-${notice.notice_id}`} type="file" multiple className="hidden" onChange={e => { uploadFiles(notice, e.target.files ? Array.from(e.target.files) : []); e.currentTarget.value = "" }} /></div>{notice.attachments?.map((attachment, index) => <div key={attachment.public_id ?? index} className="flex justify-between text-[11px]"><a href={attachment.file_url} target="_blank" rel="noreferrer" className="truncate text-[#2563EB]">{attachment.file_name ?? "Attachment"}</a>{attachment.public_id && <button onClick={() => removeAttachment(notice, attachment.public_id!)} className="text-[#DC2626]">Remove</button>}</div>)}</div></div>)}
          {!loading && notices.length === 0 && <div className="text-center py-16 text-[13px] text-[#94A3B8]">You haven't posted any notices yet.</div>}
        </div>
      </div>
      <ConfirmDialog open={!!toDelete} title="Delete this notice?" message={`"${toDelete?.title}" will be permanently removed.`} confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Notice" footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={saveEdit} disabled={saving}>Save changes</Button></>}>
        {editing && <div className="space-y-3"><Field label="Title" required><TextInput value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></Field><Field label="Category"><Select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })}><option>Academic</option><option>Examinations</option><option>Events</option><option>Resources</option></Select></Field><Field label="Content"><TextArea rows={5} value={editing.content} onChange={e => setEditing({ ...editing, content: e.target.value })} /></Field><Field label="Status"><Select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as Notice["status"] })}><option value="Published">Published</option><option value="Draft">Draft</option><option value="Archived">Archived</option></Select></Field></div>}
      </Modal>
    </div>
  )
}
