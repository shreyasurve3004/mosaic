import type { ReactNode } from "react"

interface Props {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  width?: string
  footer?: ReactNode
}

export default function Modal({ open, onClose, title, subtitle, children, width = "max-w-lg", footer }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative w-full ${width} bg-white rounded-2xl shadow-2xl shadow-[#0F172A]/20 max-h-[90vh] flex flex-col`}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#E2E8F0] flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#1E293B] tracking-tight">{title}</h2>
            {subtitle && <p className="text-[12px] text-[#64748B] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#1E293B] transition-colors flex-shrink-0"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-end gap-2 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  )
}
