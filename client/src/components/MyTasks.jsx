import { useEffect, useMemo, useState } from "react";
import api from "../api";

const FILTERS = ["All", "To Do", "In Progress", "Completed", "Overdue"];

const PRIORITY_STYLES = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Urgent: "bg-red-100 text-red-700",
};

const STATUS_STYLES = {
  "To Do": "bg-slate-100 text-slate-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const getPakistanDate = (date) => {
  if (!date) return "";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsedDate);
};

const formatDate = (date) => {
  if (!date) return "Not available";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

const isTaskOverdue = (task) => {
  if (!task.deadline || task.status === "Completed") return false;

  const today = getPakistanDate(new Date());
  const deadline = getPakistanDate(task.deadline);

  return Boolean(deadline && today && deadline < today);
};

const areDependenciesComplete = (task) =>
  !task.dependsOn?.length ||
  task.dependsOn.every(
    (dependency) =>
      typeof dependency === "object" &&
      dependency.status === "Completed"
  );

const isBeforeScheduledStart = (task) =>
  Boolean(
    task.startDate &&
      getPakistanDate(new Date()) < getPakistanDate(task.startDate)
  );

// ------------------------------------------
// STAT CARD
// ------------------------------------------

function StatCard({ title, value, subtitle, color }) {
  return (
    <div className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>

        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${color}`}
        >
          {value}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

// ------------------------------------------
// TASK CARD
// ------------------------------------------

function TaskCard({ task, onStatusChange, busy }) {
  const overdue = isTaskOverdue(task);
  const dependenciesComplete = areDependenciesComplete(task);
  const beforeStart = isBeforeScheduledStart(task);

  const locked = !dependenciesComplete || beforeStart;

  const projectName =
    typeof task.project === "object" ? task.project?.name : "Project";

  const phaseName =
    typeof task.phase === "object" ? task.phase?.name : "";

  const assignedBy =
    typeof task.assignedBy === "object"
      ? task.assignedBy?.name
      : "Project Lead";

  const lockMessage = !dependenciesComplete
    ? "Complete all prerequisite tasks before starting this task."
    : beforeStart
      ? `This task is scheduled to start on ${formatDate(task.startDate)}.`
      : "";

  return (
    <div className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Task heading */}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-slate-800">
            {task.title}
          </h3>

          <p className="mt-1 text-sm text-[#52749B]">
            {projectName || "Project"}
          </p>

          {phaseName && (
            <p className="mt-1 text-xs font-semibold text-blue-700">
              Phase: {phaseName}
            </p>
          )}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium
          }`}
        >
          {task.priority || "Medium"} Priority
        </span>
      </div>

      {/* Description */}

      {task.description && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {task.description}
        </p>
      )}

      {/* Task information */}

      <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-slate-400">
            Start Date
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            {formatDate(task.startDate)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-400">
            Deadline
          </p>

          <p
            className={`mt-1 text-sm font-semibold ${
              overdue ? "text-red-600" : "text-slate-700"
            }`}
          >
            {formatDate(task.deadline)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-400">
            Assigned By
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            {assignedBy || "Project Lead"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-400">
            Dependencies
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            {task.dependsOn?.length
              ? `${task.dependsOn.length} prerequisite task(s)`
              : "No dependencies"}
          </p>
        </div>
      </div>

      {/* Prerequisite tasks */}

      {task.dependsOn?.length > 0 && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-600">
            Prerequisite Tasks
          </p>

          <div className="mt-2 space-y-2">
            {task.dependsOn.map((dependency, index) => (
              <div
                key={getId(dependency) || index}
                className="flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <span className="font-medium text-slate-700">
                  {dependency.title || "Prerequisite task"}
                </span>

                <span
                  className={`rounded-full px-2 py-1 font-semibold ${
                    dependency.status === "Completed"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {dependency.status || "Status unavailable"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status and completion action */}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              overdue
                ? "bg-red-100 text-red-700"
                : STATUS_STYLES[task.status] ||
                  STATUS_STYLES["To Do"]
            }`}
          >
            {overdue ? "Overdue" : task.status}
          </span>

          {overdue && (
            <span className="text-xs font-medium text-red-600">
              Deadline passed
            </span>
          )}

          {locked && task.status !== "Completed" && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <span aria-hidden="true">🔒 </span>
              Locked
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {task.status === "Completed" ? (
            <span className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              Task completed
            </span>
          ) : task.status === "In Progress" && !locked ? (
            <button
              type="button"
              onClick={() => onStatusChange(task._id, "Completed")}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Updating..." : "Mark as Completed"}
            </button>
          ) : (
            <span className="rounded-lg border border-[#DCE6EF] bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500">
              In Progress
            </span>
          )}
        </div>
      </div>

      {/* Lock explanation */}

      {locked && task.status !== "Completed" && (
        <p className="mt-3 text-right text-xs text-amber-700">
          {lockMessage}
        </p>
      )}

      {busy && (
        <p className="mt-3 text-right text-xs text-blue-600">
          Updating task...
        </p>
      )}
    </div>
  );
}

// ------------------------------------------
// MY TASKS SCREEN
// ------------------------------------------

export default function MyTasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [selectedFilter, setSelectedFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const currentUserId = getId(user?._id || user?.id);

  // ------------------------------------------
  // FETCH TASKS
  // ------------------------------------------

  useEffect(() => {
    let isMounted = true;

    const fetchTasks = async (silent = false) => {
      try {
        if (!silent) setLoading(true);

        setError("");

        const { data } = await api.get("/tasks");

        if (!isMounted) return;

        const allTasks = Array.isArray(data) ? data : [];

        const myTasks = allTasks.filter(
          (task) => getId(task.assignedTo) === currentUserId
        );

        setTasks(myTasks);
      } catch (err) {
        if (!isMounted) return;

        setError(
          err.response?.data?.message ||
            "Unable to load your tasks. Please try again."
        );
      } finally {
        if (isMounted && !silent) setLoading(false);
      }
    };

    let refreshInterval;

    if (currentUserId) {
      fetchTasks();

      // Refresh every 60 seconds to display automatic backend status changes.
      refreshInterval = setInterval(() => fetchTasks(true), 60 * 1000);
    } else {
      setTasks([]);
      setLoading(false);
    }

    return () => {
      isMounted = false;

      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [currentUserId, refreshKey]);

  // ------------------------------------------
  // MARK TASK COMPLETED
  // ------------------------------------------

  const handleStatusChange = async (taskId, status) => {
    const previousTasks = tasks;

    setBusyId(taskId);
    setActionError("");

    try {
      const { data } = await api.patch(
        `/tasks/${taskId}/status`,
        { status }
      );

      if (!data?.task) {
        throw new Error("Updated task was not returned.");
      }

      setTasks((previous) =>
        previous.map((task) =>
          task._id === taskId ? data.task : task
        )
      );
    } catch (err) {
      setTasks(previousTasks);

      setActionError(
        err.response?.data?.message ||
          err.message ||
          "Unable to update task status."
      );
    } finally {
      setBusyId(null);
    }
  };

  // ------------------------------------------
  // TASK STATISTICS
  // ------------------------------------------

  const counts = useMemo(
    () => ({
      total: tasks.length,
      todo: tasks.filter((task) => task.status === "To Do").length,
      inProgress: tasks.filter(
        (task) => task.status === "In Progress"
      ).length,
      completed: tasks.filter(
        (task) => task.status === "Completed"
      ).length,
      overdue: tasks.filter(isTaskOverdue).length,
    }),
    [tasks]
  );

  // ------------------------------------------
  // SEARCH AND FILTER
  // ------------------------------------------

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesFilter =
          selectedFilter === "All" ||
          (selectedFilter === "Overdue"
            ? isTaskOverdue(task)
            : task.status === selectedFilter);

        const projectName =
          typeof task.project === "object"
            ? task.project?.name || ""
            : "";

        const phaseName =
          typeof task.phase === "object"
            ? task.phase?.name || ""
            : "";

        const searchText = [
          task.title,
          task.description,
          projectName,
          phaseName,
          task.priority,
        ]
          .join(" ")
          .toLowerCase();

        return (
          matchesFilter &&
          searchText.includes(search.trim().toLowerCase())
        );
      }),
    [tasks, selectedFilter, search]
  );

  // ------------------------------------------
  // UI
  // ------------------------------------------

  return (
    <div className="space-y-7">
      {/* Page heading */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#52749B]">
            Employee Portal / My Tasks
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-800 sm:text-3xl">
            My Tasks
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View your assigned tasks, check prerequisites and update
            their progress.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          className="rounded-xl border border-[#DCE6EF] bg-white px-4 py-2.5 text-sm font-semibold text-[#52749B] shadow-sm transition hover:bg-[#F0F5FA] disabled:opacity-50"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Error messages */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Statistics */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Tasks"
          value={counts.total}
          subtitle="All assigned tasks"
          color="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="To Do"
          value={counts.todo}
          subtitle="Not started yet"
          color="bg-slate-100 text-slate-600"
        />

        <StatCard
          title="In Progress"
          value={counts.inProgress}
          subtitle="Currently working"
          color="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Completed"
          value={counts.completed}
          subtitle="Successfully finished"
          color="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Overdue"
          value={counts.overdue}
          subtitle="Deadline has passed"
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Search and filters */}

      <section className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-slate-800">
              Your Task List
            </h2>

            <span className="text-sm text-slate-500">
              {filteredTasks.length} task(s)
            </span>
          </div>

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by task, project or phase name..."
            className="w-full rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const isActive = selectedFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedFilter(filter)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-[#DCE6EF] bg-white text-slate-600 hover:bg-[#F0F5FA]"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Task list */}

      <section>
        {loading ? (
          <div className="rounded-2xl border border-[#DCE6EF] bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Loading your tasks...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#DCE6EF] bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Please refresh to try again.
            </p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#C9D9EE] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
              ✓
            </div>

            <h3 className="mt-4 font-bold text-slate-800">
              No Tasks Found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {tasks.length === 0
                ? "You don't have any tasks assigned to you yet."
                : "No tasks match your selected filter or search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onStatusChange={handleStatusChange}
                busy={busyId === task._id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}