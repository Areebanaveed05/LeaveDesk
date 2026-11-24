
import { useCallback, useEffect, useState } from "react";
import api from "../api";
import OutTodayBanner from "./OutTodayBanner";

const STAT_CARDS = [
  {
    title: "Total Employees",
    key: "totalEmployees",
    icon: "♙",
    description: "Registered employee accounts",
  },
  {
    title: "Active Employees",
    key: "activeEmployees",
    icon: "✓",
    description: "Currently active accounts",
  },
  {
    title: "Pending Requests",
    key: "pendingRequests",
    icon: "◷",
    description: "Waiting for your decision",
  },
  {
    title: "Approved Requests",
    key: "approvedRequests",
    icon: "▣",
    description: "Successfully approved requests",
  },
];

const DECISION_DAYS = [
  {
    label: "Yesterday",
    offset: -1,
    card: "border-[#C8E3D1] bg-[#E3F1E8]",
    heading: "text-[#54866A]",
    dot: "bg-[#78A98A]",
    text: "text-[#47775C]",
    inner: "border-white/70 bg-white/60",
  },
  {
    label: "Today",
    offset: 0,
    card: "border-[#C7D9EF] bg-[#E7EFF9]",
    heading: "text-[#587DA8]",
    dot: "bg-[#789BC5]",
    text: "text-[#52749B]",
    inner: "border-white/70 bg-white/60",
  },
  {
    label: "Tomorrow",
    offset: 1,
    card: "border-[#E9DCA8] bg-[#F8F2D9]",
    heading: "text-[#947D37]",
    dot: "bg-[#C9AD51]",
    text: "text-[#927A36]",
    inner: "border-white/70 bg-white/60",
  },
];

const TYPE_BADGES = {
  "Work From Home": "bg-blue-100 text-blue-700",
  "Annual Leave": "bg-[#EADCCB] text-[#76583E]",
  "Sick Leave": "bg-red-100 text-red-700",
  "Half Day": "bg-orange-100 text-orange-700",
};

function getDateKeyFromValue(value) {
  if (!value) return "";

  // Preserve date-only values without timezone conversion.
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(value)
  ) {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function getRelativeDate(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDecisionDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Format project dates
function formatProjectDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


// Treat an Active project with an expired deadline as overdue.
// Project status remains unchanged in the database; this only controls
// whether the project belongs in the dashboard's Active Projects section.
function isProjectOverdue(project) {
  if (project?.isOverdue === true) return true;
  if (!project?.deadline) return false;

  const deadlineKey =
    typeof project.deadline === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(project.deadline)
      ? project.deadline.slice(0, 10)
      : new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Karachi",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(project.deadline));

  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return Boolean(deadlineKey) && deadlineKey < todayKey;
}

function getRequestsForDate(requests, dateKey) {
  return requests.filter((request) => {
    if (
      request.status !== "Approved" &&
      request.status !== "Rejected"
    ) {
      return false;
    }

    const startDate = getDateKeyFromValue(request.startDate);
    const endDate =
      getDateKeyFromValue(request.endDate) || startDate;

    if (!startDate || !endDate) return false;

    // Include requests whose leave period covers this date.
    return startDate <= dateKey && endDate >= dateKey;
  });
}

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
  });

  const [requests, setRequests] = useState([]);

  // Active projects state
  const [activeProjects, setActiveProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        employeesResponse,
        requestsResponse,
        projectsResponse,
      ] = await Promise.all([
        api.get("/users"),
        api.get("/requests"),
        api.get("/projects"),
      ]);

      const employees = Array.isArray(employeesResponse.data)
        ? employeesResponse.data
        : [];

      const allRequests = Array.isArray(requestsResponse.data)
        ? requestsResponse.data
        : [];

      const allProjects = Array.isArray(projectsResponse.data)
        ? projectsResponse.data
        : projectsResponse.data?.projects || [];

      setRequests(allRequests);

      // Only Active projects will appear on the dashboard.
      setActiveProjects(
        allProjects.filter(
          (project) =>
            project.status === "Active" &&
            !isProjectOverdue(project)
        )
      );

      setStats({
        totalEmployees: employees.length,

        activeEmployees: employees.filter(
          (employee) => employee.isActive
        ).length,

        pendingRequests: allRequests.filter(
          (request) => request.status === "Pending"
        ).length,

        approvedRequests: allRequests.filter(
          (request) => request.status === "Approved"
        ).length,

        rejectedRequests: allRequests.filter(
          (request) => request.status === "Rejected"
        ).length,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load dashboard information. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1);
    fetchDashboardData();
  };

  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-7xl">

      {/* Page Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#52749B]">
            Administration
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-slate-500">
            Welcome back! Here's your organization's leave management overview.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCE6EF] bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-[#F0F5FA] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">↻</span>
          Refresh Data
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="mb-6 flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center"
        >
          <p className="text-sm text-red-600">{error}</p>

          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Out Today */}
      <OutTodayBanner refreshKey={refreshKey} />

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {card.title}
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {loading ? "—" : stats[card.key]}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F0FA] text-2xl font-semibold text-[#52749B]">
                {card.icon}
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              {card.description}
            </p>
          </div>
        ))}
      </div>

      {/* Active Projects */}
      <section className="mt-8 rounded-2xl border border-[#DCE6EF] bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Active Projects
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Projects currently in progress.
          </p>
        </div>

        {loading ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Loading active projects...
          </p>
        ) : activeProjects.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            No active projects right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeProjects.map((project) => (
              <div
                key={project._id}
                className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-slate-800">
                    {project.name}
                  </h3>

                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Active
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/80 p-3">
                    <p className="text-xs font-medium text-slate-500">
                      Start Date
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatProjectDate(project.startDate)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/80 p-3">
                    <p className="text-xs font-medium text-slate-500">
                      End Date
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatProjectDate(project.deadline)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Leave Request Overview */}
      <div className="mt-8 rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Leave Request Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current status of employee leave requests.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-amber-50 p-5">
            <p className="text-sm font-medium text-amber-700">
              Pending
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-800">
              {loading ? "—" : stats.pendingRequests}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50 p-5">
            <p className="text-sm font-medium text-emerald-700">
              Approved
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-800">
              {loading ? "—" : stats.approvedRequests}
            </p>
          </div>

          <div className="rounded-xl bg-red-50 p-5">
            <p className="text-sm font-medium text-red-700">
              Rejected
            </p>

            <p className="mt-2 text-2xl font-bold text-red-800">
              {loading ? "—" : stats.rejectedRequests}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Leave Decisions */}
      <section className="mt-8 rounded-2xl border border-[#DCE6EF] bg-[#F0F5FA] p-6 shadow-md">
        <div className="mb-7">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0E8DE] text-3xl text-[#B89572]">
              ✓
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Recent Leave Decisions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Approved and rejected requests that cover yesterday, today or tomorrow.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {DECISION_DAYS.map((day) => {
            const dateKey = getRelativeDate(day.offset);

            const dayRequests = getRequestsForDate(
              requests,
              dateKey
            );

            return (
              <div
                key={day.label}
                className={`rounded-2xl border p-5 shadow-sm ${day.card}`}
              >
                {/* Date Heading */}
                <div className="flex items-center gap-3">
                  <span
                    className={`h-3.5 w-3.5 rounded-full ${day.dot}`}
                  />

                  <h3
                    className={`text-lg font-bold ${day.heading}`}
                  >
                    {day.label}
                  </h3>
                </div>

                <p className={`mt-2 pl-6 text-sm font-medium ${day.text}`}>
                  {formatDecisionDate(dateKey)}
                </p>

                <div className="my-4 border-t border-black/10" />

                {/* Requests */}
                {loading ? (
                  <div
                    className={`rounded-xl border p-4 text-sm ${day.inner} ${day.text}`}
                  >
                    Loading leave decisions...
                  </div>
                ) : dayRequests.length === 0 ? (
                  <div
                    className={`rounded-xl border p-4 text-sm ${day.inner} ${day.text}`}
                  >
                    No leave decisions for this date.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayRequests.map((request) => (
                      <div
                        key={`${request._id}-${day.label}`}
                        className={`rounded-xl border p-4 ${day.inner}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800">
                              {request.employeeName || "Employee"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {request.department || "Department not specified"}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              request.status === "Approved"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {request.status}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                              TYPE_BADGES[request.type] ||
                              "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {request.type || "Leave"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-5 text-lg font-bold text-slate-900">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onNavigate?.("Employees")}
            className="flex items-center gap-4 rounded-2xl border border-[#E2EAF2] bg-white p-5 text-left shadow-sm transition hover:border-[#C9D9EE] hover:bg-[#F8FAFC]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F0FA] text-2xl text-[#52749B]">
              +
            </span>

            <span>
              <span className="block font-semibold text-slate-900">
                Manage Employees
              </span>

              <span className="mt-1 block text-sm text-slate-500">
                Create and manage employee accounts
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("Leave Requests")}
            className="flex items-center gap-4 rounded-2xl border border-[#E2EAF2] bg-white p-5 text-left shadow-sm transition hover:border-[#C9D9EE] hover:bg-[#F8FAFC]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F0FA] text-2xl text-[#52749B]">
              ▤
            </span>

            <span>
              <span className="block font-semibold text-slate-900">
                Review Leave Requests
              </span>

              <span className="mt-1 block text-sm text-slate-500">
                Review and manage employee requests
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
