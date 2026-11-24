
import { useCallback, useEffect, useState } from "react";
import api from "../api";

const INITIAL_FORM = {
  name: "",
  email: "",
  subDepartment: "",
  designation: "",
  organizationTeams: [],
  temporaryPassword: "",
  annualAllowance: 20,
  sickAllowance: 10,
};

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [organizationTeams, setOrganizationTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [departmentDetailsEmployee, setDepartmentDetailsEmployee] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const [saving, setSaving] = useState(false);
  const [resetEmployee, setResetEmployee] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Fetch active sub-departments from the three-level organization structure.
  const fetchSubDepartments = useCallback(async () => {
    try {
      const { data } = await api.get("/organization?type=Sub-department");
      setSubDepartments(
        Array.isArray(data) ? data.filter((unit) => unit.isActive) : [],
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load sub-departments.",
      );
    }
  }, []);

  // Fetch active organizational Teams for employee membership assignment.
  const fetchOrganizationTeams = useCallback(async () => {
    try {
      const { data } = await api.get("/organization?type=Team");
      setOrganizationTeams(
        Array.isArray(data) ? data.filter((unit) => unit.isActive) : [],
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load organizational teams.",
      );
    }
  }, []);

  // Fetch all employees
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/users");

      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load employees.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchSubDepartments();
    fetchOrganizationTeams();
  }, [fetchEmployees, fetchSubDepartments, fetchOrganizationTeams]);

  // Open create employee modal
  const openCreateModal = () => {
    setModalMode("create");
    setSelectedEmployee(null);
    setForm({ ...INITIAL_FORM });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  // Open edit employee modal
  const openEditModal = (employee) => {
    setModalMode("edit");
    setSelectedEmployee(employee);

    setForm({
      name: employee.name || "",
      email: employee.email || "",
      subDepartment: employee.subDepartment?.id || employee.subDepartment?._id || "",
      designation: employee.designation || "",
      organizationTeams: (employee.organizationTeams || []).map(
        (team) => team.id || team._id
      ),
      temporaryPassword: "",
      annualAllowance: employee.leaveAllowance?.annual ?? 20,
      sickAllowance: employee.leaveAllowance?.sick ?? 10,
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  // Update form fields
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Create or update employee
  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (modalMode === "create") {
        await api.post("/users", {
          name: form.name.trim(),
          email: form.email.trim(),
          subDepartment: form.subDepartment,
          designation: form.designation.trim(),
          organizationTeams: form.organizationTeams,
          temporaryPassword: form.temporaryPassword,
          annualAllowance: Number(form.annualAllowance),
          sickAllowance: Number(form.sickAllowance),
        });

        setSuccess("Employee account created successfully.");
      } else {
        await api.patch(`/users/${selectedEmployee.id}`, {
          name: form.name.trim(),
          subDepartment: form.subDepartment,
          designation: form.designation.trim(),
          organizationTeams: form.organizationTeams,
          annualAllowance: Number(form.annualAllowance),
          sickAllowance: Number(form.sickAllowance),
        });

        setSuccess("Employee details updated successfully.");
      }

      setShowModal(false);
      await fetchEmployees();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save employee details.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Activate or deactivate employee
  const handleToggleStatus = async (employee) => {
    const action = employee.isActive ? "deactivate" : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${employee.name}'s account?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.patch(`/users/${employee.id}`, {
        isActive: !employee.isActive,
      });

      setSuccess(
        `${employee.name}'s account has been ${action}d successfully.`,
      );

      await fetchEmployees();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update account status.",
      );
    }
  };

  // Reset employee temporary password
  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (resetPassword.length < 8) {
      setError("Temporary password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.patch(
        `/users/${resetEmployee.id}/reset-password`,
        { temporaryPassword: resetPassword },
      );

      setSuccess(
        `Temporary password updated for ${resetEmployee.name}.`,
      );

      setResetEmployee(null);
      setResetPassword("");
      setShowPassword(false);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to reset employee password.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter((employee) => {
    const searchValue = search.toLowerCase();

    const matchesSearch =
      employee.name?.toLowerCase().includes(searchValue) ||
      employee.email?.toLowerCase().includes(searchValue) ||
      employee.department?.toLowerCase().includes(searchValue) ||
      employee.subDepartment?.name?.toLowerCase().includes(searchValue) ||
      employee.designation?.toLowerCase().includes(searchValue) ||
      employee.organizationTeams?.some((team) =>
        team.name?.toLowerCase().includes(searchValue)
      );

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" && employee.isActive) ||
      (statusFilter === "Inactive" && !employee.isActive);

    return matchesSearch && matchesStatus;
  });

  const activeCount = employees.filter((e) => e.isActive).length;
  const inactiveCount = employees.length - activeCount;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Page Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#52749B]">
            Administration
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Employee Management
          </h1>

          <p className="mt-2 text-slate-500">
            Create, view and manage your organization's employee accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8]"
        >
          + Add Employee
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Employee Statistics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total Employees
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {employees.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Active Employees
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Inactive Employees
          </p>
          <p className="mt-2 text-3xl font-bold text-red-500">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or department..."
          className="min-w-0 flex-1 rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none transition focus:border-[#789BC5] focus:ring-2 focus:ring-blue-100"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm text-slate-600 outline-none focus:border-[#789BC5]"
        >
          <option value="All">All Employees</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* Employee Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E2EAF2] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E8EEF4] px-6 py-5">
          <div>
            <h2 className="font-bold text-slate-900">
              All Employees
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredEmployees.length} employee(s) found
            </p>
          </div>

          <button
            type="button"
            onClick={fetchEmployees}
            disabled={loading}
            className="rounded-lg border border-[#DCE6EF] px-3 py-2 text-sm font-medium text-slate-600 hover:bg-[#F0F5FA] disabled:opacity-50"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading employees...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg font-semibold text-slate-700">
              No employees found
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or add a new employee.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Employee</th>
                  <th className="px-6 py-4 font-semibold">Department</th>
                  <th className="px-6 py-4 font-semibold">Leave Requests</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E8EEF4]">
                {filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="transition hover:bg-[#F8FAFC]"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">
                        {employee.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {employee.email}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <div className="min-w-[170px]">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Department
                        </p>

                        <button
                          type="button"
                          onClick={() => setDepartmentDetailsEmployee(employee)}
                          className="inline-flex max-w-full items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
                          aria-label={`View department details for ${employee.name}`}
                        >
                          <span className="truncate">
                            {employee.department || "Not assigned"}
                          </span>
                          <span aria-hidden="true" className="text-blue-500">
                            ↗
                          </span>
                        </button>
                        <p className="mt-1 text-xs text-slate-400">
                          Click to view details
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-700">
                        {employee.counts?.total ?? 0}
                      </span>

                      <p className="mt-1 text-xs text-slate-400">
                        {employee.counts?.pending ?? 0} pending
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          employee.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {employee.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(employee)}
                          className="rounded-lg border border-[#DCE6EF] px-3 py-2 text-xs font-semibold text-[#52749B] hover:bg-[#E8F0FA]"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(employee)}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                            employee.isActive
                              ? "border-red-200 text-red-600 hover:bg-red-50"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {employee.isActive ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setResetEmployee(employee);
                            setResetPassword("");
                            setShowPassword(false);
                            setError("");
                          }}
                          className="rounded-lg border border-[#DCE6EF] px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-[#F0F5FA]"
                        >
                          Reset Password
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

      {/* Create / Edit Employee Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {modalMode === "create"
                    ? "Create Employee Account"
                    : "Edit Employee Details"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {modalMode === "create"
                    ? "Enter the employee's account information."
                    : "Update the employee's information and leave allowance."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-slate-100"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {modalMode === "edit" && !selectedEmployee?.subDepartment && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  This employee has an older department-only record. Select a
                  sub-department below to complete their organizational
                  classification. You can also add their designation.
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="Enter employee name"
                  className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-[#789BC5] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  disabled={modalMode === "edit"}
                  placeholder="employee@company.com"
                  className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-[#789BC5] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
                />

                {modalMode === "edit" && (
                  <p className="mt-1 text-xs text-slate-400">
                    Email address cannot be changed here.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Sub-department
                </label>

                <select
                  name="subDepartment"
                  value={form.subDepartment}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#789BC5] focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select a sub-department</option>
                  {subDepartments.map((unit) => (
                    <option key={unit._id || unit.id} value={unit._id || unit.id}>
                      {unit.parent?.name ? `${unit.parent.name} — ` : ""}
                      {unit.name}
                    </option>
                  ))}
                  {form.subDepartment &&
                    !subDepartments.some(
                      (unit) => (unit._id || unit.id) === form.subDepartment,
                    ) && (
                      <option value={form.subDepartment}>
                        Previously assigned sub-department (inactive or unavailable)
                      </option>
                    )}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  Select this employee's sub-department. Department is filled
                  automatically from its parent department.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Designation
                </label>
                <input
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="e.g. Flutter Developer"
                  className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-[#789BC5] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Organizational Team Membership
                </label>
                <p className="mb-3 text-xs text-slate-500">
                  Select one or more permanent organizational teams for this employee.
                  Project membership will be selected separately when creating a project.
                </p>

                <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[#DCE6EF] p-3">
                  {organizationTeams.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No active organizational teams found.
                    </p>
                  ) : (
                    organizationTeams.map((team) => {
                      const teamId = team._id || team.id;
                      const checked = form.organizationTeams.includes(teamId);

                      return (
                        <label
                          key={teamId}
                          className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-[#F8FAFC]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setForm((previous) => ({
                                ...previous,
                                organizationTeams: event.target.checked
                                  ? [...previous.organizationTeams, teamId]
                                  : previous.organizationTeams.filter(
                                      (id) => id !== teamId
                                    ),
                              }));
                            }}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-700">
                              {team.name}
                            </span>
                            <span className="block text-xs text-slate-400">
                              {team.parent?.name || "Organization team"}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {form.organizationTeams.length} team(s) selected
                </p>
              </div>

              {modalMode === "create" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Temporary Password
                  </label>

                  <input
                    type="password"
                    name="temporaryPassword"
                    value={form.temporaryPassword}
                    onChange={handleChange}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-[#789BC5] focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Employee will be required to change this password after login.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Annual Leave Allowance
                  </label>

                  <input
                    type="number"
                    name="annualAllowance"
                    value={form.annualAllowance}
                    onChange={handleChange}
                    min="0"
                    max="365"
                    required
                    className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-[#789BC5] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Sick Leave Allowance
                  </label>

                  <input
                    type="number"
                    name="sickAllowance"
                    value={form.sickAllowance}
                    onChange={handleChange}
                    min="0"
                    max="365"
                    required
                    className="w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none focus:border-[#789BC5] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-xl border border-[#DCE6EF] px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : modalMode === "create"
                      ? "Create Employee"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Details Modal */}
      {departmentDetailsEmployee && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDepartmentDetailsEmployee(null);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setDepartmentDetailsEmployee(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="department-details-title"
            className="my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1D4ED8] via-[#356CCB] to-[#6D5CE7] px-6 py-6 text-white">
              <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 right-24 h-28 w-28 rounded-full bg-white/10" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                    Employee department
                  </p>
                  <h2
                    id="department-details-title"
                    className="mt-2 break-words text-2xl font-bold"
                  >
                    {departmentDetailsEmployee.name}
                  </h2>
                  <p className="mt-1 break-all text-sm text-blue-100">
                    {departmentDetailsEmployee.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDepartmentDetailsEmployee(null)}
                  aria-label="Close department details"
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl text-white transition hover:bg-white/25"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-xl text-blue-700">
                    ▦
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                      Department
                    </p>
                    <p className="mt-1 break-words text-lg font-bold text-slate-800">
                      {departmentDetailsEmployee.department || "Not assigned"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    ◈
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">
                    Sub-department
                  </p>
                  <p className="mt-1 break-words font-semibold text-violet-900">
                    {departmentDetailsEmployee.subDepartment?.name || "Not assigned"}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    ✦
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Designation
                  </p>
                  <p className="mt-1 break-words font-semibold text-emerald-900">
                    {departmentDetailsEmployee.designation || "Not added"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    ◉
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                      Organizational Teams
                    </p>
                    <p className="mt-0.5 text-xs text-amber-800">
                      Teams assigned to this employee
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {departmentDetailsEmployee.organizationTeams?.length ? (
                    departmentDetailsEmployee.organizationTeams.map((team) => (
                      <span
                        key={team.id || team._id || team.name}
                        className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-sm font-semibold text-amber-800 shadow-sm"
                      >
                        {team.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-amber-800">
                      No team assigned
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setDepartmentDetailsEmployee(null)}
                  className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetEmployee && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-xl font-bold text-slate-900">
              Reset Employee Password
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Set a new temporary password for{" "}
              <strong>{resetEmployee.name}</strong>.
            </p>

            <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  New Temporary Password
                </label>

                <div className="flex rounded-xl border border-[#DCE6EF] focus-within:border-[#789BC5] focus-within:ring-2 focus-within:ring-blue-100">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    minLength={8}
                    required
                    placeholder="At least 8 characters"
                    className="min-w-0 flex-1 rounded-l-xl px-4 py-3 text-sm outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="px-4 text-xs font-semibold text-[#52749B]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Employee will need to change this password after login.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmployee(null);
                    setResetPassword("");
                  }}
                  disabled={saving}
                  className="rounded-xl border border-[#DCE6EF] px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
                >
                  {saving ? "Updating..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
