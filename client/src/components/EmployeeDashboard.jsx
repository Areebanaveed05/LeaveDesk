import { useEffect, useState } from "react";
import api from "../api";
import { formatUTCDate } from "../utils/date";

const getPakistanDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

// Convert date values to YYYY-MM-DD without timezone shifting date-only values.
const getDateKey = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const formatAttendanceTime = (value) => {
  if (!value) return "Pending";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

function AttendanceTimeChips({
  attendance,
  loading,
  onNavigate,
  leaveRequest,
}) {
  const sessions = attendance?.sessions || [];

  const firstCheckIn = sessions.length
    ? sessions[0].checkIn
    : null;

  const lastSession = sessions.length
    ? sessions[sessions.length - 1]
    : null;

  const lastCheckOut = lastSession?.checkOut || null;

  const isFullDayLeave =
    leaveRequest?.type === "Annual Leave" ||
    leaveRequest?.type === "Sick Leave";

  const leaveLabel =
    leaveRequest?.type === "Work From Home"
      ? "Work From Home"
      : leaveRequest?.type === "Half Day"
        ? "Half Day Leave"
        : "On Leave";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      {leaveRequest && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            {isFullDayLeave ? "✓" : "◷"}
          </span>

          <div>
            <p className="text-[11px] font-medium text-amber-700">
              Today's Attendance Status
            </p>
            <p className="text-sm font-bold text-amber-800">
              {leaveLabel}
            </p>
          </div>
        </div>
      )}

      {!isFullDayLeave && (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-4 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              ↘
            </span>

            <div>
              <p className="text-[11px] font-medium text-slate-500">
                Today's Check-in
              </p>
              <p className="text-sm font-bold text-slate-800">
                {loading
                  ? "Loading..."
                  : firstCheckIn
                    ? formatAttendanceTime(firstCheckIn)
                    : "--"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-4 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              ↗
            </span>

            <div>
              <p className="text-[11px] font-medium text-slate-500">
                Today's Check-out
              </p>
              <p className="text-sm font-bold text-slate-800">
                {loading
                  ? "Loading..."
                  : lastCheckOut
                    ? formatAttendanceTime(lastCheckOut)
                    : lastSession
                      ? "In progress"
                      : "--"}
              </p>
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => onNavigate?.("Attendance & Check-in")}
        className="text-sm font-semibold text-[#2563EB] hover:underline"
      >
        View Attendance →
      </button>
    </div>
  );
}

const StatCard = ({ title, value, subtitle, icon, color }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h2 className="mt-2 text-3xl font-bold text-gray-800">
          {value}
        </h2>
        <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
      </div>

      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${color}`}
      >
        {icon}
      </div>
    </div>
  </div>
);

const BalanceCard = ({ title, balance, color }) => {
  const allowance = Number(balance?.allowance || 0);
  const used = Number(balance?.used || 0);
  const pending = Number(balance?.pending || 0);
  const remaining = Number(balance?.remaining || 0);
  const available = Number(balance?.available || 0);

  const usedPercentage =
    allowance > 0 ? Math.min((used / allowance) * 100, 100) : 0;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${color}`}>
          {allowance} Days Total
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-800">{available}</p>
          <p className="mt-1 text-sm text-gray-500">Available Days</p>
        </div>

        <p className="text-sm text-gray-500">{used} used</p>
      </div>

      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${usedPercentage}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
        <span>Used: {used} days</span>
        <span>Pending: {pending} days</span>
        <span>Remaining: {remaining} days</span>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    Pending: "bg-amber-50 text-amber-700",
    Approved: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-red-50 text-red-600",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
};

const formatProjectDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};


// Overdue projects should not appear in the Active Projects dashboard list.
// The backend may also provide `isOverdue`; the date check is a safe fallback.
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

  return Boolean(deadlineKey) && deadlineKey < getPakistanDate();
}

function ActiveProjectCard({ project }) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-gray-800">{project.name}</h3>

        <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Active
        </span>
      </div>

      {project.description && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-500">
          {project.description}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/80 p-3">
          <p className="text-xs text-gray-500">Start Date</p>
          <p className="mt-1 text-sm font-semibold text-gray-800">
            {formatProjectDate(project.startDate)}
          </p>
        </div>

        <div className="rounded-lg bg-white/80 p-3">
          <p className="text-xs text-gray-500">Deadline</p>
          <p className="mt-1 text-sm font-semibold text-gray-800">
            {formatProjectDate(project.deadline)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeDashboard({
  user,
  summary,
  requests = [],
  onNavigate,
}) {
  const annual = summary?.balance?.annual || {};
  const sick = summary?.balance?.sick || {};
  const counts = summary?.counts || {};

  const todayDateKey = getPakistanDate();

  // Only approved requests covering today's Pakistan date affect attendance.
  const approvedLeaveToday = requests.find((request) => {
    if (request.status !== "Approved") return false;

    const startDate = getDateKey(request.startDate);
    const endDate = getDateKey(request.endDate);

    return (
      startDate &&
      endDate &&
      startDate <= todayDateKey &&
      endDate >= todayDateKey
    );
  }) || null;

  const [activeProjects, setActiveProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchMyProjects = async () => {
      try {
        setProjectsLoading(true);
        setProjectsError("");

        const response = await api.get("/projects");

        const projectData = Array.isArray(response.data)
          ? response.data
          : response.data?.projects || [];

        if (isMounted) {
          setActiveProjects(
            projectData.filter(
              (project) =>
                project.status === "Active" &&
                !isProjectOverdue(project)
            )
          );
        }
      } catch (error) {
        if (isMounted) {
          setProjectsError(
            error.response?.data?.message ||
              "Unable to load your projects."
          );
        }
      } finally {
        if (isMounted) setProjectsLoading(false);
      }
    };

    fetchMyProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchTodayAttendance = async () => {
      try {
        setAttendanceLoading(true);

        const today = getPakistanDate();

        const response = await api.get("/attendance/me", {
          params: {
            startDate: today,
            endDate: today,
          },
        });

        const records = Array.isArray(response.data)
          ? response.data
          : [];

        if (isMounted) {
          setTodayAttendance(
            records.find((record) => record.dateKey === today) || null
          );
        }
      } catch (error) {
        console.error("Unable to load today's attendance:", error);
        if (isMounted) setTodayAttendance(null);
      } finally {
        if (isMounted) setAttendanceLoading(false);
      }
    };

    fetchTodayAttendance();

    return () => {
      isMounted = false;
    };
  }, []);

  const recentRequests = [...requests]
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.startDate) -
        new Date(a.createdAt || a.startDate)
    )
    .slice(0, 4);

  const upcomingLeaves = requests
    .filter(
      (request) =>
        request.status === "Approved" &&
        new Date(request.endDate) >= new Date()
    )
    .sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate)
    )
    .slice(0, 3);

  return (
    <div className="space-y-7">
      {/* Welcome Section */}
      <div className="rounded-2xl border border-[#D5E5F5] bg-gradient-to-r from-[#EAF2FC] to-[#DCEBFA] p-7 text-[#1E3A5F] shadow-sm">
        <p className="text-sm font-medium text-[#52749B]">
          Employee Portal / Dashboard
        </p>

        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
          Welcome back, {user?.name || "Employee"}!
        </h1>

        <p className="mt-2 text-sm text-[#52749B]">
          {user?.department || "Your Department"} · Here is your leave
          overview for {summary?.year || new Date().getFullYear()}.
        </p>

        <AttendanceTimeChips
          attendance={todayAttendance}
          loading={attendanceLoading}
          onNavigate={onNavigate}
          leaveRequest={approvedLeaveToday}
        />

        <button
          type="button"
          onClick={() => onNavigate?.("New Request")}
          className="mt-5 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8]"
        >
          + Apply for Leave
        </button>
      </div>

      {/* Leave Overview */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-gray-800">
          Leave Overview
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Pending Requests"
            value={counts.pending ?? 0}
            subtitle="Waiting for approval"
            icon="◷"
            color="bg-amber-50 text-amber-600"
          />

          <StatCard
            title="Approved Requests"
            value={counts.approved ?? 0}
            subtitle="Successfully approved"
            icon="✓"
            color="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            title="Total Requests"
            value={counts.total ?? 0}
            subtitle="All your requests"
            icon="▤"
            color="bg-blue-50 text-blue-600"
          />

          <StatCard
            title="Rejected Requests"
            value={counts.rejected ?? 0}
            subtitle="Requests not approved"
            icon="×"
            color="bg-red-50 text-red-600"
          />
        </div>
      </div>

      {/* My Active Projects */}
      <section className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-800">My Active Projects</h2>
            <p className="mt-1 text-sm text-gray-500">
              Projects assigned to you that are currently active.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.("My Projects")}
            className="text-sm font-semibold text-[#2563EB] hover:underline"
          >
            View All
          </button>
        </div>

        {projectsLoading ? (
          <p className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">
            Loading your projects...
          </p>
        ) : projectsError ? (
          <p className="rounded-xl bg-red-50 p-5 text-sm text-red-600">
            {projectsError}
          </p>
        ) : activeProjects.length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
            You don't have any active projects right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeProjects.map((project) => (
              <ActiveProjectCard key={project._id} project={project} />
            ))}
          </div>
        )}
      </section>

      {/* Leave Balances */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-gray-800">
          My Leave Balance
        </h2>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BalanceCard
            title="Annual Leave"
            balance={annual}
            color="bg-emerald-50 text-emerald-700"
          />

          <BalanceCard
            title="Sick Leave"
            balance={sick}
            color="bg-blue-50 text-blue-700"
          />
        </div>
      </div>

      {/* Recent Requests */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-800">My Recent Requests</h2>
            <p className="mt-1 text-sm text-gray-500">
              Track the status of your latest leave applications.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.("Leave Requests")}
            className="text-sm font-semibold text-[#2563EB] hover:underline"
          >
            View All
          </button>
        </div>

        {recentRequests.length === 0 ? (
          <div className="rounded-xl bg-gray-50 py-10 text-center">
            <p className="text-gray-500">No leave requests yet.</p>
            <button
              type="button"
              onClick={() => onNavigate?.("New Request")}
              className="mt-3 text-sm font-semibold text-[#2563EB] hover:underline"
            >
              Submit your first request
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((request) => (
              <div
                key={request._id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {request.type}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {formatUTCDate(request.startDate)} –{" "}
                    {formatUTCDate(request.endDate)}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    {request.days} day(s)
                  </p>
                </div>

                <StatusBadge status={request.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Approved Leave */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-bold text-gray-800">
          Upcoming Approved Leave
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Your upcoming approved leave applications.
        </p>

        {upcomingLeaves.length === 0 ? (
          <p className="mt-5 rounded-xl bg-gray-50 py-8 text-center text-sm text-gray-500">
            No upcoming approved leaves.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {upcomingLeaves.map((request) => (
              <div
                key={request._id}
                className="flex items-center justify-between gap-3 rounded-xl bg-blue-50/70 p-4"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {request.type}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {formatUTCDate(request.startDate)} –{" "}
                    {formatUTCDate(request.endDate)}
                  </p>
                </div>

                <span className="whitespace-nowrap text-sm font-semibold text-[#2563EB]">
                  {request.days} day(s)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
