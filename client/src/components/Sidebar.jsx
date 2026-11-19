
const NAV_ITEMS = [
  { id: "Dashboard", label: "Dashboard", icon: "▦" },
  { id: "Leave Requests", label: "Leave Requests", icon: "▤" },
  { id: "New Request", label: "New Request", icon: "+" },
  { id: "Out Today", label: "Out Today", icon: "◷" },
];

export default function Sidebar({
  activePage,
  onNavigate,
  onBackHome,
}) {
  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-[#DCE6EF] bg-white px-5 py-7">

      {/* Logo */}
      <div className="mb-12 px-3">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-slate-900">Leave</span>
          <span className="text-[#2563EB]">Desk</span>
        </h1>

        <p className="mt-2 text-base font-medium text-slate-500">
          Leave Management
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        <p className="mb-5 px-3 text-sm font-bold uppercase tracking-wider text-slate-400">
          Main Menu
        </p>

        <div className="space-y-3">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onNavigate(item.id)}
                className={`group relative flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left text-base font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                  isActive
                    ? "border-[#C9D9EE] bg-[#E8F0FA] text-[#52749B] shadow-sm"
                    : "border-transparent text-slate-600 hover:border-[#DCE6EF] hover:bg-[#F0F5FA] hover:text-[#52749B]"
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-[#789BC5]" />
                )}

                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl transition-all duration-200 ${
                    isActive
                      ? "bg-white text-[#52749B]"
                      : "text-slate-500 group-hover:bg-white group-hover:text-[#52749B]"
                  }`}
                >
                  {item.icon}
                </span>

                <span>{item.label}</span>

                {isActive && (
                  <span className="ml-auto text-sm text-[#789BC5]">
                    ›
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Back to Home */}
      <div className="border-t border-[#E8EEF4] pt-5">
        <button
          type="button"
          onClick={onBackHome}
          className="group flex w-full items-center gap-4 rounded-xl px-4 py-4 text-base font-semibold text-slate-500 transition-all duration-200 hover:translate-x-1 hover:bg-[#F0F5FA] hover:text-[#52749B]"
        >
          <span className="text-xl transition-transform duration-200 group-hover:-translate-x-1">
            ←
          </span>

          Back to Home
        </button>
      </div>
    </aside>
  );
}
