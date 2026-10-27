interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = true, onConfirm, onCancel }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl shadow-[#0F172A]/20 p-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{ backgroundColor: danger ? "#FEF2F2" : "#EFF6FF", color: danger ? "#DC2626" : "#2563EB" }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h3 className="text-[15px] font-bold text-[#1E293B]">{title}</h3>
        <p className="text-[13px] text-[#64748B] mt-1.5 leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors"
            style={{ backgroundColor: danger ? "#DC2626" : "#2563EB" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
