import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes } from "react"

export function Field({ label, error, children, required }: { label: string; error?: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] font-semibold text-[#334155] mb-1.5">
        {label}{required && <span className="text-[#DC2626] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-[#DC2626] mt-1">{error}</p>}
    </div>
  )
}

const baseInput = "w-full h-9 px-3 rounded-lg border text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-all bg-white"

export function TextInput({ error, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={`${baseInput} ${error ? "border-[#FCA5A5] focus:border-[#DC2626]" : "border-[#E2E8F0] focus:border-[#2563EB]"} ${className}`}
    />
  )
}

export function TextArea({ error, className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 rounded-lg border text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-all resize-none bg-white ${error ? "border-[#FCA5A5] focus:border-[#DC2626]" : "border-[#E2E8F0] focus:border-[#2563EB]"} ${className}`}
    />
  )
}

export function Select({ error, className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      {...props}
      className={`${baseInput} ${error ? "border-[#FCA5A5]" : "border-[#E2E8F0] focus:border-[#2563EB]"} ${className}`}
    >
      {children}
    </select>
  )
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-[#334155] cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]/20" />
      {label}
    </label>
  )
}

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles: Record<string, string> = {
    primary: "bg-[#2563EB] text-white hover:bg-[#1D4ED8]",
    secondary: "bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]",
    danger: "bg-[#DC2626] text-white hover:bg-[#B91C1C]",
    ghost: "text-[#64748B] hover:bg-[#F1F5F9]",
  }
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    />
  )
}
