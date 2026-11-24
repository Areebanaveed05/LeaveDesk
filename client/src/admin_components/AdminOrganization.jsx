import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";

const UNIT_TYPES = ["Department", "Sub-department", "Team"];

const EMPTY_FORM = {
  name: "",
  type: "Department",
  parent: "",
  description: "",
  manager: "",
};

const TYPE_STYLES = {
  Department: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    icon: "▣",
  },
  "Sub-department": {
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    icon: "▤",
  },
  Team: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    icon: "◈",
  },
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

const normalizeEmployees = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.employees)) return data.employees;
  return [];
};

export default function AdminOrganization() {
  const [units, setUnits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expanded, setExpanded] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchOrganization = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [organizationResponse, employeesResponse] = await Promise.all([
        api.get("/organization"),
        api.get("/users"),
      ]);

      const organizationData = Array.isArray(organizationResponse.data)
        ? organizationResponse.data
        : organizationResponse.data?.organizationUnits || [];

      setUnits(organizationData);

      const employeeData = normalizeEmployees(employeesResponse.data);
      setEmployees(employeeData.filter((employee) => employee.role !== "admin"));

      setExpanded((previous) => {
        if (Object.keys(previous).length > 0) return previous;
        return Object.fromEntries(
          organizationData
            .filter((unit) => unit.type === "Department")
            .map((unit) => [getId(unit), true])
        );
      });
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load organization information.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  const departments = useMemo(
    () => units.filter((unit) => unit.type === "Department"),
    [units]
  );

  const subDepartments = useMemo(
    () => units.filter((unit) => unit.type === "Sub-department"),
    [units]
  );

  const teams = useMemo(
    () => units.filter((unit) => unit.type === "Team"),
    [units]
  );

  const activeUnits = units.filter((unit) => unit.isActive);
  const unassignedEmployees = employees.filter(
    (employee) => !getId(employee.subDepartment)
  );

  const employeesForSubDepartment = (subDepartmentId) =>
    employees.filter(
      (employee) =>
        getId(employee.subDepartment) === String(subDepartmentId)
    );

  const employeesForTeam = (teamId) =>
    employees.filter((employee) =>
      (employee.organizationTeams || []).some(
        (team) => getId(team) === String(teamId)
      )
    );

  const getChildren = (parentId, type) =>
    units.filter(
      (unit) =>
        getId(unit.parent) === String(parentId) &&
        (!type || unit.type === type)
    );

  const filteredUnits = useMemo(() => {
    const query = search.trim().toLowerCase();

    return units.filter((unit) => {
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && unit.isActive) ||
        (statusFilter === "Inactive" && !unit.isActive);

      if (!matchesStatus) return false;
      if (!query) return true;

      const parentName =
        typeof unit.parent === "object" ? unit.parent?.name : "";
      const managerName =
        typeof unit.manager === "object" ? unit.manager?.name : "";

      return [unit.name, unit.type, unit.description, parentName, managerName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [units, search, statusFilter]);

  const visibleIds = new Set(filteredUnits.map(getId));

  const openCreateModal = (type = "Department", parent = "") => {
    setEditingUnit(null);
    setForm({ ...EMPTY_FORM, type, parent });
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (unit) => {
    setEditingUnit(unit);
    setForm({
      name: unit.name || "",
      type: unit.type,
      parent: getId(unit.parent),
      description: unit.description || "",
      manager: getId(unit.manager),
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingUnit(null);
    setForm(EMPTY_FORM);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "type" ? { parent: "" } : {}),
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Organization unit name is required.");
      return;
    }

    if (!editingUnit && form.type !== "Department" && !form.parent) {
      setError(`Please select a parent ${form.type.toLowerCase()}.`);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      manager: form.manager || null,
    };

    if (!editingUnit) {
      payload.type = form.type;
      payload.parent = form.type === "Department" ? null : form.parent;
    }

    try {
      setSaving(true);

      if (editingUnit) {
        await api.patch(`/organization/${getId(editingUnit)}`, payload);
        setSuccess("Organization unit updated successfully.");
      } else {
        await api.post("/organization", payload);
        setSuccess(`${form.type} created successfully.`);
      }

      setModalOpen(false);
      setEditingUnit(null);
      setForm(EMPTY_FORM);
      await fetchOrganization();
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to save organization unit.")
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (unit) => {
    const nextStatus = !unit.isActive;
    const confirmed = window.confirm(
      `${nextStatus ? "Activate" : "Deactivate"} "${unit.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.patch(`/organization/${getId(unit)}/status`, {
        isActive: nextStatus,
      });
      setSuccess(
        `${unit.name} ${nextStatus ? "activated" : "deactivated"} successfully.`
      );
      await fetchOrganization();
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to update organization unit status.")
      );
    }
  };

  const toggleExpanded = (id) => {
    setExpanded((previous) => ({ ...previous, [id]: !previous[id] }));
  };

  const expandAll = () => {
    setExpanded(
      Object.fromEntries(
        departments.map((department) => [getId(department), true])
      )
    );
  };

  const collapseAll = () => setExpanded({});

  const parentOptions =
    form.type === "Sub-department"
      ? departments
      : form.type === "Team"
        ? subDepartments
        : [];

  const getManagerLabel = (unit) => {
    const manager = unit.manager;
    return manager && typeof manager === "object"
      ? manager.name
      : "Not assigned";
  };

  const renderUnitActions = (unit) => (
    <div className="flex flex-wrap items-center gap-2">
      {unit.type === "Department" && (
        <button
          type="button"
          onClick={() => openCreateModal("Sub-department", getId(unit))}
          className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
        >
          + Sub-department
        </button>
      )}

      {unit.type === "Sub-department" && (
        <button
          type="button"
          onClick={() => openCreateModal("Team", getId(unit))}
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          + Team
        </button>
      )}

      <button
        type="button"
        onClick={() => openEditModal(unit)}
        className="rounded-lg border border-[#DCE6EF] px-3 py-2 text-xs font-semibold text-[#52749B] transition hover:bg-[#F0F5FA]"
      >
        Edit
      </button>

      <button
        type="button"
        onClick={() => toggleStatus(unit)}
        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
          unit.isActive
            ? "border-red-200 text-red-600 hover:bg-red-50"
            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        }`}
      >
        {unit.isActive ? "Deactivate" : "Activate"}
      </button>
    </div>
  );

  const renderTeam = (team) => {
    if (!visibleIds.has(getId(team))) return null;

    const memberCount = employeesForTeam(getId(team)).length;

    return (
      <div
        key={getId(team)}
        className={`rounded-xl border p-3 ${
          team.isActive
            ? "border-emerald-100 bg-emerald-50/40"
            : "border-slate-200 bg-slate-50 opacity-70"
        }`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 text-lg text-emerald-600">◈</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-800">{team.name}</p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    TYPE_STYLES.Team.badge
                  }`}
                >
                  Team
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    team.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {team.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {memberCount} employee{memberCount === 1 ? "" : "s"} · Lead:{" "}
                {getManagerLabel(team)}
              </p>
              {team.description && (
                <p className="mt-1 text-xs text-slate-500">{team.description}</p>
              )}
            </div>
          </div>
          {renderUnitActions(team)}
        </div>
      </div>
    );
  };

  const renderSubDepartment = (subDepartment) => {
    if (!visibleIds.has(getId(subDepartment))) return null;

    const childTeams = getChildren(getId(subDepartment), "Team");
    const memberCount = employeesForSubDepartment(getId(subDepartment)).length;

    return (
      <div
        key={getId(subDepartment)}
        className={`rounded-xl border p-4 ${
          subDepartment.isActive
            ? "border-violet-100 bg-white"
            : "border-slate-200 bg-slate-50 opacity-70"
        }`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 text-lg text-violet-600">▤</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-slate-800">{subDepartment.name}</p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TYPE_STYLES["Sub-department"].badge}`}
                >
                  Sub-department
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    subDepartment.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {subDepartment.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {memberCount} employee{memberCount === 1 ? "" : "s"} ·{" "}
                {childTeams.length} team{childTeams.length === 1 ? "" : "s"} ·
                Manager: {getManagerLabel(subDepartment)}
              </p>
              {subDepartment.description && (
                <p className="mt-1 text-xs text-slate-500">
                  {subDepartment.description}
                </p>
              )}
            </div>
          </div>
          {renderUnitActions(subDepartment)}
        </div>

        <div className="mt-4 space-y-2 border-l-2 border-emerald-100 pl-4">
          {childTeams.length > 0 ? (
            childTeams.map(renderTeam)
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-400">
              No organizational teams created yet.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderDepartment = (department) => {
    if (!visibleIds.has(getId(department))) return null;

    const childSubDepartments = getChildren(
      getId(department),
      "Sub-department"
    );
    const isExpanded = Boolean(expanded[getId(department)]);
    // Department totals are derived from its child sub-departments.
    // The employee API may return subDepartment as an ID or a populated object,
    // so do not depend on subDepartment.parent being populated.
    const departmentEmployeeCount = childSubDepartments.reduce(
      (total, subDepartment) =>
        total + employeesForSubDepartment(getId(subDepartment)).length,
      0
    );

    return (
      <section
        key={getId(department)}
        className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
          department.isActive
            ? "border-blue-100"
            : "border-slate-200 opacity-75"
        }`}
      >
        <div className="flex flex-col gap-4 bg-gradient-to-r from-blue-50/90 to-white p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => toggleExpanded(getId(department))}
              aria-label={isExpanded ? "Collapse department" : "Expand department"}
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-white text-lg font-bold text-blue-700 hover:bg-blue-50"
            >
              {isExpanded ? "−" : "+"}
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {department.name}
                </h3>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TYPE_STYLES.Department.badge}`}
                >
                  Department
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    department.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {department.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {department.description || "No description added"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {childSubDepartments.length} sub-department(s) ·{" "}
                {departmentEmployeeCount} employee(s) · Head:{" "}
                {getManagerLabel(department)}
              </p>
            </div>
          </div>
          {renderUnitActions(department)}
        </div>

        {isExpanded && (
          <div className="space-y-3 border-t border-blue-100 p-4 sm:p-5">
            {childSubDepartments.length > 0 ? (
              childSubDepartments.map(renderSubDepartment)
            ) : (
              <p className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-5 text-center text-sm text-slate-500">
                No sub-departments yet. Add one to start building this department's structure.
              </p>
            )}
          </div>
        )}
      </section>
    );
  };

  const displayedDepartments = departments.filter((department) =>
    visibleIds.has(getId(department))
  );

  return (
    <div className="min-h-screen space-y-6 bg-[#F7F9FC] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#52749B]">
            Administration / Organization
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Organization Management
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Manage your organization's departments, sub-departments and teams.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchOrganization}
            disabled={loading}
            className="rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            onClick={() => openCreateModal("Department")}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            + Add Organization Unit
          </button>
        </div>
      </div>

      {error && !modalOpen && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && !modalOpen && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Organization Overview</h2>
          <span className="text-xs text-slate-400">Live data</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-700">Departments</p>
            <p className="mt-2 text-3xl font-bold text-blue-950">
              {loading ? "—" : departments.length}
            </p>
            <p className="mt-1 text-xs text-blue-700">
              {departments.filter((unit) => unit.isActive).length} active
            </p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
            <p className="text-sm font-semibold text-violet-700">Sub-departments</p>
            <p className="mt-2 text-3xl font-bold text-violet-950">
              {loading ? "—" : subDepartments.length}
            </p>
            <p className="mt-1 text-xs text-violet-700">Across all departments</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-700">Organizational Teams</p>
            <p className="mt-2 text-3xl font-bold text-emerald-950">
              {loading ? "—" : teams.length}
            </p>
            <p className="mt-1 text-xs text-emerald-700">Across all sub-departments</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-700">Unassigned Employees</p>
            <p className="mt-2 text-3xl font-bold text-amber-950">
              {loading ? "—" : unassignedEmployees.length}
            </p>
            <p className="mt-1 text-xs text-amber-700">No sub-department assigned</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#DCE6EF] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#E8EEF4] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Organization Hierarchy
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Explore and manage the complete organization structure.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="rounded-lg border border-[#DCE6EF] px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded-lg border border-[#DCE6EF] px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Collapse All
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search department, sub-department or team..."
              className="min-w-0 flex-1 rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="All">All statuses</option>
              <option value="Active">Active only</option>
              <option value="Inactive">Inactive only</option>
            </select>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading organization structure...
            </div>
          ) : displayedDepartments.length > 0 ? (
            displayedDepartments.map(renderDepartment)
          ) : (
            <div className="rounded-xl border border-dashed border-[#DCE6EF] py-12 text-center">
              <p className="font-semibold text-slate-700">
                No organization units found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or status filter, or add a department.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#DCE6EF] bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/60 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Workforce Distribution
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Employee counts by department and sub-department.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
              {employees.length} employees
            </span>
          </div>
        </div>

        {departments.length > 0 ? (
          <div className="space-y-6 p-4 sm:p-5">
            {departments.map((department, index) => {
              const children = getChildren(getId(department), "Sub-department");
              const subDepartmentCounts = children.map((subDepartment) => ({
                unit: subDepartment,
                count: employeesForSubDepartment(getId(subDepartment)).length,
              }));
              // A department's count is the sum of its sub-department counts.
              // This avoids relying on a populated parent property on each employee.
              const departmentCount = subDepartmentCounts.reduce(
                (total, item) => total + item.count,
                0
              );
              const departmentPercentage = employees.length
                ? Math.min((departmentCount / employees.length) * 100, 100)
                : 0;
              const palette = [
                { bar: "from-blue-500 to-cyan-400", text: "text-blue-700", chip: "border-blue-100 bg-blue-50", track: "bg-blue-100" },
                { bar: "from-violet-500 to-purple-400", text: "text-violet-700", chip: "border-violet-100 bg-violet-50", track: "bg-violet-100" },
                { bar: "from-emerald-500 to-teal-400", text: "text-emerald-700", chip: "border-emerald-100 bg-emerald-50", track: "bg-emerald-100" },
                { bar: "from-amber-500 to-orange-400", text: "text-amber-700", chip: "border-amber-100 bg-amber-50", track: "bg-amber-100" },
                { bar: "from-pink-500 to-rose-400", text: "text-pink-700", chip: "border-pink-100 bg-pink-50", track: "bg-pink-100" },
                { bar: "from-indigo-500 to-sky-400", text: "text-indigo-700", chip: "border-indigo-100 bg-indigo-50", track: "bg-indigo-100" },
              ];
              const colors = palette[index % palette.length];

              return (
                <div key={getId(department)} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-r ${colors.bar}`} />
                      <p className="truncate text-sm font-bold text-slate-800">
                        {department.name}
                      </p>
                    </div>
                    <span className={`text-sm font-extrabold tabular-nums ${colors.text}`}>
                      {departmentCount}
                    </span>
                  </div>

                  <div className={`h-3 overflow-hidden rounded-full ${colors.track}`}>
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${colors.bar} transition-all duration-500`}
                      style={{ width: `${departmentPercentage}%` }}
                      role="progressbar"
                      aria-label={`${department.name} workforce share`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(departmentPercentage)}
                    />
                  </div>

                  {subDepartmentCounts.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 pl-3 sm:grid-cols-2 xl:grid-cols-3">
                      {subDepartmentCounts.map(({ unit, count }) => {
                        const percentage = employees.length
                          ? Math.min((count / employees.length) * 100, 100)
                          : 0;

                        return (
                          <div
                            key={getId(unit)}
                            className={`rounded-xl border px-3 py-3 ${colors.chip}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`min-w-0 text-xs font-semibold ${colors.text}`}>
                                {unit.name}
                              </span>
                              <span className={`text-sm font-extrabold tabular-nums ${colors.text}`}>
                                {count}
                              </span>
                            </div>
                            <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${colors.track}`}>
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${colors.bar} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="pl-3 text-xs text-slate-400">
                      No sub-departments created yet.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-5 text-sm text-slate-500">
            No departments available yet.
          </p>
        )}
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-blue-100 bg-blue-50 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingUnit ? "Edit Organization Unit" : `Create ${form.type}`}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add organization details and assign its manager.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
                className="rounded-lg px-2 text-2xl text-slate-500 hover:bg-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {!editingUnit && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Organization Unit Type *
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {UNIT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!editingUnit && form.type !== "Department" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Parent {form.type === "Team" ? "Sub-department" : "Department"} *
                  </label>
                  <select
                    name="parent"
                    value={form.parent}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select parent</option>
                    {parentOptions
                      .filter((unit) => unit.isActive)
                      .map((unit) => (
                        <option key={getId(unit)} value={getId(unit)}>
                          {unit.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {form.type} Name *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                  maxLength={100}
                  placeholder={`Enter ${form.type.toLowerCase()} name`}
                  className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={3}
                  maxLength={500}
                  placeholder="What does this organization unit do?"
                  className="w-full resize-y rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {form.type === "Department"
                    ? "Department Head"
                    : form.type === "Sub-department"
                      ? "Sub-department Manager"
                      : "Team Lead"}
                </label>
                <select
                  name="manager"
                  value={form.manager}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">No manager assigned</option>
                  {employees
                    .filter((employee) => employee.isActive)
                    .map((employee) => (
                      <option key={getId(employee)} value={getId(employee)}>
                        {employee.name} — {employee.designation || employee.email}
                      </option>
                    ))}
                </select>
                <p className="mt-2 text-xs text-slate-400">
                  Only active employees can be assigned as managers.
                </p>
              </div>

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
                  className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingUnit
                      ? "Save Changes"
                      : `Create ${form.type}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
