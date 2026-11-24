
import { useEffect } from "react";

const NAV_ITEMS = [
  { id: "Dashboard", label: "Dashboard" },
  { id: "Employees", label: "Employees" },
  { id: "Departments", label: "Departments" },
  { id: "Organization", label: "Organization" },
  { id: "Leave Requests", label: "Leave Requests" },
  { id: "Attendance", label: "Attendance" },
  { id: "Projects", label: "Projects" },
  { id: "Project Teams", label: "Project Teams" },
  { id: "Reports", label: "Reports" },
  { id: "Settings", label: "Settings" },
];

export default function AdminSidebar({
  activePage,
  onNavigate,
  onLogout,
  isOpen,
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleNavigate = (id) => {
    onNavigate(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Admin Sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto border-r border-[#DCE6EF] bg-white px-5 py-7 transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="mb-12 flex items-start justify-between px-3">
          <div>
            <p className="text-3xl font-bold tracking-tight">
              <span className="text-slate-900">Leave</span>
              <span className="text-[#2563EB]">Desk</span>
            </p>

            <p className="mt-2 text-base font-medium text-slate-500">
              Admin Portal
            </p>
          </div>

          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-[#F0F5FA] md:hidden"
          >
            ×
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1" aria-label="Admin navigation">
          <p className="mb-5 px-3 text-sm font-bold uppercase tracking-wider text-slate-400">
            Administration
          </p>

          <div className="space-y-3">
            {NAV_ITEMS.map((item) => {
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => handleNavigate(item.id)}
                  className={`group relative flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left text-base font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                    isActive
                      ? "border-[#C9D9EE] bg-[#E8F0FA] text-[#52749B] shadow-sm"
                      : "border-transparent text-slate-600 hover:border-[#DCE6EF] hover:bg-[#F0F5FA] hover:text-[#52749B]"
                  }`}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <span className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-[#789BC5]" />
                  )}

                  {/* Navigation Label */}
                  <span>{item.label}</span>

                  {/* Arrow */}
                  <span
                    aria-hidden="true"
                    className={`text-lg transition-transform duration-200 group-hover:translate-x-1 ${
                      isActive
                        ? "text-[#789BC5]"
                        : "text-slate-400 group-hover:text-[#52749B]"
                    }`}
                  >
                    &gt;
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Admin Account & Logout */}
        <div className="border-t border-[#E8EEF4] pt-5">
          <div className="mb-3 rounded-xl bg-[#F0F5FA] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Signed in as
            </p>

            <p className="mt-1 font-semibold text-slate-700">
              Administrator
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="group flex w-full items-center gap-4 rounded-xl px-4 py-4 text-base font-semibold text-red-500 transition-all duration-200 hover:translate-x-1 hover:bg-red-50"
          >
            <span aria-hidden="true" className="text-xl">
              ↪
            </span>

            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
