import { useEffect, useState } from "react";
import api from "../api";

const EMPTY_FORM = {
  name: "",
  description: "",
  manager: "",
  type: "Department",
  parent: "",
};

const TYPOGRAPHY = {
  pageTitle: "text-2xl font-bold tracking-tight text-slate-900",
  sectionTitle: "text-base font-bold text-slate-900",
  departmentTitle: "text-base font-bold text-blue-950",
  subDepartmentTitle: "text-sm font-semibold text-violet-950",
  teamTitle: "text-sm font-semibold text-teal-950",
  body: "text-sm leading-5 text-slate-600",
  helper: "text-xs leading-5 text-slate-500",
  label: "mb-2 block text-sm font-semibold text-slate-700",
  button: "inline-flex min-h-9 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
};

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive
          ? "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200"
          : "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200"
      }`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-600" : "bg-rose-500"
        }`}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function StatusAction({ unit, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(unit)}
      className={`${TYPOGRAPHY.button} border ${
        unit.isActive
          ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
          : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
      }`}
    >
      {unit.isActive ? "Deactivate" : "Activate"}
    </button>
  );
}

function Chevron({ expanded }) {
  return (
    <span
      className={`inline-block text-lg leading-none transition-transform ${
        expanded ? "rotate-90" : ""
      }`}
      aria-hidden="true"
    >
      ›
    </span>
  );
}

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [expandedDepartments, setExpandedDepartments] = useState(new Set());
  const [expandedSubDepartments, setExpandedSubDepartments] = useState(new Set());

  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/organization/tree");
      const organization = Array.isArray(data) ? data : [];

      setDepartments(organization);
      setExpandedDepartments(
        new Set(organization.map((department) => department._id))
      );
      setExpandedSubDepartments(
        new Set(
          organization.flatMap((department) =>
            (department.subDepartments || []).map((subDepartment) => subDepartment._id)
          )
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load organization structure."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get("/users");
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load employees."
      );
    }
  };

  useEffect(() => {
    fetchOrganization();
    fetchEmployees();
  }, []);

  const totalSubDepartments = departments.reduce(
    (total, department) => total + (department.subDepartments || []).length,
    0
  );

  const totalTeams = departments.reduce(
    (total, department) =>
      total +
      (department.subDepartments || []).reduce(
        (subTotal, subDepartment) =>
          subTotal + (subDepartment.teams || []).length,
        0
      ),
    0
  );

  const activeDepartments = departments.filter(
    (department) => department.isActive
  ).length;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEdit = (department) => {
    setEditing(department);
    setForm({
      name: department.name || "",
      description: department.description || "",
      manager: department.manager?._id || "",
      type: "Department",
      parent: "",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "type" ? { parent: "" } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        manager: form.manager || null,
      };

      if (editing) {
        await api.patch(`/organization/${editing._id}`, payload);
        setSuccess("Department updated successfully.");
      } else {
        await api.post("/organization", {
          ...payload,
          type: form.type,
          parent: form.type === "Department" ? null : form.parent,
        });
        setSuccess(`${form.type} created successfully.`);
      }

      setShowModal(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await fetchOrganization();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save department."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleUnitStatus = async (unit) => {
    const nextStatus = !unit.isActive;
    const action = nextStatus ? "activate" : "deactivate";

    if (!window.confirm(`Are you sure you want to ${action} ${unit.name}?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await api.patch(`/organization/${unit._id}/status`, {
        isActive: nextStatus,
      });

      setSuccess(
        `${unit.name} has been ${
          nextStatus ? "activated" : "deactivated"
        } successfully.`
      );
      await fetchOrganization();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update organization status."
      );
    }
  };

  const toggleDepartment = (id) => {
    setExpandedDepartments((previous) => {
      const updated = new Set(previous);
      updated.has(id) ? updated.delete(id) : updated.add(id);
      return updated;
    });
  };

  const toggleSubDepartment = (id) => {
    setExpandedSubDepartments((previous) => {
      const updated = new Set(previous);
      updated.has(id) ? updated.delete(id) : updated.add(id);
      return updated;
    });
  };

  const expandAll = () => {
    setExpandedDepartments(
      new Set(departments.map((department) => department._id))
    );
    setExpandedSubDepartments(
      new Set(
        departments.flatMap((department) =>
          (department.subDepartments || []).map((subDepartment) => subDepartment._id)
        )
      )
    );
  };

  const collapseAll = () => {
    setExpandedDepartments(new Set());
    setExpandedSubDepartments(new Set());
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-sm">
      {/* Page heading */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
            Administration / Organization
          </p>
          <h1 className={TYPOGRAPHY.pageTitle}>Department Management</h1>
          <p className="mt-2 text-sm text-slate-500">
            View and manage departments, sub-departments and teams.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className={`${TYPOGRAPHY.button} min-h-11 bg-blue-700 px-5 text-white shadow-sm hover:bg-blue-800`}
        >
          + Add Organization Unit
        </button>
      </header>

      {/* Feedback */}
      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          {success}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          {error}
        </div>
      )}

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-medium text-blue-800">Departments</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-blue-950">
            {departments.length}
          </p>
          <p className="mt-1 text-xs font-medium text-blue-700">
            {activeDepartments} active
          </p>
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
          <p className="text-sm font-medium text-violet-800">Sub-departments</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-violet-950">
            {totalSubDepartments}
          </p>
          <p className="mt-1 text-xs text-violet-700">Across all departments</p>
        </div>

        <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
          <p className="text-sm font-medium text-teal-800">Teams</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-teal-950">
            {totalTeams}
          </p>
          <p className="mt-1 text-xs text-teal-700">Across all sub-departments</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-700">Employees</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
            {employees.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Registered employees</p>
        </div>
      </section>

      {/* Hierarchy */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className={TYPOGRAPHY.sectionTitle}>Organization Structure</h2>
            <p className="mt-1 text-xs text-slate-500">
              {departments.length} departments · {totalSubDepartments} sub-departments · {totalTeams} teams
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={expandAll}
              disabled={loading || departments.length === 0}
              className={`${TYPOGRAPHY.button} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              disabled={loading}
              className={`${TYPOGRAPHY.button} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
            >
              Collapse All
            </button>
            <button
              type="button"
              onClick={() => {
                fetchOrganization();
                fetchEmployees();
              }}
              disabled={loading}
              className={`${TYPOGRAPHY.button} border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100`}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading organization structure...
          </div>
        ) : departments.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No departments found.
          </div>
        ) : (
          <div className="space-y-4 bg-slate-50 p-4 sm:p-5">
            {departments.map((department) => {
              const subDepartments = department.subDepartments || [];
              const teamCount = subDepartments.reduce(
                (total, subDepartment) =>
                  total + (subDepartment.teams || []).length,
                0
              );
              const departmentExpanded = expandedDepartments.has(department._id);

              return (
                <article
                  key={department._id}
                  className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm"
                >
                  {/* Level 1: Department */}
                  <div className="border-l-4 border-blue-600 bg-blue-50/80 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleDepartment(department._id)}
                          aria-label={departmentExpanded ? "Collapse department" : "Expand department"}
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-800 hover:bg-blue-100"
                        >
                          <Chevron expanded={departmentExpanded} />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-blue-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                              Department
                            </span>
                            <h3 className={TYPOGRAPHY.departmentTitle}>
                              {department.name}
                            </h3>
                            <StatusBadge isActive={department.isActive} />
                          </div>

                          <p className="mt-2 text-sm leading-5 text-blue-900/70">
                            {department.description || "No description available"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-blue-900/70">
                            <span>{subDepartments.length} sub-departments</span>
                            <span>{teamCount} teams</span>
                            <span>Manager: {department.manager?.name || "Not assigned"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2 pl-11 sm:pl-0">
                        <button
                          type="button"
                          onClick={() => openEdit(department)}
                          className={`${TYPOGRAPHY.button} border border-blue-300 bg-white text-blue-800 hover:bg-blue-100`}
                        >
                          Edit
                        </button>
                        <StatusAction unit={department} onToggle={toggleUnitStatus} />
                      </div>
                    </div>
                  </div>

                  {/* Level 2: Sub-departments */}
                  {departmentExpanded && (
                    <div className="space-y-3 border-t border-blue-100 bg-violet-50/40 p-3 sm:p-4">
                      {subDepartments.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-violet-200 bg-white p-4 text-center text-sm text-slate-500">
                          No sub-departments added yet.
                        </p>
                      ) : (
                        subDepartments.map((subDepartment) => {
                          const teams = subDepartment.teams || [];
                          const subExpanded = expandedSubDepartments.has(subDepartment._id);

                          return (
                            <div
                              key={subDepartment._id}
                              className="overflow-hidden rounded-xl border border-violet-200 bg-white"
                            >
                              <div className="border-l-4 border-violet-500 bg-violet-50 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                  <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <button
                                      type="button"
                                      onClick={() => toggleSubDepartment(subDepartment._id)}
                                      aria-label={subExpanded ? "Collapse sub-department" : "Expand sub-department"}
                                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-white text-violet-800 hover:bg-violet-100"
                                    >
                                      <Chevron expanded={subExpanded} />
                                    </button>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-md bg-violet-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                                          Sub-department
                                        </span>
                                        <h4 className={TYPOGRAPHY.subDepartmentTitle}>
                                          {subDepartment.name}
                                        </h4>
                                        <StatusBadge isActive={subDepartment.isActive} />
                                      </div>

                                      <p className="mt-2 text-sm leading-5 text-violet-900/70">
                                        {subDepartment.description || "No description available"}
                                      </p>

                                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-violet-900/70">
                                        <span>{teams.length} teams</span>
                                        <span>Manager: {subDepartment.manager?.name || "Not assigned"}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 pl-10 sm:pl-0">
                                    <StatusAction unit={subDepartment} onToggle={toggleUnitStatus} />
                                  </div>
                                </div>
                              </div>

                              {/* Level 3: Teams */}
                              {subExpanded && (
                                <div className="space-y-2 border-t border-violet-100 bg-teal-50/50 p-3 sm:p-4">
                                  {teams.length === 0 ? (
                                    <p className="rounded-lg border border-dashed border-teal-200 bg-white p-4 text-sm text-slate-500">
                                      No teams added yet.
                                    </p>
                                  ) : (
                                    teams.map((team) => (
                                      <div
                                        key={team._id}
                                        className="flex flex-col justify-between gap-3 rounded-lg border border-teal-200 border-l-4 border-l-teal-500 bg-white p-3 sm:flex-row sm:items-center"
                                      >
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-md bg-teal-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                                              Team
                                            </span>
                                            <p className={TYPOGRAPHY.teamTitle}>
                                              {team.name}
                                            </p>
                                            <StatusBadge isActive={team.isActive} />
                                          </div>

                                          <p className="mt-2 text-sm leading-5 text-slate-600">
                                            {team.description || "No description available"}
                                          </p>

                                          <p className="mt-1 text-xs text-slate-500">
                                            Manager: {team.manager?.name || "Not assigned"}
                                          </p>
                                        </div>

                                        <div className="flex shrink-0 pl-0 sm:pl-3">
                                          <StatusAction unit={team} onToggle={toggleUnitStatus} />
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {!departmentExpanded && (
                    <button
                      type="button"
                      onClick={() => toggleDepartment(department._id)}
                      className="w-full border-t border-blue-100 bg-white px-5 py-3 text-left text-xs font-semibold text-blue-800 hover:bg-blue-50"
                    >
                      View {subDepartments.length} sub-departments and {teamCount} teams
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Create / Edit Department modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-blue-100 bg-blue-50 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-blue-950">
                    {editing ? "Edit Department" : "Add Organization Unit"}
                  </h2>
                  <p className="mt-1 text-xs text-blue-800/70">
                    Create a department, sub-department or team.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Close modal"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-white hover:text-slate-800"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {!editing && (
                <>
                  <div>
                    <label className={TYPOGRAPHY.label}>Organization Level *</label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="Department">Department</option>
                      <option value="Sub-department">Sub-department</option>
                      <option value="Team">Team</option>
                    </select>
                  </div>

                  {form.type !== "Department" && (
                    <div>
                      <label className={TYPOGRAPHY.label}>
                        {form.type === "Sub-department" ? "Parent Department *" : "Parent Sub-department *"}
                      </label>
                      <select
                        name="parent"
                        value={form.parent}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">
                          {form.type === "Sub-department"
                            ? "Select a department"
                            : "Select a sub-department"}
                        </option>

                        {form.type === "Sub-department" &&
                          departments
                            .filter((department) => department.isActive)
                            .map((department) => (
                              <option key={department._id} value={department._id}>
                                {department.name}
                              </option>
                            ))}

                        {form.type === "Team" &&
                          departments.flatMap((department) =>
                            (department.subDepartments || [])
                              .filter((subDepartment) => subDepartment.isActive)
                              .map((subDepartment) => (
                                <option key={subDepartment._id} value={subDepartment._id}>
                                  {department.name} → {subDepartment.name}
                                </option>
                              ))
                          )}
                      </select>
                      <p className="mt-1.5 text-xs text-slate-500">
                        {form.type === "Sub-department"
                          ? "Choose the department this sub-department belongs to."
                          : "Choose the sub-department this team belongs to."}
                      </p>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className={TYPOGRAPHY.label}>
                  {editing ? "Department Name *" : `${form.type} Name *`}
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="e.g. Engineering"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className={TYPOGRAPHY.label}>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  maxLength={500}
                  placeholder="What does this department do?"
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {(editing || form.type === "Department") && (
              <div>
                <label className={TYPOGRAPHY.label}>Department Manager</label>
                <select
                  name="manager"
                  value={form.manager}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">No manager assigned</option>
                  {employees
                    .filter((employee) => employee.isActive && employee.role === "employee")
                    .map((employee) => (
                      <option
                        key={employee._id || employee.id}
                        value={employee._id || employee.id}
                      >
                        {employee.name} — {employee.email}
                      </option>
                    ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  Only active employees can be assigned as managers.
                </p>
              </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className={`${TYPOGRAPHY.button} border border-slate-300 bg-white px-5 text-slate-700 hover:bg-slate-50`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`${TYPOGRAPHY.button} bg-blue-700 px-5 text-white hover:bg-blue-800`}
                >
                  {saving
                    ? "Saving..."
                    : editing
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
