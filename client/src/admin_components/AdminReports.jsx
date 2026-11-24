import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";

const CURRENT_YEAR = new Date().getFullYear();

const LEAVE_TYPES = [
  "Annual Leave",
  "Sick Leave",
  "Half Day",
  "Work From Home",
];

const STATUS_STYLES = {
  Pending: {
    background: "bg-amber-50",
    text: "text-amber-700",
    bar: "bg-amber-400",
  },
  Approved: {
    background: "bg-emerald-50",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
  },
  Rejected: {
    background: "bg-red-50",
    text: "text-red-600",
    bar: "bg-red-400",
  },
};

const DEPARTMENT_COLORS = [
  { bar: "bg-blue-500", light: "bg-blue-50", text: "text-blue-700" },
  { bar: "bg-violet-500", light: "bg-violet-50", text: "text-violet-700" },
  { bar: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-700" },
  { bar: "bg-amber-500", light: "bg-amber-50", text: "text-amber-700" },
  { bar: "bg-pink-500", light: "bg-pink-50", text: "text-pink-700" },
  { bar: "bg-cyan-500", light: "bg-cyan-50", text: "text-cyan-700" },
  { bar: "bg-indigo-500", light: "bg-indigo-50", text: "text-indigo-700" },
];

const formatNumber = (value) => {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? number : number.toFixed(1);
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || "");
};

const getRequestYear = (date) => {
  if (!date) return null;
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getUTCFullYear();
};

const normalizeArray = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

const emptyStats = (name) => ({
  name,
  total: 0,
  approved: 0,
  pending: 0,
  rejected: 0,
});

const incrementStatus = (stats, status) => {
  stats.total += 1;
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved") stats.approved += 1;
  else if (normalized === "pending") stats.pending += 1;
  else if (normalized === "rejected") stats.rejected += 1;
};

export default function AdminReports() {
  const [employees, setEmployees] = useState([]);
  const [requests, setRequests] = useState([]);
  const [organizationUnits, setOrganizationUnits] = useState([]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [employeesResponse, requestsResponse, organizationResponse] =
        await Promise.all([
          api.get("/users"),
          api.get("/requests"),
          api.get("/organization"),
        ]);

      setEmployees(
        normalizeArray(employeesResponse.data, ["employees"]).filter(
          (employee) => employee.role !== "admin"
        )
      );
      setRequests(normalizeArray(requestsResponse.data, ["requests"]));
      setOrganizationUnits(
        normalizeArray(organizationResponse.data, ["organizationUnits", "units"])
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load report data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const departments = useMemo(
    () => organizationUnits.filter((unit) => unit.type === "Department"),
    [organizationUnits]
  );
  const subDepartments = useMemo(
    () => organizationUnits.filter((unit) => unit.type === "Sub-department"),
    [organizationUnits]
  );

  const employeeOrganization = useMemo(() => {
    const map = new Map();
    const subDepartmentById = new Map(
      subDepartments.map((unit) => [getId(unit), unit])
    );

    employees.forEach((employee) => {
      const subDepartmentId = getId(employee.subDepartment);
      const subDepartment =
        typeof employee.subDepartment === "object"
          ? employee.subDepartment
          : subDepartmentById.get(subDepartmentId);
      const departmentId =
        getId(subDepartment?.parent) || getId(employee.departmentUnit);

      map.set(getId(employee), {
        departmentId,
        subDepartmentId,
        departmentName:
          (typeof subDepartment?.parent === "object" && subDepartment.parent.name) ||
          employee.departmentName ||
          employee.department ||
          "Unassigned",
        subDepartmentName: subDepartment?.name || "Sub-department not assigned",
      });
    });
    return map;
  }, [employees, subDepartments]);

  const yearlyRequests = useMemo(
    () =>
      requests.filter(
        (request) => getRequestYear(request.startDate) === Number(selectedYear)
      ),
    [requests, selectedYear]
  );

  const report = useMemo(() => {
    const total = yearlyRequests.length;
    const pendingRequests = yearlyRequests.filter((r) => r.status === "Pending");
    const approvedRequests = yearlyRequests.filter((r) => r.status === "Approved");
    const rejectedRequests = yearlyRequests.filter((r) => r.status === "Rejected");
    const getDays = (request) => Number(request.days) || 0;
    const approvedDays = approvedRequests.reduce((sum, request) => sum + getDays(request), 0);
    const totalRequestedDays = yearlyRequests.reduce((sum, request) => sum + getDays(request), 0);

    const statusData = [
      { name: "Pending", count: pendingRequests.length },
      { name: "Approved", count: approvedRequests.length },
      { name: "Rejected", count: rejectedRequests.length },
    ];

    const typeData = LEAVE_TYPES.map((type) => {
      const matching = yearlyRequests.filter((request) => request.type === type);
      return {
        name: type,
        count: matching.length,
        days: matching.reduce((sum, request) => sum + getDays(request), 0),
      };
    });

    // Build the hierarchy from current OrganizationUnit records.
    // Requests are attributed through the employee's current sub-department.
    const departmentStats = new Map();
    departments.forEach((department) => {
      departmentStats.set(getId(department), {
        ...emptyStats(department.name),
        id: getId(department),
        subDepartments: new Map(),
      });
    });

    subDepartments.forEach((subDepartment) => {
      const parentId = getId(subDepartment.parent);
      const parentStats = departmentStats.get(parentId);
      if (parentStats) {
        parentStats.subDepartments.set(getId(subDepartment), {
          ...emptyStats(subDepartment.name),
          id: getId(subDepartment),
        });
      }
    });

    const legacyStats = new Map();
    yearlyRequests.forEach((request) => {
      const employeeId = getId(request.employee);
      const org = employeeOrganization.get(employeeId);
      if (org?.departmentId && departmentStats.has(org.departmentId)) {
        const departmentStatsItem = departmentStats.get(org.departmentId);
        incrementStatus(departmentStatsItem, request.status);
        const subStats = departmentStatsItem.subDepartments.get(org.subDepartmentId);
        if (subStats) incrementStatus(subStats, request.status);
      } else {
        // Keep historical requests visible if their employee has no current
        // organization assignment or their old department has no matching unit.
        const legacyName = request.department || "Unassigned / Legacy";
        if (!legacyStats.has(legacyName)) legacyStats.set(legacyName, emptyStats(legacyName));
        incrementStatus(legacyStats.get(legacyName), request.status);
      }
    });

    const departmentData = [
      ...Array.from(departmentStats.values()).map((department) => ({
        ...department,
        subDepartments: Array.from(department.subDepartments.values()).sort(
          (a, b) => b.total - a.total || a.name.localeCompare(b.name)
        ),
      })),
      ...Array.from(legacyStats.values()).map((item) => ({
        ...item,
        id: `legacy-${item.name}`,
        subDepartments: [],
        legacy: true,
      })),
    ].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    const monthlyData = Array.from({ length: 12 }, (_, index) => {
      const monthRequests = yearlyRequests.filter((request) => {
        const date = new Date(request.startDate);
        return !Number.isNaN(date.getTime()) && date.getUTCMonth() === index;
      });
      return {
        month: new Date(Date.UTC(Number(selectedYear), index, 1)).toLocaleString(
          "en-US",
          { month: "short", timeZone: "UTC" }
        ),
        count: monthRequests.length,
        approved: monthRequests.filter((request) => request.status === "Approved").length,
      };
    });

    return {
      total,
      pending: pendingRequests.length,
      approved: approvedRequests.length,
      rejected: rejectedRequests.length,
      approvedDays,
      totalRequestedDays,
      statusData,
      typeData,
      departmentData,
      monthlyData,
    };
  }, [yearlyRequests, selectedYear, departments, subDepartments, employeeOrganization]);

  const maxMonthlyRequests = Math.max(...report.monthlyData.map((item) => item.count), 1);
  const maxTypeRequests = Math.max(...report.typeData.map((item) => item.count), 1);

  const years = useMemo(
    () =>
      Array.from(
        new Set([
          CURRENT_YEAR,
          ...requests.map((request) => getRequestYear(request.startDate)).filter((year) => year !== null),
        ])
      ).sort((a, b) => b - a),
    [requests]
  );

  const totalDepartmentRequests = report.departmentData.reduce(
    (sum, department) => sum + department.total,
    0
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#52749B]">
            Administration
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Reports &amp; Analytics
          </h1>
          <p className="mt-2 text-slate-500">
            Analyze employee leave activity and organizational trends.
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            className="rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-[#789BC5]"
            aria-label="Select report year"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={fetchReportData}
            disabled={loading}
            className="rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-[#F0F5FA] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          <span>{error}</span>
          <button type="button" onClick={fetchReportData} className="shrink-0 font-semibold underline">Try again</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Employees" value={employees.length} description="Registered employee accounts" icon="♙" loading={loading} />
        <StatCard title="Total Requests" value={report.total} description={`Leave requests in ${selectedYear}`} icon="▤" loading={loading} />
        <StatCard title="Approved Requests" value={report.approved} description="Successfully approved" icon="✓" loading={loading} />
        <StatCard title="Approved Leave Days" value={formatNumber(report.approvedDays)} description="Total approved leave days" icon="◷" loading={loading} />
      </div>

      <section className="mt-8 rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">Request Status Overview</h2>
          <p className="mt-1 text-sm text-slate-500">Distribution of leave requests by status.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {report.statusData.map((item) => {
            const style = STATUS_STYLES[item.name];
            const percentage = report.total > 0 ? (item.count / report.total) * 100 : 0;
            return (
              <div key={item.name} className="rounded-xl border border-[#E8EEF4] p-5">
                <div className="flex items-center justify-between">
                  <span className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${style.background} ${style.text}`}>{item.name}</span>
                  <span className="text-xl font-bold text-slate-800">{loading ? "—" : item.count}</span>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${style.bar} transition-all`} style={{ width: `${percentage}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-400">{percentage.toFixed(1)}% of all requests</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">Monthly Leave Requests</h2>
          <p className="mt-1 text-sm text-slate-500">Number of requests submitted in each month of {selectedYear}.</p>
        </div>
        <div className="flex h-64 items-end gap-2 border-b border-l border-[#E8EEF4] px-2 pb-0 sm:gap-4 sm:px-4">
          {report.monthlyData.map((item) => {
            const height = item.count > 0 ? (item.count / maxMonthlyRequests) * 100 : 0;
            const approvedPercentage = item.count > 0 ? (item.approved / item.count) * 100 : 0;
            return (
              <div key={item.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                <span className="mb-2 text-xs font-semibold text-slate-600">{loading ? "" : item.count}</span>
                <div className="flex w-full max-w-10 items-end overflow-hidden rounded-t-md bg-[#E8F0FA]" style={{ height: `${height}%` }} title={`${item.count} requests`}>
                  <div className="w-full rounded-t-md bg-[#52749B]" style={{ height: `${approvedPercentage}%` }} />
                </div>
                <span className="mt-3 text-[10px] font-medium text-slate-500 sm:text-xs">{item.month}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-5 text-xs text-slate-500">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#E8F0FA]" />All Requests</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#52749B]" />Approved Requests</span>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Leave Type Breakdown</h2>
          <p className="mt-1 text-sm text-slate-500">Requests by leave category.</p>
          <div className="mt-7 space-y-6">
            {report.typeData.map((item, index) => {
              const colors = DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length];
              return (
                <div key={item.name}>
                  <div className="mb-2 flex justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                    <span className="text-sm font-semibold text-slate-600">{loading ? "—" : item.count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${colors.bar} transition-all`} style={{ width: `${(item.count / maxTypeRequests) * 100}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{formatNumber(item.days)} requested days</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Organization Leave Overview</h2>
              <p className="mt-1 text-sm text-slate-500">Leave requests grouped by department and sub-department.</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">{totalDepartmentRequests} categorized requests</span>
          </div>

          {report.departmentData.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-400">{loading ? "Loading organization data..." : "No organization data available."}</p>
          ) : (
            <div className="mt-6 max-h-[620px] space-y-4 overflow-y-auto pr-1">
              {report.departmentData.map((department, index) => {
                const colors = DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length];
                const departmentPercentage = totalDepartmentRequests > 0 ? (department.total / totalDepartmentRequests) * 100 : 0;
                return (
                  <div key={department.id || department.name} className="rounded-xl border border-[#E8EEF4] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${colors.bar}`} />
                          <h3 className="font-semibold text-slate-800">{department.name}</h3>
                          {department.legacy && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Legacy data</span>}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{department.total} request(s) · {departmentPercentage.toFixed(1)}% of categorized requests</p>
                      </div>
                      <span className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold ${colors.light} ${colors.text}`}>{department.total}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${colors.bar} transition-all`} style={{ width: `${departmentPercentage}%` }} />
                    </div>
                    {department.subDepartments.length > 0 && (
                      <div className="mt-4 space-y-3 border-l-2 border-slate-100 pl-3">
                        {department.subDepartments.map((subDepartment, subIndex) => {
                          const subPercentage = department.total > 0 ? (subDepartment.total / department.total) * 100 : 0;
                          return (
                            <div key={subDepartment.id || subDepartment.name}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-700">{subDepartment.name}</p>
                                  <p className="mt-0.5 text-[11px] text-slate-400">
                                    Approved: <span className="font-semibold text-emerald-600">{subDepartment.approved}</span>
                                    <span className="mx-1">·</span> Pending: <span className="font-semibold text-amber-600">{subDepartment.pending}</span>
                                    <span className="mx-1">·</span> Rejected: <span className="font-semibold text-red-500">{subDepartment.rejected}</span>
                                  </p>
                                </div>
                                <span className="shrink-0 text-sm font-bold text-violet-700">{subDepartment.total}</span>
                              </div>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${subPercentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                      <span>Approved <b className="text-emerald-600">{department.approved}</b></span>
                      <span>Pending <b className="text-amber-600">{department.pending}</b></span>
                      <span>Rejected <b className="text-red-500">{department.rejected}</b></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-4 text-[11px] leading-5 text-slate-400">
            Requests are grouped using each employee's current department and sub-department assignment. Employees without a current organization assignment are shown separately under their saved request department.
          </p>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Annual Summary</h2>
        <p className="mt-1 text-sm text-slate-500">Overall leave activity for {selectedYear}.</p>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <SummaryItem label="Total Requested Days" value={formatNumber(report.totalRequestedDays)} />
          <SummaryItem label="Approved Leave Days" value={formatNumber(report.approvedDays)} />
          <SummaryItem label="Rejected Requests" value={report.rejected} />
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, description, icon, loading }) {
  return (
    <div className="rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{loading ? "—" : value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F0FA] text-2xl text-[#52749B]">{icon}</div>
      </div>
      <p className="mt-4 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
