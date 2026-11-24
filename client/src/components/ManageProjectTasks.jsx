import { useEffect, useMemo, useState } from "react";
import api from "../api";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const PRIORITY_STYLES = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Urgent: "bg-red-100 text-red-700",
};

const TASK_STATUS_STYLES = {
  "To Do": "bg-slate-100 text-slate-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const formatDate = (date) => {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const getPakistanDate = (date = new Date()) => {
  if (!date) return "";

  const parsedDate = date instanceof Date ? date : new Date(date);

  // Invalid or missing dates must never crash the component.
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsedDate);
};

const toDateInput = (date) => {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return getPakistanDate(parsed);
};

const isTaskOverdue = (task) => {
  if (!task?.deadline || task.status === "Completed") {
    return false;
  }

  const today = getPakistanDate(new Date());
  const deadline = getPakistanDate(task.deadline);

  // Missing or invalid deadlines are not treated as overdue.
  if (!today || !deadline) {
    return false;
  }

  return today > deadline;
};

// A project is overdue only while its status is Active and its deadline
// has passed. The date fallback keeps the UI correct even if the API's
// isOverdue field has not been refreshed yet.
const isProjectOverdue = (project) => {
  if (!project || project.status !== "Active") return false;
  if (project.isOverdue === true) return true;

  const today = getPakistanDate(new Date());
  const deadline = getPakistanDate(project.deadline);

  if (!today || !deadline) return false;

  return today > deadline;
};

const getProjectStatusLabel = (project) =>
  isProjectOverdue(project) ? "Overdue" : project?.status || "Unknown";

// ------------------------------------------
// MAIN COMPONENT
// ------------------------------------------

export default function ManageProjectTasks({ user }) {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [phases, setPhases] = useState([]);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [phaseLoading, setPhaseLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phaseSubmitting, setPhaseSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [phaseForm, setPhaseForm] = useState({
    name: "",
    description: "",
    startDate: "",
    deadline: "",
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    phase: "",
    assignedTo: "",
    priority: "Medium",
    startDate: "",
    deadline: "",
    dependsOn: [],
  });

  const currentUserId = getId(user?._id || user?.id);

  // ------------------------------------------
  // FETCH PROJECTS AND TASKS
  // ------------------------------------------

  const fetchProjectsAndTasks = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const [projectsResponse, tasksResponse] = await Promise.all([
        api.get("/projects"),
        api.get("/tasks"),
      ]);

      const allProjects = Array.isArray(projectsResponse.data)
        ? projectsResponse.data
        : projectsResponse.data?.projects || [];

      const allTasks = Array.isArray(tasksResponse.data)
        ? tasksResponse.data
        : [];

      const ledProjects = allProjects.filter(
        (project) => getId(project.projectLead) === currentUserId
      );

      setProjects(ledProjects);

      const ledIds = new Set(
        ledProjects.map((project) => getId(project))
      );

      setTasks(
        allTasks.filter((task) => ledIds.has(getId(task.project)))
      );

      setSelectedProjectId((previous) =>
        previous &&
        ledProjects.some((project) => getId(project) === previous)
          ? previous
          : ""
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load project tasks."
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Refresh every 60 seconds so the Project Lead sees employee updates
  // and automatic task status changes without manually refreshing.
  useEffect(() => {
    let isMounted = true;
    let refreshInterval;

    if (currentUserId) {
      fetchProjectsAndTasks();

      refreshInterval = setInterval(() => {
        if (isMounted) fetchProjectsAndTasks(true);
      }, 60 * 1000);
    } else {
      setLoading(false);
      setProjects([]);
      setTasks([]);
    }

    return () => {
      isMounted = false;
      if (refreshInterval) clearInterval(refreshInterval);
    };

    // fetchProjectsAndTasks intentionally runs when user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const selectedProject = projects.find(
    (project) => getId(project) === selectedProjectId
  );

  const selectedProjectIsOverdue = isProjectOverdue(selectedProject);
  const selectedProjectCannotBeManaged =
    selectedProjectIsOverdue ||
    ["Completed", "On Hold"].includes(selectedProject?.status);

  // ------------------------------------------
  // PROJECT TEAM MEMBERS
  // ------------------------------------------

  const projectMembers = useMemo(() => {
    if (!selectedProject) return [];

    return (selectedProject.teamMembers || [])
      .map((member) => {
        const employee = member.employee;

        if (!employee || typeof employee !== "object") return null;

        const department =
          typeof employee.department === "object"
            ? employee.department?.name || ""
            : employee.department || "";

        const subDepartment =
          typeof employee.subDepartment === "object"
            ? employee.subDepartment?.name || ""
            : employee.subDepartment || "";

        const organizationalTeam =
          typeof member.organizationalTeam === "object"
            ? member.organizationalTeam?.name || ""
            : "";

        return {
          _id: getId(employee),
          name: employee.name || "Employee",
          email: employee.email || "",
          department,
          subDepartment,
          designation: employee.designation || "",
          organizationalTeam,
          projectRole: member.projectRole || "",
        };
      })
      .filter((member) => member?._id);
  }, [selectedProject]);

  // ------------------------------------------
  // SELECTED PROJECT TASKS
  // ------------------------------------------

  const allProjectTasks = useMemo(
    () =>
      tasks.filter(
        (task) => getId(task.project) === selectedProjectId
      ),
    [tasks, selectedProjectId]
  );

  const projectTasks = useMemo(
    () =>
      allProjectTasks.filter((task) => {
        const searchText = [
          task.title,
          task.description,
          task.assignedTo?.name,
          task.priority,
          task.status,
          task.phase?.name,
        ]
          .join(" ")
          .toLowerCase();

        return searchText.includes(search.toLowerCase());
      }),
    [allProjectTasks, search]
  );

  // ------------------------------------------
  // PROJECT TASK SUMMARY
  // ------------------------------------------

  const taskCounts = useMemo(
    () => ({
      total: allProjectTasks.length,
      todo: allProjectTasks.filter(
        (task) => task.status === "To Do"
      ).length,
      inProgress: allProjectTasks.filter(
        (task) => task.status === "In Progress"
      ).length,
      completed: allProjectTasks.filter(
        (task) => task.status === "Completed"
      ).length,
      overdue: allProjectTasks.filter(isTaskOverdue).length,
    }),
    [allProjectTasks]
  );

  // ------------------------------------------
  // EMPLOYEE-WISE TASK SUMMARY
  // ------------------------------------------

  const getMemberTaskStats = (memberId) => {
    const memberTasks = allProjectTasks.filter(
      (task) => getId(task.assignedTo) === memberId
    );

    return {
      total: memberTasks.length,
      todo: memberTasks.filter(
        (task) => task.status === "To Do"
      ).length,
      inProgress: memberTasks.filter(
        (task) => task.status === "In Progress"
      ).length,
      completed: memberTasks.filter(
        (task) => task.status === "Completed"
      ).length,
      overdue: memberTasks.filter(isTaskOverdue).length,
    };
  };

  // ------------------------------------------
  // FETCH PROJECT PHASES
  // ------------------------------------------

  const fetchPhases = async (projectId) => {
    if (!projectId) {
      setPhases([]);
      return;
    }

    try {
      setPhaseLoading(true);

      const { data } = await api.get(
        `/project-phases/${projectId}`
      );

      setPhases(Array.isArray(data) ? data : []);
    } catch (err) {
      setPhases([]);
      setError(
        err.response?.data?.message || "Unable to load project phases."
      );
    } finally {
      setPhaseLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchPhases(selectedProjectId);
    } else {
      setPhases([]);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  // ------------------------------------------
  // FORM HANDLERS
  // ------------------------------------------

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetTaskForm = () => {
    setForm({
      title: "",
      description: "",
      phase: "",
      assignedTo: "",
      priority: "Medium",
      startDate: "",
      deadline: "",
      dependsOn: [],
    });
  };

  const resetPhaseForm = () => {
    setPhaseForm({
      name: "",
      description: "",
      startDate: "",
      deadline: "",
    });
  };

  // ------------------------------------------
  // CREATE PROJECT PHASE
  // ------------------------------------------

  const handleCreatePhase = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedProjectId || !selectedProject) {
      setError("Please select a project first.");
      return;
    }

    if (selectedProjectCannotBeManaged) {
      setError(
        selectedProjectIsOverdue
          ? "This project is overdue. The Project Lead cannot create phases until an Admin updates the project dates or status."
          : "Phases cannot be created for completed or on-hold projects."
      );
      return;
    }

    if (
      !phaseForm.name.trim() ||
      !phaseForm.startDate ||
      !phaseForm.deadline
    ) {
      setError(
        "Phase name, start date and deadline are required."
      );
      return;
    }

    if (phaseForm.deadline < phaseForm.startDate) {
      setError("Phase deadline cannot be before its start date.");
      return;
    }

    try {
      setPhaseSubmitting(true);

      const { data } = await api.post("/project-phases", {
        project: selectedProjectId,
        name: phaseForm.name.trim(),
        description: phaseForm.description.trim(),
        startDate: phaseForm.startDate,
        deadline: phaseForm.deadline,
      });

      setPhases((previous) =>
        [...previous, data.phase].sort(
          (a, b) => a.order - b.order
        )
      );

      setForm((previous) => ({
        ...previous,
        phase: previous.phase || getId(data.phase),
      }));

      resetPhaseForm();

      setSuccess(data.message || "Phase created successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to create phase."
      );
    } finally {
      setPhaseSubmitting(false);
    }
  };

  // ------------------------------------------
  // ASSIGN TASK
  // ------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !selectedProject ||
      !form.title.trim() ||
      !form.phase ||
      !form.assignedTo ||
      !form.startDate ||
      !form.deadline
    ) {
      setError("Please complete all required task fields.");
      return;
    }

    if (form.deadline < form.startDate) {
      setError("Task deadline cannot be before its start date.");
      return;
    }

    if (selectedProjectCannotBeManaged) {
      setError(
        selectedProjectIsOverdue
          ? "This project is overdue. Task assignment is blocked until an Admin updates the project dates or status."
          : "Tasks cannot be assigned to completed or on-hold projects."
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        project: selectedProjectId,
        phase: form.phase,
        assignedTo: form.assignedTo,
        priority: form.priority,
        startDate: form.startDate,
        deadline: form.deadline,
        dependsOn: form.dependsOn,
      };

      const { data } = await api.post("/tasks", payload);

      if (data.task) {
        setTasks((previous) => [data.task, ...previous]);
      } else {
        await fetchProjectsAndTasks(true);
      }

      resetTaskForm();

      setSuccess(data.message || "Task assigned successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to assign task. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------
  // AVAILABLE TASK DEPENDENCIES
  // ------------------------------------------

  const availableDependencies = allProjectTasks.filter((task) => {
    if (!form.startDate) return false;

    return (
      task.status !== "Completed" &&
      toDateInput(task.deadline) <= form.startDate
    );
  });

  // ------------------------------------------
  // LOADING
  // ------------------------------------------

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#DCE6EF] bg-white p-10 text-center">
        <p className="text-sm font-medium text-slate-500">
          Loading your projects and tasks...
        </p>
      </div>
    );
  }

  // ------------------------------------------
  // MAIN UI
  // ------------------------------------------

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-medium text-[#52749B]">
          Employee Portal / Manage Project Tasks
        </p>

        <h1 className="mt-2 text-2xl font-bold text-slate-800 sm:text-3xl">
          Manage Project Tasks
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Create project phases, assign tasks and monitor your team&apos;s progress.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#C9D9EE] bg-white p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
            ✓
          </div>

          <h2 className="mt-4 font-bold text-slate-800">
            No Projects Assigned as Lead
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            You are not currently assigned as Project Lead of any project.
          </p>
        </div>
      ) : (
        <>
          {/* PROJECT SELECTOR */}

          <section className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm">
            <label
              htmlFor="projectSelect"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Select Project
            </label>

            <select
              id="projectSelect"
              value={selectedProjectId}
              onChange={(event) => {
                setSelectedProjectId(event.target.value);
                setError("");
                setSuccess("");
                setSearch("");
                resetTaskForm();
                resetPhaseForm();
              }}
              className="w-full rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Choose a project...</option>

              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>

            {selectedProject && (
              <div className="mt-4 rounded-xl bg-[#F0F5FA] p-4">
                <h2 className="font-bold text-slate-800">
                  {selectedProject.name}
                </h2>

                {selectedProject.description && (
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedProject.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>
                    Status:{" "}
                    <strong
                      className={
                        selectedProjectIsOverdue
                          ? "text-red-600"
                          : "text-slate-700"
                      }
                    >
                      {getProjectStatusLabel(selectedProject)}
                    </strong>
                  </span>

                  <span>
                    Team Members:{" "}
                    <strong className="text-slate-700">
                      {projectMembers.length}
                    </strong>
                  </span>

                  <span>
                    Start:{" "}
                    <strong className="text-slate-700">
                      {formatDate(selectedProject.startDate)}
                    </strong>
                  </span>

                  <span>
                    Deadline:{" "}
                    <strong className="text-slate-700">
                      {formatDate(selectedProject.deadline)}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {selectedProjectIsOverdue && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <h3 className="font-bold text-red-700">
                  Project Overdue — Management Locked
                </h3>
                <p className="mt-1 text-sm text-red-600">
                  This project has passed its deadline. You can view existing
                  project information and tasks, but creating phases and
                  assigning new tasks are disabled. Contact the Admin to
                  update the project deadline or status.
                </p>
              </div>
            )}
          </section>

          {!selectedProject ? (
            <div className="rounded-2xl border border-dashed border-[#C9D9EE] bg-white p-10 text-center">
              <h2 className="font-bold text-slate-800">
                Select a Project
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Select one of your projects above to manage its phases and tasks.
              </p>
            </div>
          ) : (
            <>
              {/* PROJECT TASK SUMMARY */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                  title="Total Tasks"
                  value={taskCounts.total}
                  color="bg-blue-50 text-blue-600"
                />

                <SummaryCard
                  title="To Do"
                  value={taskCounts.todo}
                  color="bg-slate-100 text-slate-600"
                />

                <SummaryCard
                  title="In Progress"
                  value={taskCounts.inProgress}
                  color="bg-blue-50 text-blue-600"
                />

                <SummaryCard
                  title="Completed"
                  value={taskCounts.completed}
                  color="bg-emerald-50 text-emerald-600"
                />

                <SummaryCard
                  title="Overdue"
                  value={taskCounts.overdue}
                  color="bg-red-50 text-red-600"
                />
              </div>

              {/* PROJECT TEAM MEMBERS AND PROGRESS */}

              <section className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="font-bold text-slate-800">
                    Project Team Members
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Monitor each member&apos;s assigned tasks and completion progress.
                  </p>
                </div>

                {projectMembers.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                    No team members found for this project.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {projectMembers.map((member) => {
                      const stats = getMemberTaskStats(member._id);

                      const completionPercentage =
                        stats.total > 0
                          ? Math.round(
                              (stats.completed / stats.total) * 100
                            )
                          : 0;

                      return (
                        <div
                          key={member._id}
                          className="flex items-start gap-3 rounded-xl border border-[#E8EEF4] p-4"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-600">
                            {member.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-800">
                              {member.name}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {member.email || "No email available"}
                            </p>

                            <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
                              <MemberDetail
                                label="Department"
                                value={member.department}
                              />

                              <MemberDetail
                                label="Sub-department"
                                value={member.subDepartment}
                              />

                              <MemberDetail
                                label="Designation"
                                value={member.designation}
                              />

                              <MemberDetail
                                label="Organizational Team"
                                value={member.organizationalTeam}
                              />

                              <MemberDetail
                                label="Project Role"
                                value={member.projectRole}
                              />
                            </div>

                            {/* MEMBER TASK PROGRESS */}

                            <div className="mt-4 rounded-lg bg-slate-50 p-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Assigned Task Progress
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                                <span className="rounded-full bg-white px-2 py-1 text-slate-600">
                                  Total: {stats.total}
                                </span>

                                <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-700">
                                  To Do: {stats.todo}
                                </span>

                                <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                                  In Progress: {stats.inProgress}
                                </span>

                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                                  Completed: {stats.completed}
                                </span>

                                {stats.overdue > 0 && (
                                  <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">
                                    Overdue: {stats.overdue}
                                  </span>
                                )}
                              </div>

                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all"
                                  style={{
                                    width: `${completionPercentage}%`,
                                  }}
                                />
                              </div>

                              <p className="mt-1 text-right text-[10px] font-semibold text-slate-500">
                                {completionPercentage}% completed
                              </p>
                            </div>

                            {member._id === currentUserId && (
                              <span className="mt-3 inline-block rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                                You · Project Lead
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* PHASE MANAGEMENT */}

              {selectedProjectIsOverdue ? (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <h2 className="font-bold text-red-700">
                    Project Phases Locked
                  </h2>
                  <p className="mt-2 text-sm text-red-600">
                    Phase creation is disabled because this project is overdue.
                    An Admin must update the deadline or change the project
                    status before work can continue.
                  </p>
                </section>
              ) : (
                <section className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-slate-800">
                    Project Phases
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Divide this project into manageable stages.
                  </p>
                </div>

                {phaseLoading ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    Loading phases...
                  </p>
                ) : phases.length === 0 ? (
                  <p className="mb-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No phases created yet. Create the first phase below.
                  </p>
                ) : (
                  <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {phases.map((phase) => {
                      const phaseTasks = allProjectTasks.filter(
                        (task) => getId(task.phase) === getId(phase)
                      );

                      const completed = phaseTasks.filter(
                        (task) => task.status === "Completed"
                      ).length;

                      const percentage =
                        phaseTasks.length > 0
                          ? Math.round(
                              (completed / phaseTasks.length) * 100
                            )
                          : 0;

                      return (
                        <div
                          key={phase._id}
                          className="rounded-xl border border-[#E8EEF4] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                                Phase {phase.order}
                              </p>

                              <h3 className="mt-1 font-bold text-slate-800">
                                {phase.name}
                              </h3>
                            </div>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {phaseTasks.length} task(s)
                            </span>
                          </div>

                          {phase.description && (
                            <p className="mt-2 text-sm text-slate-500">
                              {phase.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                            <span>
                              Start:{" "}
                              <strong className="text-slate-700">
                                {formatDate(phase.startDate)}
                              </strong>
                            </span>

                            <span>
                              Deadline:{" "}
                              <strong className="text-slate-700">
                                {formatDate(phase.deadline)}
                              </strong>
                            </span>
                          </div>

                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          <p className="mt-1 text-right text-xs text-slate-500">
                            {completed}/{phaseTasks.length} completed · {percentage}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* CREATE PHASE FORM */}

                <form
                  onSubmit={handleCreatePhase}
                  className="space-y-4 border-t border-slate-100 pt-5"
                >
                  <h3 className="font-semibold text-slate-800">
                    Create New Phase
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="phaseName"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Phase Name *
                      </label>

                      <input
                        id="phaseName"
                        value={phaseForm.name}
                        onChange={(e) =>
                          setPhaseForm((p) => ({
                            ...p,
                            name: e.target.value,
                          }))
                        }
                        maxLength={120}
                        required
                        placeholder="e.g. Planning & Analysis"
                        className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="phaseDescription"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Description
                      </label>

                      <input
                        id="phaseDescription"
                        value={phaseForm.description}
                        onChange={(e) =>
                          setPhaseForm((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        maxLength={2000}
                        placeholder="Short phase description"
                        className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="phaseStart"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Phase Start Date *
                      </label>

                      <input
                        id="phaseStart"
                        type="date"
                        min={toDateInput(selectedProject.startDate)}
                        max={toDateInput(selectedProject.deadline)}
                        value={phaseForm.startDate}
                        onChange={(e) =>
                          setPhaseForm((p) => ({
                            ...p,
                            startDate: e.target.value,
                          }))
                        }
                        required
                        className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="phaseDeadline"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Phase Deadline *
                      </label>

                      <input
                        id="phaseDeadline"
                        type="date"
                        min={
                          phaseForm.startDate ||
                          toDateInput(selectedProject.startDate)
                        }
                        max={toDateInput(selectedProject.deadline)}
                        value={phaseForm.deadline}
                        onChange={(e) =>
                          setPhaseForm((p) => ({
                            ...p,
                            deadline: e.target.value,
                          }))
                        }
                        required
                        className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={
                        phaseSubmitting ||
                        selectedProjectCannotBeManaged
                      }
                      className="rounded-xl border border-blue-600 px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {phaseSubmitting
                        ? "Creating..."
                        : "＋ Create Phase"}
                    </button>
                  </div>
                </form>
                </section>
              )}

              {/* ASSIGN TASK */}

              <section className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-800">
                    Assign New Task
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Assign a task to a project member and optionally add prerequisites.
                  </p>
                </div>

                {selectedProjectIsOverdue ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Task assignment is locked because this project is overdue.
                    An Admin must update the project deadline or status before
                    the Project Lead can assign tasks again.
                  </div>
                ) : ["Completed", "On Hold"].includes(
                    selectedProject.status
                  ) ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    You cannot assign new tasks while this project is{" "}
                    {selectedProject.status}.
                  </div>
                ) : phases.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    Create a project phase before assigning tasks.
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label
                        htmlFor="taskTitle"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Task Title *
                      </label>

                      <input
                        id="taskTitle"
                        name="title"
                        type="text"
                        maxLength={150}
                        value={form.title}
                        onChange={handleFormChange}
                        placeholder="Enter task title"
                        required
                        className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="taskDescription"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Description
                      </label>

                      <textarea
                        id="taskDescription"
                        name="description"
                        rows={3}
                        maxLength={2000}
                        value={form.description}
                        onChange={handleFormChange}
                        placeholder="Describe the task and expected work..."
                        className="w-full resize-y rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <label
                          htmlFor="taskPhase"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Project Phase *
                        </label>

                        <select
                          id="taskPhase"
                          name="phase"
                          value={form.phase}
                          onChange={handleFormChange}
                          required
                          className="w-full rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">Select phase</option>

                          {phases.map((phase) => (
                            <option
                              key={phase._id}
                              value={phase._id}
                            >
                              Phase {phase.order} · {phase.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="assignedTo"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Assign To *
                        </label>

                        <select
                          id="assignedTo"
                          name="assignedTo"
                          value={form.assignedTo}
                          onChange={handleFormChange}
                          required
                          className="w-full rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">Select team member</option>

                          {projectMembers.map((member) => (
                            <option
                              key={member._id}
                              value={member._id}
                            >
                              {member.name}
                              {member._id === currentUserId
                                ? " (You)"
                                : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="priority"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Priority *
                        </label>

                        <select
                          id="priority"
                          name="priority"
                          value={form.priority}
                          onChange={handleFormChange}
                          className="w-full rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                          {PRIORITIES.map((priority) => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="taskStartDate"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Task Start Date *
                        </label>

                        <input
                          id="taskStartDate"
                          name="startDate"
                          type="date"
                          min={toDateInput(selectedProject.startDate)}
                          max={toDateInput(selectedProject.deadline)}
                          value={form.startDate}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              startDate: e.target.value,
                              dependsOn: [],
                            }))
                          }
                          required
                          className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="taskDeadline"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Task Deadline *
                        </label>

                        <input
                          id="taskDeadline"
                          name="deadline"
                          type="date"
                          min={
                            form.startDate ||
                            toDateInput(selectedProject.startDate)
                          }
                          max={toDateInput(selectedProject.deadline)}
                          value={form.deadline}
                          onChange={handleFormChange}
                          required
                          className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    {/* TASK DEPENDENCIES */}

                    <div className="rounded-xl border border-[#E8EEF4] p-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                          Task Dependencies
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Select prerequisite tasks that must be completed before this task can start.
                        </p>
                      </div>

                      {!form.startDate ? (
                        <p className="mt-3 text-sm text-slate-500">
                          Select a task start date to see eligible prerequisites.
                        </p>
                      ) : availableDependencies.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">
                          No eligible prerequisite tasks for this start date.
                        </p>
                      ) : (
                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                          {availableDependencies.map((task) => (
                            <label
                              key={task._id}
                              className="flex cursor-pointer items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={form.dependsOn.includes(
                                  task._id
                                )}
                                onChange={(event) => {
                                  setForm((previous) => ({
                                    ...previous,
                                    dependsOn: event.target.checked
                                      ? [
                                          ...previous.dependsOn,
                                          task._id,
                                        ]
                                      : previous.dependsOn.filter(
                                          (id) => id !== task._id
                                        ),
                                  }));
                                }}
                                className="mt-0.5"
                              />

                              <span>
                                <span className="block font-medium text-slate-700">
                                  {task.title}
                                </span>

                                <span className="block text-xs text-slate-500">
                                  {task.status} · Deadline{" "}
                                  {formatDate(task.deadline)}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-5">
                      <button
                        type="submit"
                        disabled={
                          submitting ||
                          selectedProjectCannotBeManaged ||
                          projectMembers.length === 0 ||
                          !phases.length
                        }
                        className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? "Assigning Task..." : "Assign Task"}
                      </button>
                    </div>
                  </form>
                )}
              </section>

              {/* ASSIGNED TASKS */}

              <section className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slate-800">
                      Assigned Tasks
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Monitor assigned employees, task deadlines and completion progress. This view refreshes automatically every 60 seconds.
                    </p>
                  </div>

                  <span className="text-sm text-slate-500">
                    {projectTasks.length} task(s)
                  </span>
                </div>

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tasks, phases or employees..."
                  className="mb-5 w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />

                {projectTasks.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-8 text-center">
                    <p className="font-semibold text-slate-700">
                      No Tasks Found
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {allProjectTasks.length === 0
                        ? "No tasks have been assigned to this project yet."
                        : "No tasks match your search."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectTasks.map((task) => {
                      const overdue = isTaskOverdue(task);

                      return (
                        <div
                          key={task._id}
                          className="rounded-xl border border-[#E8EEF4] p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-slate-800">
                                {task.title}
                              </h3>

                              {task.description && (
                                <p className="mt-1 text-sm text-slate-500">
                                  {task.description}
                                </p>
                              )}

                              <p className="mt-2 text-xs font-medium text-blue-700">
                                {task.phase?.name ||
                                  "Legacy task (no phase)"}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                PRIORITY_STYLES[task.priority] ||
                                PRIORITY_STYLES.Medium
                              }`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                            <span>
                              Assigned to:{" "}
                              <strong className="text-slate-700">
                                {task.assignedTo?.name || "Employee"}
                              </strong>
                            </span>

                            <span>
                              Start:{" "}
                              <strong className="text-slate-700">
                                {formatDate(task.startDate)}
                              </strong>
                            </span>

                            <span>
                              Deadline:{" "}
                              <strong
                                className={
                                  overdue
                                    ? "text-red-600"
                                    : "text-slate-700"
                                }
                              >
                                {formatDate(task.deadline)}
                              </strong>
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 font-semibold ${
                                overdue
                                  ? "bg-red-100 text-red-700"
                                  : TASK_STATUS_STYLES[task.status] ||
                                    TASK_STATUS_STYLES["To Do"]
                              }`}
                            >
                              {overdue ? "Overdue" : task.status}
                            </span>
                          </div>

                          {task.status === "Completed" &&
                            task.completedAt && (
                              <p className="mt-2 text-xs font-medium text-emerald-700">
                                Completed on:{" "}
                                {formatDate(task.completedAt)}
                              </p>
                            )}

                          {task.dependsOn?.length > 0 && (
                            <div className="mt-3 border-t border-slate-100 pt-3">
                              <p className="text-xs font-semibold text-slate-500">
                                Prerequisites
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {task.dependsOn.map((dependency, index) => (
                                  <span
                                    key={getId(dependency) || index}
                                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                                  >
                                    {dependency.title || "Task"} ·{" "}
                                    {dependency.status || "Unknown"}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ------------------------------------------
// MEMBER DETAIL
// ------------------------------------------

function MemberDetail({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 break-words text-xs font-medium text-slate-700">
        {value || "Not specified"}
      </p>
    </div>
  );
}

// ------------------------------------------
// SUMMARY CARD
// ------------------------------------------

function SummaryCard({ title, value, color }) {
  return (
    <div className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>

      <p
        className={`mt-3 inline-flex min-w-10 items-center justify-center rounded-xl px-3 py-2 text-2xl font-bold ${color}`}
      >
        {value}
      </p>
    </div>
  );
}