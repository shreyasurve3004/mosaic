interface Props {
  onNavigate: (page: string) => void
}

const features = [
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
    title: "Academic Resources",
    desc: "Access lecture notes, slides, and course materials organized by subject and semester.",
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
    title: "Assignments",
    desc: "Track pending, in-progress, and completed assignments in a Kanban-style board.",
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
    title: "Campus Events",
    desc: "Discover workshops, hackathons, and seminars. Register in one click.",
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
    ),
    title: "Library",
    desc: "Search the campus library, check availability, borrow books, and track due dates.",
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M18 20V10M12 20V4M6 20v-6"/>
      </svg>
    ),
    title: "Student Dashboard",
    desc: "Your attendance, CGPA, schedule, and notices — all at a glance, no scrolling required.",
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    ),
    title: "Global Search",
    desc: 'Type "Database" and instantly find notes, assignments, books, and notices together.',
  },
]

const screenshots = [
  { label: "Dashboard", color: "#EFF6FF", accent: "#2563EB" },
  { label: "Assignments", color: "#FFF7ED", accent: "#F97316" },
  { label: "Library", color: "#F0FDF4", accent: "#16A34A" },
]

export default function Landing({ onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="font-bold text-[15px] tracking-tight text-[#1E293B]">Mosaic</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-[#64748B]">
            <a href="#features" className="hover:text-[#1E293B] transition-colors">Features</a>
            <a href="#screenshots" className="hover:text-[#1E293B] transition-colors">Screenshots</a>
            <a href="#about" className="hover:text-[#1E293B] transition-colors">About</a>
            <a href="#contact" className="hover:text-[#1E293B] transition-colors">Contact</a>
          </nav>
          <button
            onClick={() => onNavigate("login")}
            className="text-[13px] font-medium px-4 py-1.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] hover:text-[#2563EB] transition-all"
          >
            Log in
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-32 px-6">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "linear-gradient(#E2E8F0 1px, transparent 1px), linear-gradient(90deg, #E2E8F0 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#2563EB] opacity-[0.07] blur-[80px] rounded-full" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-[12px] font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
            Now available for all campuses
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-[#1E293B] leading-[1.08] mb-3">
            Mosaic
          </h1>
          <p className="text-[18px] font-semibold text-[#2563EB] mb-5 tracking-wide">One Platform. Every Campus.</p>
          <p className="text-lg text-[#64748B] max-w-xl mx-auto leading-relaxed mb-10">
            A unified smart campus platform that brings academics, assignments, events, notices, and student services together — in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onNavigate("login")}
              className="px-6 py-3 rounded-xl bg-[#2563EB] text-white text-[14px] font-semibold hover:bg-[#1D4ED8] transition-colors shadow-sm shadow-[#2563EB]/30"
            >
              Get Started
            </button>
            <a
              href="#features"
              className="px-6 py-3 rounded-xl border border-[#E2E8F0] bg-white text-[14px] font-semibold text-[#1E293B] hover:border-[#2563EB] hover:text-[#2563EB] transition-all"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Hero mockup */}
        <div className="relative max-w-5xl mx-auto mt-20">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl shadow-[#0F172A]/[0.08] overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="w-3 h-3 rounded-full bg-[#FCA5A5]" />
              <div className="w-3 h-3 rounded-full bg-[#FCD34D]" />
              <div className="w-3 h-3 rounded-full bg-[#86EFAC]" />
              <div className="flex-1 mx-4 h-5 rounded bg-[#E2E8F0] text-[10px] flex items-center px-2 text-[#94A3B8]">mosaic.campus.edu/dashboard</div>
            </div>
            {/* Fake dashboard preview */}
            <div className="flex h-64 md:h-80">
              <div className="w-48 border-r border-[#E2E8F0] p-4 bg-white hidden md:flex flex-col gap-1">
                {["Dashboard", "Academics", "Assignments", "Events", "Notices", "Library"].map((item, i) => (
                  <div key={item} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium ${i === 0 ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#64748B]"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-[#2563EB]" : "bg-[#CBD5E1]"}`} />
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-6">
                <div className="text-[13px] font-semibold text-[#1E293B] mb-4">Welcome back, Shreya 👋</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Attendance", val: "87%", c: "#EFF6FF", t: "#2563EB" },
                    { label: "Assignments", val: "3 due", c: "#FFF7ED", t: "#F97316" },
                    { label: "CGPA", val: "8.4", c: "#F0FDF4", t: "#16A34A" },
                    { label: "Events", val: "2 today", c: "#FDF4FF", t: "#9333EA" },
                  ].map(c => (
                    <div key={c.label} className="rounded-xl p-3" style={{ backgroundColor: c.c }}>
                      <div className="text-[10px] font-medium text-[#64748B] mb-1">{c.label}</div>
                      <div className="text-[16px] font-bold" style={{ color: c.t }}>{c.val}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#E2E8F0] p-3">
                    <div className="text-[10px] font-semibold text-[#64748B] mb-2">Today's Schedule</div>
                    {["Database Systems · 9:00 AM", "Software Engineering · 11:00 AM"].map(s => (
                      <div key={s} className="text-[10px] text-[#1E293B] py-1 border-b border-[#F1F5F9] last:border-0">{s}</div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-[#E2E8F0] p-3">
                    <div className="text-[10px] font-semibold text-[#64748B] mb-2">Recent Notices</div>
                    {["Exam schedule released", "Fee payment deadline"].map(n => (
                      <div key={n} className="text-[10px] text-[#1E293B] py-1 border-b border-[#F1F5F9] last:border-0">{n}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-white border-t border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[12px] font-semibold text-[#2563EB] tracking-widest uppercase mb-3">Features</div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1E293B] tracking-tight">Everything your campus needs</h2>
            <p className="text-[#64748B] mt-3 max-w-lg mx-auto">One workspace. Every tool. No switching between apps.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="group p-6 rounded-2xl border border-[#E2E8F0] hover:border-[#2563EB]/40 hover:shadow-md hover:shadow-[#2563EB]/[0.06] transition-all bg-white">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-4 group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-[#1E293B] mb-2">{f.title}</h3>
                <p className="text-[13px] text-[#64748B] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section id="screenshots" className="py-24 px-6 bg-[#F8FAFC] border-t border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[12px] font-semibold text-[#F97316] tracking-widest uppercase mb-3">Screenshots</div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1E293B] tracking-tight">Built for how students actually work</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {screenshots.map(s => (
              <div key={s.label} className="rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm">
                <div className="h-44 flex flex-col" style={{ backgroundColor: s.color }}>
                  <div className="flex items-center gap-1 p-3">
                    <div className="w-2 h-2 rounded-full bg-[#FCA5A5]" />
                    <div className="w-2 h-2 rounded-full bg-[#FCD34D]" />
                    <div className="w-2 h-2 rounded-full bg-[#86EFAC]" />
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-2xl font-bold" style={{ color: s.accent }}>{s.label}</div>
                  </div>
                </div>
                <div className="bg-white px-4 py-3 border-t border-[#E2E8F0]">
                  <div className="text-[13px] font-medium text-[#1E293B]">{s.label} view</div>
                  <div className="text-[11px] text-[#94A3B8]">Full-featured module</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-[#2563EB]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">Ready to unify your campus?</h2>
          <p className="text-[#BFDBFE] mb-8 leading-relaxed">Join thousands of students who manage their academic life on Mosaic.</p>
          <button
            onClick={() => onNavigate("login")}
            className="px-8 py-3.5 rounded-xl bg-white text-[#2563EB] text-[14px] font-semibold hover:bg-[#F0F9FF] transition-colors shadow-lg"
          >
            Get Started — it's free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-[#1E293B] text-[#94A3B8] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-[#2563EB] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="font-bold text-white text-[14px]">Mosaic</span>
            </div>
            <p className="text-[13px] max-w-xs leading-relaxed">One platform. Every campus. Built for the modern student experience.</p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-[13px]">
            <div>
              <div className="font-semibold text-white mb-3">Product</div>
              <div className="flex flex-col gap-2">
                <a href="#features" className="hover:text-white transition-colors">Features</a>
                <a href="#screenshots" className="hover:text-white transition-colors">Screenshots</a>
              </div>
            </div>
            <div>
              <div className="font-semibold text-white mb-3">Contact</div>
              <div className="flex flex-col gap-2">
                <a href="mailto:hello@mosaic.campus" className="hover:text-white transition-colors">hello@mosaic.campus</a>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-[#334155] text-[12px] text-[#475569]">
          © 2026 Mosaic. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
