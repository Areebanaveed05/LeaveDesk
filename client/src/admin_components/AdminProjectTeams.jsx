
import { useEffect, useMemo, useState } from "react";
import api from "../api";

const FILTERS = ["All", "Planning", "Active", "Overdue", "Completed", "On Hold"];

const STATUS_STYLES = {
  Planning: "bg-blue-50 text-blue-700 border-blue-200",
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Overdue: "bg-red-50 text-red-700 border-red-200",
  Completed: "bg-violet-50 text-violet-700 border-violet-200",
  "On Hold": "bg-amber-50 text-amber-700 border-amber-200",
};

const isProjectOverdue = (project) =>
  project.status === "Active" && project.isOverdue === true;

// Active projects exclude overdue projects.
const isProjectActive = (project) =>
  project.status === "Active" && !isProjectOverdue(project);

const getProjectStatusLabel = (project) =>
  isProjectOverdue(project) ? "Overdue" : project.status;

const getProjectStatusStyle = (project) =>
  STATUS_STYLES[isProjectOverdue(project) ? "Overdue" : project.status] ||
  "border-slate-200 bg-slate-50 text-slate-600";

const TEAM_COLORS = [
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-pink-50 text-pink-700 border-pink-200",
];

const FILTER_COLORS = {
  All: "bg-slate-100 text-slate-700",
  Planning: "bg-blue-100 text-blue-700",
  Active: "bg-emerald-100 text-emerald-700",
  Completed: "bg-violet-100 text-violet-700",
  "On Hold": "bg-amber-100 text-amber-700",
  Overdue: "bg-red-100 text-red-700",
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;

  return value._id || value.id || "";
};

const getEmployeeDetails = (member) => {
  const employee = member.employee;

  if (!employee || typeof employee === "string") {
    return {
      name: "Employee details unavailable",
      designation: "Designation not added",
      email: "",
    };
  }

  return {
    name: employee.name || "Unnamed employee",
    designation: employee.designation || "Designation not added",
    email: employee.email || "",
  };
};

function ProjectCard({ project }) {
  const members = project.teamMembers || [];
  const teams = project.organizationalTeams || [];

  return (
    <article className="overflow-hidden rounded-2xl border border-[#DCE6EF] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">

      {/* Colored top border */}
      <div
        className={`h-1.5 ${
          isProjectOverdue(project)
            ? "bg-red-400"
            : project.status === "Active"
            ? "bg-emerald-400"
            : project.status === "Planning"
            ? "bg-blue-400"
            : project.status === "Completed"
            ? "bg-violet-400"
            : "bg-amber-400"
        }`}
      />

      <div className="space-y-4 p-5">

        {/* Project Name and Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-bold text-slate-800">
              {project.name}
            </h2>

            {project.description && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {project.description}
              </p>
            )}
          </div>

          <span
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${getProjectStatusStyle(
              project
            )}`}
          >
            {getProjectStatusLabel(project)}
          </span>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-xs font-medium text-blue-600">
              Start Date
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatDate(project.startDate)}
            </p>
          </div>

          <div className="rounded-xl bg-violet-50 p-3">
            <p className="text-xs font-medium text-violet-600">
              Deadline
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatDate(project.deadline)}
            </p>
          </div>
        </div>

        {/* Organizational Teams */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">
              Teams
            </h3>

            <span className="text-xs font-semibold text-slate-500">
              {teams.length} teams
            </span>
          </div>

          {teams.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {teams.map((team, index) => (
                <span
                  key={getId(team) || index}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    TEAM_COLORS[index % TEAM_COLORS.length]
                  }`}
                >
                  {typeof team === "object"
                    ? team.name || "Unnamed team"
                    : "Team details unavailable"}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              No teams assigned.
            </p>
          )}
        </section>

        {/* Project Members */}
        <section className="border-t border-[#E8EEF4] pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">
              Project Members
            </h3>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {members.length} members
            </span>
          </div>

          {members.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
              No members assigned to this project.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {members.map((member, index) => {
                const employee = getEmployeeDetails(member);

                const teamName =
                  typeof member.organizationalTeam === "object"
                    ? member.organizationalTeam?.name
                    : "";

                const initials = employee.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={`${getId(member.employee) || index}-${index}`}
                    className="flex min-w-0 items-start gap-2.5 rounded-xl border border-[#E8EEF4] bg-slate-50/70 p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F0FA] text-xs font-bold text-[#52749B]">
                      {initials || "E"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-slate-800">
                        {employee.name}
                      </p>

                      <p className="mt-0.5 text-xs text-violet-700">
                        {employee.designation}
                      </p>

                      {member.projectRole && (
                        <p className="mt-1 text-xs text-emerald-700">
                          Role: {member.projectRole}
                        </p>
                      )}

                      {teamName && (
                        <p className="mt-1 text-xs text-slate-400">
                          {teamName}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </article>
  );
}

export default function AdminProjectTeams() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/projects");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.projects || [];

      setProjects(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load project teams. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Correct project counts
  const counts = useMemo(() => {
    return {
      All: projects.length,
      Planning: projects.filter((p) => p.status === "Planning").length,
      Active: projects.filter(isProjectActive).length,
      Overdue: projects.filter(isProjectOverdue).length,
      Completed: projects.filter((p) => p.status === "Completed").length,
      "On Hold": projects.filter((p) => p.status === "On Hold").length,
    };
  }, [projects]);

  // Filter projects by status and search
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesStatus =
        selectedFilter === "All" ||
        (selectedFilter === "Overdue"
          ? isProjectOverdue(project)
          : selectedFilter === "Active"
          ? isProjectActive(project)
          : project.status === selectedFilter);

      if (!matchesStatus) return false;
      if (!query) return true;

      const projectName = project.name?.toLowerCase() || "";

      const teamNames = (project.organizationalTeams || [])
        .map((team) =>
          typeof team === "object" ? team.name || "" : ""
        )
        .join(" ")
        .toLowerCase();

      const memberNames = (project.teamMembers || [])
        .map((member) => {
          const employee = member.employee;

          return typeof employee === "object"
            ? `${employee.name || ""} ${employee.designation || ""} ${
                member.projectRole || ""
              }`
            : "";
        })
        .join(" ")
        .toLowerCase();

      return (
        projectName.includes(query) ||
        teamNames.includes(query) ||
        memberNames.includes(query)
      );
    });
  }, [projects, selectedFilter, search]);

  // Summary cards use the currently filtered projects.
  const totalProjects = filteredProjects.length;

  const totalTeams = filteredProjects.reduce(
    (total, project) =>
      total + (project.organizationalTeams?.length || 0),
    0
  );

  const totalMembers = filteredProjects.reduce(
    (total, project) =>
      total + (project.teamMembers?.length || 0),
    0
  );

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#789BC5]">
            Administration / Project Teams
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
            Project Teams
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View projects, collaborating teams and assigned members.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchProjects}
          disabled={loading}
          className="w-fit rounded-xl border border-[#DCE6EF] bg-white px-5 py-3 text-sm font-semibold text-[#52749B] shadow-sm transition hover:bg-[#F0F5FA] disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-700">
            Projects
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-800">
            {loading ? "—" : totalProjects}
          </p>
        </div>

        <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
          <p className="text-sm font-medium text-violet-700">
            Teams
          </p>
          <p className="mt-1 text-2xl font-bold text-violet-800">
            {loading ? "—" : totalTeams}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">
            Project Members
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">
            {loading ? "—" : totalMembers}
          </p>
        </div>
      </div>

      {/* Filter Tabs and Search */}
      <div className="space-y-4 rounded-2xl border border-[#DCE6EF] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const isSelected = selectedFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  isSelected
                    ? `${FILTER_COLORS[filter]} border-current shadow-sm`
                    : "border-[#E8EEF4] bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {filter}
                <span className="ml-2 opacity-70">
                  {loading ? "—" : counts[filter]}
                </span>
              </button>
            );
          })}
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search project, team or member..."
          className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none transition focus:border-[#789BC5] focus:ring-2 focus:ring-[#E8F0FA]"
        />
      </div>

      {/* Project Cards */}
      {loading ? (
        <div className="rounded-2xl border border-[#DCE6EF] bg-white p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#DCE6EF] border-t-[#52749B]" />
          <p className="mt-4 text-sm text-slate-500">
            Loading projects...
          </p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-[#DCE6EF] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F0FA] text-2xl text-[#52749B]">
            ▣
          </div>

          <h3 className="mt-4 font-bold text-slate-800">
            No projects found
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            {search
              ? "Try another search term."
              : `There are no ${
                  selectedFilter === "All"
                    ? ""
                    : selectedFilter.toLowerCase() + " "
                }projects.`}
          </p>

          {(search || selectedFilter !== "All") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedFilter("All");
              }}
              className="mt-4 rounded-lg bg-[#E8F0FA] px-4 py-2 text-sm font-semibold text-[#52749B] hover:bg-blue-100"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">
              {selectedFilter === "All"
                ? "All Projects"
                : `${selectedFilter} Projects`}
            </h2>

            <span className="text-xs font-medium text-slate-500">
              {filteredProjects.length} project(s)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
