
import { useCallback, useState } from "react";

import AdminSidebar from "./AdminSidebar";
import AdminDashboard from "./AdminDashboard";
import AdminEmployees from "./AdminEmployees";
import AdminLeaveRequests from "./AdminLeaveRequests";
import AdminReports from "./AdminReports";
import AdminSettings from "./AdminSettings";
import AdminProjects from "./AdminProjects";
import AdminProjectTeams from "./AdminProjectTeams";
import AdminDepartments from "./AdminDepartments";
import AdminOrganization from "./AdminOrganization";
import AdminAttendance from "./AdminAttendance";

export default function AdminPortal({ user, onLogout }) {
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <AdminDashboard onNavigate={setActivePage} />;

      case "Employees":
        return <AdminEmployees />;

      case "Departments":
        return <AdminDepartments />;

      case "Organization":
        return <AdminOrganization />;

      case "Leave Requests":
        return <AdminLeaveRequests />;

      case "Attendance":
        return <AdminAttendance />;

      case "Projects":
        return <AdminProjects />;

      case "Project Teams":
        return <AdminProjectTeams />;

      case "Reports":
        return <AdminReports />;

      case "Settings":
        return <AdminSettings user={user} onLogout={onLogout} />;

      default:
        return <AdminDashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <AdminSidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        {/* Mobile Header */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE6EF] bg-white text-xl text-[#52749B]"
            >
              ☰
            </button>

            <p className="text-xl font-bold tracking-tight">
              <span className="text-slate-900">Leave</span>
              <span className="text-[#2563EB]">Desk</span>
            </p>
          </div>

          <span className="rounded-lg bg-[#E8F0FA] px-3 py-2 text-xs font-semibold text-[#52749B]">
            Admin
          </span>
        </div>

        {/* Active Admin Page */}
        {renderPage()}
      </main>
    </div>
  );
}
