import { useEffect, useState } from "react";
import api from "../api";

const INITIAL_FORM = {
  name: "",
  description: "",
  status: "Planning",
  startDate: "",
  deadline: "",
  organizationalTeams: [],
  teamMembers: [],
  projectLead: "",
};

const PROJECT_STATUSES = ["Planning", "Active", "Completed", "On Hold"];

const STATUS_STYLES = {
  Planning: "bg-blue-50 text-blue-700",
  Active: "bg-emerald-50 text-emerald-700",
  Completed: "bg-green-50 text-green-700",
  "On Hold": "bg-amber-50 text-amber-700",
  Overdue: "bg-red-50 text-red-700",
};

const isProjectOverdue = (project) =>
  project.status === "Active" && project.isOverdue === true;

const isProjectActive = (project) =>
  project.status === "Active" && !isProjectOverdue(project);

const getProjectStatusLabel = (project) =>
  isProjectOverdue(project) ? "Overdue" : project.status;

const getProjectStatusStyle = (project) =>
  STATUS_STYLES[isProjectOverdue(project) ? "Overdue" : project.status] ||
  "bg-slate-100 text-slate-600";

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDateInputValue = (date) => {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toISOString().slice(0, 10);
};

const getId = (value) => {
  if (!value) return "";

  if (typeof value === "string") return value;

  return value._id || value.id || "";
};

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [form, setForm] = useState(INITIAL_FORM);

  const [organizationTeams, setOrganizationTeams] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [teamsLoading, setTeamsLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // ------------------------------------------
  // FETCH PROJECTS
  // ------------------------------------------

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
          "Unable to load projects. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // ------------------------------------------
  // FETCH ORGANIZATIONAL TEAMS
  // ------------------------------------------

  const fetchOrganizationTeams = async () => {
    try {
      setTeamsLoading(true);

      const response = await api.get("/organization?type=Team");

      const units = Array.isArray(response.data) ? response.data : [];

      setOrganizationTeams(units.filter((unit) => unit.isActive));
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load organizational teams.",
      );
    } finally {
      setTeamsLoading(false);
    }
  };

  // ------------------------------------------
  // FETCH EMPLOYEES
  // ------------------------------------------

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);

      const response = await api.get("/users");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.employees || [];

      setEmployees(
        data.filter(
          (employee) => employee.isActive && employee.role === "employee",
        ),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load employees.");
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchProjectTeamData = async () => {
    await Promise.all([
      fetchOrganizationTeams(),
      fetchEmployees(),
      fetchProjects(),
    ]);
  };

  // ------------------------------------------
  // OPEN CREATE PROJECT MODAL
  // ------------------------------------------

  const openCreateModal = () => {
    setEditingProject(null);
    setForm({ ...INITIAL_FORM });

    setError("");
    setSuccess("");

    setModalOpen(true);

    fetchProjectTeamData();
  };

  // ------------------------------------------
  // OPEN EDIT PROJECT MODAL
  // ------------------------------------------

  const openEditModal = (project) => {
    setEditingProject(project);

    setForm({
      name: project.name || "",
      description: project.description || "",
      status: project.status || "Planning",

      startDate: getDateInputValue(project.startDate),
      deadline: getDateInputValue(project.deadline),

      organizationalTeams: (project.organizationalTeams || []).map(getId),

      teamMembers: (project.teamMembers || []).map((member) => ({
        employee: getId(member.employee),
        organizationalTeam: getId(member.organizationalTeam),
        projectRole: member.projectRole || "",
      })),

      projectLead: getId(project.projectLead),
    });

    setError("");
    setSuccess("");

    setModalOpen(true);

    fetchProjectTeamData();
  };

  // ------------------------------------------
  // FORM INPUT HANDLING
  // ------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ------------------------------------------
  // ORGANIZATIONAL TEAM HELPERS
  // ------------------------------------------

  const getTeamId = (team) => getId(team);

  const getEmployeeId = (employee) => getId(employee);

  const isEmployeeInTeam = (employee, teamId) => {
    return (employee.organizationTeams || []).some((team) => {
      return String(getId(team)) === String(teamId);
    });
  };

  // ------------------------------------------
  // SELECT / REMOVE ORGANIZATIONAL TEAM
  // ------------------------------------------

  const toggleOrganizationalTeam = (teamId) => {
    setForm((previous) => {
      const alreadySelected = previous.organizationalTeams.includes(teamId);

      const nextTeams = alreadySelected
        ? previous.organizationalTeams.filter((id) => id !== teamId)
        : [...previous.organizationalTeams, teamId];

      // If a team is removed, remove its members too.
      const nextMembers = alreadySelected
        ? previous.teamMembers.filter(
            (member) => String(member.organizationalTeam) !== String(teamId),
          )
        : previous.teamMembers;

      const leadStillSelected = nextMembers.some(
        (member) => String(member.employee) === String(previous.projectLead),
      );

      return {
        ...previous,
        organizationalTeams: nextTeams,
        teamMembers: nextMembers,
        projectLead: leadStillSelected ? previous.projectLead : "",
      };
    });
  };

  // ------------------------------------------
  // SELECT / REMOVE PROJECT EMPLOYEE
  // ------------------------------------------

  const toggleProjectMember = (employeeId, teamId, checked) => {
    setForm((previous) => {
      const withoutEmployee = previous.teamMembers.filter(
        (member) => String(member.employee) !== String(employeeId),
      );

      const nextMembers = checked
        ? [
            ...withoutEmployee,
            {
              employee: employeeId,
              organizationalTeam: teamId,
              projectRole: "",
            },
          ]
        : withoutEmployee;

      // Clear Project Lead if that employee is removed.
      const leadStillSelected = nextMembers.some(
        (member) => String(member.employee) === String(previous.projectLead),
      );

      return {
        ...previous,
        teamMembers: nextMembers,
        projectLead: leadStillSelected ? previous.projectLead : "",
      };
    });
  };

  // ------------------------------------------
  // UPDATE PROJECT ROLE
  // ------------------------------------------

  const updateProjectRole = (employeeId, projectRole) => {
    setForm((previous) => ({
      ...previous,

      teamMembers: previous.teamMembers.map((member) =>
        String(member.employee) === String(employeeId)
          ? { ...member, projectRole }
          : member,
      ),
    }));
  };

  // ------------------------------------------
  // EMPLOYEE PROJECT WORKLOAD
  // ------------------------------------------

  // Show projects where this employee is already a selected member.
  // Completed projects are excluded because they are no longer current workload.
  // When editing a project, exclude that project from its own workload count.
  const getEmployeeWorkload = (employeeId) => {
    return projects
      .filter((project) => {
        const isCurrentProject =
          editingProject && String(project._id) === String(editingProject._id);

        return (
          !isCurrentProject &&
          ["Active", "Planning", "On Hold"].includes(project.status)
        );
      })
      .flatMap((project) => {
        const member = (project.teamMembers || []).find(
          (item) => String(getId(item.employee)) === String(employeeId),
        );

        if (!member) return [];

        return [
          {
            _id: project._id,
            name: project.name,
            status: project.status,
            isOverdue: project.isOverdue,
            startDate: project.startDate,
            deadline: project.deadline,
            isProjectLead:
              String(getId(project.projectLead)) === String(employeeId),
          },
        ];
      });
  };

  // ------------------------------------------
  // SELECTED TEAMS AND THEIR EMPLOYEES
  // ------------------------------------------

  const selectedTeams = organizationTeams.filter((team) =>
    form.organizationalTeams.includes(getTeamId(team)),
  );

  const employeesForTeam = (teamId) => {
    return employees.filter((employee) => isEmployeeInTeam(employee, teamId));
  };

  // ------------------------------------------
  // SELECTED PROJECT LEAD DETAILS
  // ------------------------------------------

  const selectedProjectLead = employees.find(
    (employee) => String(getEmployeeId(employee)) === String(form.projectLead),
  );

  // ------------------------------------------
  // CREATE / UPDATE PROJECT
  // ------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Please enter a project name.");
      return;
    }

    if (!form.startDate || !form.deadline) {
      setError("Please select project dates.");
      return;
    }

    if (new Date(form.deadline) < new Date(form.startDate)) {
      setError("Deadline cannot be before the start date.");
      return;
    }

    if (form.organizationalTeams.length === 0) {
      setError("Please select at least one organizational team.");
      return;
    }

    if (form.teamMembers.length === 0) {
      setError("Please select at least one employee for this project.");
      return;
    }

    if (!form.projectLead) {
      setError("Please select a Project Lead from the project members.");
      return;
    }

    const isLeadMember = form.teamMembers.some(
      (member) => String(member.employee) === String(form.projectLead),
    );

    if (!isLeadMember) {
      setError("Project Lead must be one of the selected project members.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description,
      status: form.status,
      startDate: form.startDate,
      deadline: form.deadline,

      organizationalTeams: form.organizationalTeams,

      teamMembers: form.teamMembers.map((member) => ({
        employee: member.employee,
        organizationalTeam: member.organizationalTeam,
        projectRole: member.projectRole || "",
      })),

      projectLead: form.projectLead,
    };

    try {
      setSaving(true);

      if (editingProject) {
        await api.patch(`/projects/${editingProject._id}`, payload);

        setSuccess("Project updated successfully.");
      } else {
        await api.post("/projects", payload);

        setSuccess("Project created successfully.");
      }

      setModalOpen(false);
      setEditingProject(null);
      setForm({ ...INITIAL_FORM });

      await fetchProjects();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------
  // DELETE PROJECT
  // ------------------------------------------

  const handleDelete = async (project) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/projects/${project._id}`);

      setSuccess("Project deleted successfully.");

      await fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete this project.");
    }
  };

  // ------------------------------------------
  // CLOSE MODAL
  // ------------------------------------------

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingProject(null);
    setForm({ ...INITIAL_FORM });
    setError("");
  };

  // ------------------------------------------
  // PROJECT STATISTICS
  // ------------------------------------------

  const activeProjects = projects.filter(isProjectActive).length;

  const overdueProjects = projects.filter((project) =>
    isProjectOverdue(project),
  ).length;

  const completedProjects = projects.filter(
    (project) => project.status === "Completed",
  ).length;

  const planningProjects = projects.filter(
    (project) => project.status === "Planning",
  ).length;

  const onHoldProjects = projects.filter(
    (project) => project.status === "On Hold",
  ).length;

  const projectFilters = [
    { label: "All", count: projects.length },
    { label: "Planning", count: planningProjects },
    { label: "Active", count: activeProjects },
    { label: "On Hold", count: onHoldProjects },
    { label: "Completed", count: completedProjects },
    { label: "Overdue", count: overdueProjects },
  ];

  const filteredProjects = projects.filter((project) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Overdue") return isProjectOverdue(project);
    if (activeFilter === "Active") return isProjectActive(project);
    return project.status === activeFilter;
  });

  const totalProjectMembers = projects.reduce(
    (total, project) => total + (project.teamMembers?.length || 0),
    0,
  );

  // ------------------------------------------
  // UI
  // ------------------------------------------

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#789BC5]">
            Administration / Projects
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
            Projects Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Create, organize and manage your organization's projects and teams.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-[#52749B] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#405F82]"
        >
          + Create Project
        </button>
      </div>

      {/* NOTIFICATIONS */}

      {error && !modalOpen && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {/* PROJECT STATISTICS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "Total Projects",
            value: projects.length,
            icon: "▣",
            color: "bg-blue-50 text-blue-700",
          },
          {
            label: "Active Projects",
            value: activeProjects,
            icon: "◉",
            color: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Planning",
            value: planningProjects,
            icon: "◷",
            color: "bg-amber-50 text-amber-700",
          },
          {
            label: "Overdue Projects",
            value: overdueProjects,
            icon: "!",
            color: "bg-red-50 text-red-700",
          },
          {
            label: "Project Members",
            value: totalProjectMembers,
            icon: "♙",
            color: "bg-violet-50 text-violet-700",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>

              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${item.color}`}
              >
                {item.icon}
              </span>
            </div>

            <p className="mt-4 text-3xl font-bold text-slate-800">
              {loading ? "—" : item.value}
            </p>
          </div>
        ))}
      </div>

      {/* PROJECTS LIST */}

      <div className="overflow-hidden rounded-2xl border border-[#DCE6EF] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-[#E8EEF4] px-5 py-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">All Projects</h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage projects, collaborating teams and selected employees.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchProjects}
            disabled={loading}
            className="self-start rounded-lg border border-[#DCE6EF] px-4 py-2 text-sm font-semibold text-[#52749B] transition hover:bg-[#F0F5FA] disabled:opacity-50 sm:self-auto"
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        {/* PROJECT FILTER TABS */}
        <div className="flex flex-wrap gap-2 border-b border-[#E8EEF4] px-5 py-4">
          {projectFilters.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => setActiveFilter(filter.label)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                activeFilter === filter.label
                  ? "bg-[#52749B] text-white shadow-sm"
                  : "bg-[#F1F5F9] text-slate-600 hover:bg-[#E8F0FA] hover:text-[#52749B]"
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl text-slate-300">▣</div>

            <h3 className="mt-4 font-semibold text-slate-700">
              No projects yet
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Create your first project to get started.
            </p>

            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 rounded-xl bg-[#52749B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#405F82]"
            >
              Create Your First Project
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl text-slate-300">▣</div>
            <h3 className="mt-4 font-semibold text-slate-700">
              No {activeFilter === "All" ? "projects" : activeFilter.toLowerCase() + " projects"} found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              There are no projects in this category.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-[#F8FAFC]">
                <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Project</th>
                  <th className="px-6 py-4">Start Date</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4">Teams / Members</th>
                  <th className="px-6 py-4">Project Lead</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E8EEF4]">
                {filteredProjects.map((project) => (
                  <tr
                    key={project._id}
                    className="transition hover:bg-[#F8FAFC]"
                  >
                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-800">
                        {project.name}
                      </p>

                      <p className="mt-1 max-w-xs truncate text-sm text-slate-500">
                        {project.description || "No description provided"}
                      </p>
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      {formatDate(project.startDate)}
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      {formatDate(project.deadline)}
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      <p className="font-semibold text-slate-700">
                        {project.organizationalTeams?.length || 0} teams
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {project.teamMembers?.length || 0} selected members
                      </p>
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      {project.projectLead?.name ||
                        project.teamMembers?.find(
                          (member) =>
                            getId(member.employee) ===
                            getId(project.projectLead),
                        )?.employee?.name ||
                        "Not assigned"}
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getProjectStatusStyle(
                          project,
                        )}`}
                      >
                        {getProjectStatusLabel(project)}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(project)}
                          className="rounded-lg border border-[#DCE6EF] px-3 py-2 text-xs font-semibold text-[#52749B] hover:bg-[#E8F0FA]"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(project)}
                          className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT PROJECT MODAL */}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-[#E8EEF4] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingProject ? "Edit Project" : "Create New Project"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter project details and build your project team.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            {/* MODAL FORM */}

            <form
              onSubmit={handleSubmit}
              className="max-h-[75vh] space-y-6 overflow-y-auto p-6"
            >
              {error && (
                <div
                  role="alert"
                  className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {/* PROJECT NAME */}

              <div>
                <label
                  htmlFor="project-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Project Name *
                </label>

                <input
                  id="project-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter project name"
                  maxLength={120}
                  required
                  className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none transition focus:border-[#789BC5] focus:ring-2 focus:ring-[#E8F0FA]"
                />
              </div>

              {/* DESCRIPTION */}

              <div>
                <label
                  htmlFor="project-description"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Description
                </label>

                <textarea
                  id="project-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the project..."
                  rows={3}
                  maxLength={2000}
                  className="w-full resize-none rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none transition focus:border-[#789BC5] focus:ring-2 focus:ring-[#E8F0FA]"
                />
              </div>

              {/* PROJECT DATES */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="project-start-date"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Start Date *
                  </label>

                  <input
                    id="project-start-date"
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-[#DCE6EF] px-3 py-3 text-sm outline-none focus:border-[#789BC5]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="project-deadline"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Deadline *
                  </label>

                  <input
                    id="project-deadline"
                    type="date"
                    name="deadline"
                    value={form.deadline}
                    onChange={handleChange}
                    min={form.startDate || undefined}
                    required
                    className="w-full rounded-xl border border-[#DCE6EF] px-3 py-3 text-sm outline-none focus:border-[#789BC5]"
                  />
                </div>
              </div>

              {/* PROJECT STATUS */}

              <div>
                <label
                  htmlFor="project-status"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Project Status
                </label>

                <select
                  id="project-status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm outline-none focus:border-[#789BC5]"
                >
                  {PROJECT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* STEP 1: ORGANIZATIONAL TEAM SELECTION */}

              <section className="space-y-3 rounded-2xl border border-[#DCE6EF] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      1
                    </span>

                    <h3 className="font-bold text-slate-800">
                      Select Organizational Teams
                    </h3>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Choose the existing organizational teams that will
                    collaborate on this project. You can change these selections
                    when editing the project.
                  </p>
                </div>

                {teamsLoading ? (
                  <p className="text-sm text-slate-500">
                    Loading organizational teams...
                  </p>
                ) : organizationTeams.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                    No active organizational teams found. Create teams in
                    Organization Management first.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {organizationTeams.map((team) => {
                      const teamId = getTeamId(team);

                      const checked = form.organizationalTeams.includes(teamId);

                      return (
                        <label
                          key={teamId}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                            checked
                              ? "border-blue-300 bg-blue-50"
                              : "border-[#E8EEF4] hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOrganizationalTeam(teamId)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />

                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-800">
                              {team.name}
                            </span>

                            <span className="mt-0.5 block text-xs text-slate-500">
                              {team.parent?.name || "Organizational team"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
                  <span className="text-sm font-medium text-blue-800">
                    Selected teams
                  </span>

                  <span className="text-sm font-bold text-blue-800">
                    {form.organizationalTeams.length}
                  </span>
                </div>
              </section>

              {/* STEP 2: INDIVIDUAL PROJECT MEMBERS */}

              <section className="space-y-3 rounded-2xl border border-[#DCE6EF] p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                        2
                      </span>

                      <h3 className="font-bold text-slate-800">
                        Select Project Members
                      </h3>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      Select individual employees from the teams chosen above.
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {form.teamMembers.length} selected
                  </span>
                </div>

                {employeesLoading ? (
                  <p className="text-sm text-slate-500">Loading employees...</p>
                ) : form.organizationalTeams.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                    Select at least one organizational team to see its
                    employees.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {selectedTeams.map((team) => {
                      const teamId = getTeamId(team);

                      const teamEmployees = employeesForTeam(teamId);

                      const selectedCount = form.teamMembers.filter(
                        (member) =>
                          String(member.organizationalTeam) === String(teamId),
                      ).length;

                      return (
                        <div
                          key={teamId}
                          className="overflow-hidden rounded-xl border border-[#E8EEF4]"
                        >
                          {/* TEAM HEADER */}

                          <div className="flex items-center justify-between border-b border-[#E8EEF4] bg-slate-50 px-3 py-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {team.name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500">
                                {teamEmployees.length} active employee(s)
                              </p>
                            </div>

                            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                              {selectedCount} selected
                            </span>
                          </div>

                          {/* TEAM EMPLOYEES */}

                          {teamEmployees.length === 0 ? (
                            <p className="p-3 text-sm text-slate-500">
                              No active employees are assigned to this
                              organizational team.
                            </p>
                          ) : (
                            <div className="divide-y divide-[#F1F5F9]">
                              {teamEmployees.map((employee) => {
                                const employeeId = getEmployeeId(employee);

                                const selectedMember = form.teamMembers.find(
                                  (member) =>
                                    String(member.employee) ===
                                    String(employeeId),
                                );

                                const selectedInAnotherTeam =
                                  selectedMember &&
                                  String(selectedMember.organizationalTeam) !==
                                    String(teamId);

                                const workload =
                                  getEmployeeWorkload(employeeId);

                                const activeCount = workload.filter(
                                  (project) => project.status === "Active",
                                ).length;

                                const planningCount = workload.filter(
                                  (project) => project.status === "Planning",
                                ).length;

                                const onHoldCount = workload.filter(
                                  (project) => project.status === "On Hold",
                                ).length;

                                return (
                                  <div
                                    key={employeeId}
                                    className="space-y-3 border-b border-slate-100 p-4 last:border-b-0"
                                  >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(selectedMember)}
                                          disabled={Boolean(
                                            selectedInAnotherTeam,
                                          )}
                                          onChange={(event) =>
                                            toggleProjectMember(
                                              employeeId,
                                              teamId,
                                              event.target.checked,
                                            )
                                          }
                                          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />

                                        <span className="min-w-0">
                                          <span className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-800">
                                              {employee.name}
                                            </span>

                                            {workload.length === 0 ? (
                                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                                No current projects
                                              </span>
                                            ) : (
                                              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                                                {workload.length} assigned{" "}
                                                {workload.length === 1
                                                  ? "project"
                                                  : "projects"}
                                              </span>
                                            )}
                                          </span>

                                          <span className="mt-1 block text-xs text-slate-500">
                                            {employee.designation ||
                                              "Designation not added"}
                                            {employee.subDepartment?.name
                                              ? ` · ${employee.subDepartment.name}`
                                              : ""}
                                          </span>

                                          <span className="mt-0.5 block text-xs text-slate-400">
                                            {employee.email}
                                          </span>
                                        </span>
                                      </label>

                                      <div className="flex flex-wrap gap-1.5 lg:justify-end">
                                        {activeCount > 0 && (
                                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                            {activeCount} Active
                                          </span>
                                        )}
                                        {planningCount > 0 && (
                                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                            {planningCount} Planning
                                          </span>
                                        )}
                                        {onHoldCount > 0 && (
                                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                            {onHoldCount} On Hold
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {workload.length > 0 && (
                                      <details className="group rounded-xl border border-slate-200 bg-slate-50/80">
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold text-slate-600 marker:content-none">
                                          <span>
                                            View current project schedule
                                          </span>
                                          <span className="text-slate-400 transition-transform group-open:rotate-180">
                                            ↓
                                          </span>
                                        </summary>

                                        <div className="space-y-2 border-t border-slate-200 p-3">
                                          {workload.map((project) => (
                                            <div
                                              key={project._id}
                                              className="flex flex-col gap-2 rounded-lg border border-white bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                              <div className="min-w-0">
                                                <p className="truncate text-xs font-semibold text-slate-800">
                                                  {project.name}
                                                </p>
                                                <p className="mt-1 text-[11px] text-slate-500">
                                                  {formatDate(
                                                    project.startDate,
                                                  )}
                                                  {" – "}
                                                  {formatDate(project.deadline)}
                                                </p>
                                              </div>

                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <span
                                                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getProjectStatusStyle(
                                                    project,
                                                  )}`}
                                                >
                                                  {getProjectStatusLabel(
                                                    project,
                                                  )}
                                                </span>

                                                {project.isProjectLead && (
                                                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
                                                    Project Lead
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    )}

                                    {selectedMember && (
                                      <div className="pl-7">
                                        <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                          Role in this project
                                        </label>
                                        <input
                                          type="text"
                                          value={
                                            selectedMember.projectRole || ""
                                          }
                                          onChange={(event) =>
                                            updateProjectRole(
                                              employeeId,
                                              event.target.value,
                                            )
                                          }
                                          placeholder="e.g. Frontend Developer"
                                          maxLength={100}
                                          className="w-full rounded-lg border border-[#DCE6EF] bg-white px-3 py-2 text-xs outline-none transition focus:border-[#789BC5] focus:ring-2 focus:ring-[#E8F0FA] sm:max-w-xs"
                                        />
                                      </div>
                                    )}

                                    {selectedInAnotherTeam && (
                                      <p className="pl-7 text-xs text-amber-700">
                                        This employee is already selected from
                                        another team in this project.
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="rounded-lg bg-violet-50 p-3 text-xs text-violet-800">
                  Only individually selected employees will become project
                  members. Selecting an organizational team does not
                  automatically add all its employees.
                </div>
              </section>

              {/* STEP 3: PROJECT LEAD SELECTION */}

              <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    3
                  </span>

                  <h3 className="font-bold text-slate-800">
                    Assign Project Lead
                  </h3>
                </div>

                <p className="text-sm text-slate-600">
                  Select one employee from this project's selected members. The
                  Project Lead will be responsible for assigning tasks to the
                  project team.
                </p>

                {form.teamMembers.length === 0 ? (
                  <p className="rounded-xl bg-white p-3 text-sm text-slate-500">
                    Select project members first to choose a Project Lead.
                  </p>
                ) : (
                  <div>
                    <label
                      htmlFor="project-lead"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Project Lead *
                    </label>

                    <select
                      id="project-lead"
                      name="projectLead"
                      value={form.projectLead}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="">Select Project Lead</option>

                      {form.teamMembers.map((member) => {
                        const employee = employees.find(
                          (item) =>
                            String(getEmployeeId(item)) ===
                            String(member.employee),
                        );

                        if (!employee) return null;

                        return (
                          <option key={member.employee} value={member.employee}>
                            {employee.name}
                            {member.projectRole
                              ? ` — ${member.projectRole}`
                              : ""}
                          </option>
                        );
                      })}
                    </select>

                    {selectedProjectLead && (
                      <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                          {selectedProjectLead.name
                            ?.split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {selectedProjectLead.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {form.teamMembers.find(
                              (member) =>
                                String(member.employee) ===
                                String(form.projectLead),
                            )?.projectRole ||
                              selectedProjectLead.designation ||
                              "Project Lead"}
                          </p>
                        </div>

                        <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Project Lead
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-lg bg-white p-3 text-xs text-emerald-800">
                  Only the selected Project Lead will receive permission to
                  assign tasks to members of this specific project. Other
                  project members will only manage their own assigned tasks.
                </div>
              </section>

              {/* PROJECT TEAM SUMMARY */}

              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="font-bold text-emerald-900">
                  Project Team Summary
                </h3>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">Selected Teams</p>

                    <p className="mt-1 text-2xl font-bold text-slate-800">
                      {form.organizationalTeams.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">Selected Employees</p>

                    <p className="mt-1 text-2xl font-bold text-slate-800">
                      {form.teamMembers.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">Project Lead</p>

                    <p className="mt-1 truncate text-sm font-bold text-slate-800">
                      {selectedProjectLead?.name || "Not selected"}
                    </p>
                  </div>
                </div>
              </section>

              {/* MODAL ACTIONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-[#E8EEF4] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-[#DCE6EF] px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#52749B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#405F82] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingProject
                      ? "Save Changes"
                      : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
