const FEATURES = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </svg>
    ),
    title: "Easy Requests",
    desc: "Submit leave requests with a simple form.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="m8 12 2.5 2.5L16.5 9" />
      </svg>
    ),
    title: "Quick Approvals",
    desc: "Approve or reject employee requests.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3v18h18" />
        <rect x="7" y="10" width="3" height="7" rx="0.5" />
        <rect x="14" y="5" width="3" height="12" rx="0.5" />
      </svg>
    ),
    title: "Request Tracking",
    desc: "Keep track of pending and approved leaves.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Team Overview",
    desc: "See employees who are out today.",
  },
];

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-16">
        <p className="text-3xl font-bold">
          <span className="text-slate-800">Leave</span>
          <span className="text-[#2563EB]">Desk</span>
        </p>

        <div className="flex items-center gap-6 md:gap-10">
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#home"
              className="text-lg font-semibold transition-colors hover:text-[#2563EB]"
            >
              Home
            </a>

            <a
              href="#features"
              className="text-lg font-semibold transition-colors hover:text-[#2563EB]"
            >
              Features
            </a>

            <a
              href="#about"
              className="text-lg font-semibold transition-colors hover:text-[#2563EB]"
            >
              About
            </a>
          </div>

          <button
            type="button"
            onClick={onGetStarted}
            className="rounded-lg bg-[#2563EB] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="home"
        className="grid items-center gap-12 bg-[#EFF6FF] px-6 py-20 md:grid-cols-2 md:px-16 md:py-28"
      >
        <div>
          <span className="inline-block rounded-full bg-[#DBEAFE] px-4 py-2 text-sm font-semibold text-[#1D4ED8]">
            Smart Employee Leave Management
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-tight md:text-6xl">
            Simplify Your
            <span className="text-blue-600"> Leave Management</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
            Manage employee leave requests, track approvals, and keep your team
            organized with one simple platform.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={onGetStarted}
              className="rounded-lg bg-[#2563EB] px-7 py-3 font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-[#1D4ED8] hover:shadow-lg"
            >
              Get Started →
            </button>

            <a
              href="#features"
              className="rounded-lg border border-[#93C5FD] px-7 py-3 font-semibold text-slate-800 transition-all duration-300 hover:-translate-y-1 hover:border-[#2563EB] hover:bg-[#DBEAFE] hover:shadow-md"
            >
              Explore Features
            </a>
          </div>
        </div>

        {/* Dashboard Preview (sample data, not live) */}
        <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold">Leave Overview</h2>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
              Preview
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm text-slate-500">Total</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">24</p>
            </div>

            <div className="rounded-xl bg-yellow-50 p-4">
              <p className="text-sm text-slate-500">Pending</p>
              <p className="mt-2 text-2xl font-bold text-yellow-600">08</p>
            </div>

            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-sm text-slate-500">Approved</p>
              <p className="mt-2 text-2xl font-bold text-green-700">16</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-100 p-5">
            <h3 className="font-semibold">Leave Management</h3>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Annual Leave</span>
                <span className="text-sm font-medium text-green-700">
                  Approved
                </span>
              </div>
              <div className="h-2 rounded-full bg-green-100">
                <div className="h-2 w-3/4 rounded-full bg-green-500" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Sick Leave</span>
                <span className="text-sm font-medium text-yellow-700">
                  Pending
                </span>
              </div>
              <div className="h-2 rounded-full bg-yellow-100">
                <div className="h-2 w-1/2 rounded-full bg-yellow-500" />
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Sample data for illustration only
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 md:px-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Everything You Need to Manage Leaves
          </h2>
          <p className="mt-4 text-slate-600">
            Simple tools to make employee leave management easier.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200 p-7 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="block h-12 w-12 text-[#2563EB]">
                {feature.icon}
              </span>
              <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="about" className="bg-slate-50 px-6 py-20 md:px-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <p className="mt-3 text-slate-600">
            Three simple steps to manage leave requests.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">
          {[
            ["01", "Submit Request", "Employees submit their leave details."],
            ["02", "Review Request", "Requests are reviewed by the manager."],
            ["03", "Approve or Reject", "The request status is updated."],
          ].map(([number, title, desc]) => (
            <div
              key={number}
              className="rounded-xl bg-white p-7 text-center shadow-sm"
            >
              <span className="text-3xl font-bold text-blue-600">{number}</span>
              <h3 className="mt-4 text-xl font-bold">{title}</h3>
              <p className="mt-3 text-slate-600">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={onGetStarted}
            className="rounded-lg bg-[#2563EB] px-8 py-3 font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-[#1D4ED8] hover:shadow-lg"
          >
            Start Managing Leaves →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 px-6 py-8 text-center text-white">
        <p className="text-xl font-bold">LeaveDesk</p>
        <p className="mt-2 text-sm text-slate-400">
          Simplifying employee leave management.
        </p>
        <p className="mt-5 text-xs text-slate-500">
          © 2026 LeaveDesk. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
