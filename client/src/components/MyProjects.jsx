
import { useEffect, useMemo, useState } from "react";
import api from "../api";

// ------------------------------------------
// DATE FORMATTER
// ------------------------------------------

const formatProjectDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ------------------------------------------
// PROJECT STATUS HELPERS
// ------------------------------------------

// The backend provides isOverdue for Active projects whose deadline passed.
// Keep the stored project status unchanged; calculate its display category.
const isProjectOverdue = (project) =>
  project?.status === "Active" && project?.isOverdue === true;

const isProjectActive = (project) =>
  project?.status === "Active" && !isProjectOverdue(project);

// ------------------------------------------
// STATUS BADGE
// ------------------------------------------

const StatusBadge = ({ status, isOverdue }) => {
  if (status === "Active" && isOverdue) {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        Overdue
      </span>
    );
  }

  const styles = {
    Planning: "bg-blue-50 text-blue-700",
    Active: "bg-emerald-50 text-emerald-700",
    "On Hold": "bg-amber-50 text-amber-700",
    Completed: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
};

// ------------------------------------------
// STAT CARD
// ------------------------------------------

const StatCard = ({ title, value, color }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <h2 className={`mt-2 text-3xl font-bold ${color}`}>
      {value}
    </h2>
  </div>
);

// ------------------------------------------
// PROJECT CARD
// ------------------------------------------

function ProjectCard({ project, userId }) {
  const [expanded, setExpanded] = useState(false);

  const projectMembers = project.teamMembers || [];

  const myMembership = projectMembers.find((member) => {
    const employeeId =
      member.employee?._id || member.employee;

    return String(employeeId) === String(userId);
  });

  const myProjectRole = myMembership?.projectRole;

  const projectLead = project.projectLead;

  const projectLeadName =
    typeof projectLead === "object"
      ? projectLead?.name
      : "Not available";

  const organizationalTeams =
    project.organizationalTeams || [];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Project Header */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {project.name}
            </h3>

            {project.description && (
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {project.description}
              </p>
            )}
          </div>

          <div className="shrink-0">
            <StatusBadge
              status={project.status}
              isOverdue={isProjectOverdue(project)}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-blue-50/70 p-3">
            <p className="text-xs font-medium text-gray-500">
              Start Date
            </p>

            <p className="mt-1 font-semibold text-gray-800">
              {formatProjectDate(project.startDate)}
            </p>
          </div>

          <div className="rounded-xl bg-blue-50/70 p-3">
            <p className="text-xs font-medium text-gray-500">
              Deadline
            </p>

            <p className="mt-1 font-semibold text-gray-800">
              {formatProjectDate(project.deadline)}
            </p>
          </div>
        </div>

        {/* Project Information */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-400">
              Project Lead
            </p>

            <p className="mt-1 text-sm font-semibold text-gray-700">
              {projectLeadName || "Not assigned"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">
              Your Project Role
            </p>

            <p className="mt-1 text-sm font-semibold text-gray-700">
              {myProjectRole || "Team Member"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">
              Team Members
            </p>

            <p className="mt-1 text-sm font-semibold text-gray-700">
              {projectMembers.length} Members
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">
              Organizational Teams
            </p>

            <p className="mt-1 text-sm font-semibold text-gray-700">
              {organizationalTeams.length} Teams
            </p>
          </div>
        </div>

        {/* Expand Button */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-5 flex w-full items-center justify-between border-t border-gray-100 pt-4 text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          <span>
            {expanded ? "Hide Project Details" : "View Project Details"}
          </span>

          <span>{expanded ? "−" : "+"}</span>
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 space-y-5">
            <div>
              <h4 className="mb-3 text-sm font-bold text-gray-800">
                Project Team Members
              </h4>

              {projectMembers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No team members available.
                </p>
              ) : (
                <div className="space-y-2">
                  {projectMembers.map((member, index) => {
                    const employee = member.employee;

                    const employeeName =
                      typeof employee === "object"
                        ? employee?.name
                        : "Employee";

                    const isMe =
                      String(employee?._id || employee) ===
                      String(userId);

                    return (
                      <div
                        key={`${employee?._id || employee}-${index}`}
                        className="flex flex-col justify-between gap-1 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-700">
                            {employeeName || "Employee"}
                            {isMe && (
                              <span className="ml-2 text-xs font-medium text-blue-600">
                                (You)
                              </span>
                            )}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {member.projectRole || "Team Member"}
                          </p>
                        </div>

                        <span className="text-xs text-gray-500">
                          {typeof member.organizationalTeam === "object"
                            ? member.organizationalTeam?.name
                            : "Team"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-bold text-gray-800">
                Organizational Teams
              </h4>

              <div className="flex flex-wrap gap-2">
                {organizationalTeams.map((team, index) => (
                  <span
                    key={team?._id || index}
                    className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700"
                  >
                    {typeof team === "object"
                      ? team?.name
                      : "Team"}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------
// MY PROJECTS PAGE
// ------------------------------------------

export default function MyProjects({ user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  // ------------------------------------------
  // FETCH EMPLOYEE PROJECTS
  // ------------------------------------------

  useEffect(() => {
    let isMounted = true;

    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/projects");

        const projectData = Array.isArray(response.data)
          ? response.data
          : response.data?.projects || [];

        if (isMounted) {
          setProjects(projectData);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "Unable to load your projects."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  // ------------------------------------------
  // PROJECT STATISTICS
  // ------------------------------------------

  const stats = useMemo(() => ({
    total: projects.length,

    planning: projects.filter(
      (project) => project.status === "Planning"
    ).length,

    // Exclude overdue projects from Active count.
    active: projects.filter(isProjectActive).length,

    onHold: projects.filter(
      (project) => project.status === "On Hold"
    ).length,

    completed: projects.filter(
      (project) => project.status === "Completed"
    ).length,

    overdue: projects.filter(isProjectOverdue).length,
  }), [projects]);

  // ------------------------------------------
  // FILTER AND SEARCH
  // ------------------------------------------

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      let matchesFilter = false;

      if (activeFilter === "All") {
        matchesFilter = true;
      } else if (activeFilter === "Overdue") {
        matchesFilter = isProjectOverdue(project);
      } else if (activeFilter === "Active") {
        matchesFilter = isProjectActive(project);
      } else {
        matchesFilter = project.status === activeFilter;
      }

      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        project.name?.toLowerCase().includes(searchText) ||
        project.description?.toLowerCase().includes(searchText);

      return matchesFilter && matchesSearch;
    });
  }, [projects, activeFilter, search]);

  const filters = [
    "All",
    "Planning",
    "Active",
    "On Hold",
    "Completed",
    "Overdue",
  ];

  // ------------------------------------------
  // LOADING
  // ------------------------------------------

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-gray-500">
          Loading your projects...
        </p>
      </div>
    );
  }

  // ------------------------------------------
  // ERROR
  // ------------------------------------------

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
        <p className="font-semibold text-red-700">
          Unable to load projects
        </p>

        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      </div>
    );
  }

  // ------------------------------------------
  // MAIN UI
  // ------------------------------------------

  return (
    <div className="space-y-7">
      {/* Page Heading */}
      <div>
        <p className="text-sm font-medium text-blue-600">
          Employee Portal / Projects
        </p>

        <h1 className="mt-2 text-2xl font-bold text-gray-800 sm:text-3xl">
          My Projects
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          View and track all projects assigned to you.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Projects"
          value={stats.total}
          color="text-gray-800"
        />

        <StatCard
          title="Active Projects"
          value={stats.active}
          color="text-emerald-600"
        />

        <StatCard
          title="Planning Projects"
          value={stats.planning}
          color="text-blue-600"
        />

        <StatCard
          title="Overdue Projects"
          value={stats.overdue}
          color="text-red-600"
        />
      </div>

      {/* Search and Filters */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-gray-800">
              Project List
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredProjects.length} project(s) found
            </p>
          </div>

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:max-w-xs"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {filters.map((filter) => {
            const count = {
              All: stats.total,
              Planning: stats.planning,
              Active: stats.active,
              "On Hold": stats.onHold,
              Completed: stats.completed,
              Overdue: stats.overdue,
            }[filter];

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeFilter === filter
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {filter} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Project Cards */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-14 text-center shadow-sm">
          <h3 className="font-semibold text-gray-700">
            No projects found
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            {projects.length === 0
              ? "You haven't been assigned to any projects yet."
              : "Try changing your search or selected filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              userId={user?._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
