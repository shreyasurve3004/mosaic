import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

type ToastKind = "success" | "error" | "info"
interface Toast { id: number; message: string; kind: ToastKind }

interface ToastValue {
  showToast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastValue | null>(null)

const kindStyle: Record<ToastKind, { bg: string; border: string; text: string; icon: ReactNode }> = {
  success: {
    bg: "#F0FDF4", border: "#BBF7D0", text: "#16A34A",
    icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  },
  error: {
    bg: "#FEF2F2", border: "#FECACA", text: "#DC2626",
    icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  },
  info: {
    bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB",
    icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, kind }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-[320px] max-w-[90vw]">
        {toasts.map(t => {
          const s = kindStyle[t.kind]
          return (
            <div
              key={t.id}
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-[13px] font-medium animate-in fade-in slide-in-from-top-2"
              style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
            >
              <span className="flex-shrink-0 mt-0.5">{s.icon}</span>
              <span className="leading-snug">{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}
