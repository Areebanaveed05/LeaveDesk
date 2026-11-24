
import { useCallback, useEffect, useState } from "react";
import api from "../api";

const getTodayDate = () => {
  const now = new Date();

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
};

const formatTime = (date) => {
  if (!date) return "--";

  return new Date(date).toLocaleTimeString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDuration = (minutes = 0) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
};

const formatDate = (date) => {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getStatusStyle = (status) => {
  const styles = {
    Completed: "bg-green-100 text-green-700",
    "Checked In": "bg-blue-100 text-blue-700",
    Incomplete: "bg-amber-100 text-amber-700",
    Absent: "bg-red-100 text-red-700",
    "Day Off": "bg-slate-100 text-slate-600",
    "On Leave": "bg-purple-100 text-purple-700",
    "Half Day": "bg-orange-100 text-orange-700",
    "Work From Home": "bg-cyan-100 text-cyan-700",
    "Not Checked In": "bg-slate-100 text-slate-600",
  };

  return styles[status] || "bg-slate-100 text-slate-600";
};

// An employee is present if they have at least one check-in session.
const isEmployeePresent = (record) => {
  return (
    Array.isArray(record.sessions) &&
    record.sessions.some((session) => Boolean(session.checkIn))
  );
};

const isOnLeave = (record) =>
  ["On Leave", "Half Day", "Work From Home"].includes(record.status);

const isDayOff = (record) => record.status === "Day Off";

function SummaryCard({ title, value, description, color, icon }) {
  return (
    <div className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <h3 className="mt-3 text-3xl font-bold text-slate-800">
            {value}
          </h3>

          <p className="mt-2 text-xs text-slate-400">{description}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function AttendanceSessions({ sessions = [] }) {
  if (!sessions.length) {
    return <span className="text-sm text-slate-400">No sessions</span>;
  }

  return (
    <div className="space-y-2">
      {sessions.map((session, index) => (
        <div
          key={session._id || index}
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <span className="rounded-lg bg-blue-50 px-2 py-1 font-medium text-blue-700">
            {formatTime(session.checkIn)}
          </span>

          <span className="text-slate-400">to</span>

          <span className="rounded-lg bg-slate-100 px-2 py-1 font-medium text-slate-700">
            {formatTime(session.checkOut)}
          </span>

          {!session.checkOut && (
            <span className="text-xs font-semibold text-blue-600">
              Active
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function AttendanceFilterTabs({
  activeFilter,
  onFilterChange,
  counts,
}) {
  const filters = [
    {
      id: "All",
      label: "All",
      count: counts.all,
      activeClass: "bg-[#52749B] text-white border-[#52749B]",
    },
    {
      id: "Present",
      label: "Present",
      count: counts.present,
      activeClass: "bg-green-600 text-white border-green-600",
    },
    {
      id: "Absent",
      label: "Absent",
      count: counts.absent,
      activeClass: "bg-red-600 text-white border-red-600",
    },
    {
      id: "Leave",
      label: "Leave / WFH",
      count: counts.leave,
      activeClass: "bg-purple-600 text-white border-purple-600",
    },
    {
      id: "Day Off",
      label: "Day Off",
      count: counts.dayOff,
      activeClass: "bg-slate-600 text-white border-slate-600",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;

        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onFilterChange(filter.id)}
            aria-pressed={isActive}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              isActive
                ? filter.activeClass
                : "border-[#DCE6EF] bg-white text-slate-600 hover:border-[#AFC4D9] hover:bg-[#F0F5FA]"
            }`}
          >
            {filter.label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {filter.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function AdminAttendance() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/attendance", {
        params: {
          date: selectedDate,
        },
      });

      setAttendanceData(response.data);
    } catch (err) {
      console.error("Attendance fetch error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load attendance records. Please try again."
      );

      setAttendanceData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Reset the selected filter when the date changes.
  useEffect(() => {
    setActiveFilter("All");
  }, [selectedDate]);

  const summary = attendanceData?.summary;
  const records = attendanceData?.attendance || [];

  // Calculate counts from the actual attendance records.
  const presentRecords = records.filter(isEmployeePresent);

  const absentRecords = records.filter(
    (record) => record.status === "Absent"
  );

  const leaveRecords = records.filter(isOnLeave);
  const dayOffRecords = records.filter(isDayOff);

  const filterCounts = {
    all: records.length,
    present: presentRecords.length,
    absent: absentRecords.length,
    leave: leaveRecords.length,
    dayOff: dayOffRecords.length,
  };

  // Apply the selected category filter to the table.
  const filteredRecords = records.filter((record) => {
    if (activeFilter === "Present") return isEmployeePresent(record);
    if (activeFilter === "Absent") return record.status === "Absent";
    if (activeFilter === "Leave") return isOnLeave(record);
    if (activeFilter === "Day Off") return isDayOff(record);
    return true;
  });

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#789BC5]">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-800">
            Attendance
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Monitor employee check-ins, working hours and daily attendance.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAttendance}
          disabled={loading}
          className="rounded-xl border border-[#DCE6EF] bg-white px-5 py-3 text-sm font-semibold text-[#52749B] transition hover:bg-[#F0F5FA] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {/* Date Selector */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-800">
            Daily Attendance Records
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select a date to view employee attendance.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label
            htmlFor="attendance-date"
            className="text-sm font-semibold text-slate-600"
          >
            Select Date
          </label>

          <input
            id="attendance-date"
            type="date"
            value={selectedDate}
            max={getTodayDate()}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#789BC5] focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-red-600">{error}</p>

          <button
            type="button"
            onClick={fetchAttendance}
            className="text-sm font-bold text-red-700 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="rounded-2xl border border-[#E2EAF2] bg-white py-16 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#DCE6EF] border-t-[#52749B]" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading attendance records...
          </p>
        </div>
      ) : (
        attendanceData && (
          <>
            {/* Selected Date */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {formatDate(attendanceData.date)}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {attendanceData.isWeekend
                    ? "Weekend - No regular working hours required"
                    : "Daily shift requirement: 8 hours"}
                </p>
              </div>

              {attendanceData.isWeekend && (
                <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
                  Day Off
                </span>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Total Employees"
                value={summary?.totalEmployees ?? 0}
                description="Active employees"
                color="bg-blue-50 text-blue-600"
                icon="👥"
              />

              <SummaryCard
                title="Present"
                value={summary?.present ?? 0}
                description="Employees who checked in"
                color="bg-green-50 text-green-600"
                icon="✓"
              />

              <SummaryCard
                title="Absent"
                value={summary?.absent ?? 0}
                description="Employees without attendance"
                color="bg-red-50 text-red-600"
                icon="✕"
              />

              <SummaryCard
                title="Currently Checked In"
                value={summary?.currentlyCheckedIn ?? 0}
                description="Employees currently working"
                color="bg-purple-50 text-purple-600"
                icon="◷"
              />
            </div>

            {/* Hours Summary */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#E2EAF2] bg-white p-5">
                <p className="text-sm font-medium text-slate-500">
                  Total Worked Hours
                </p>

                <h3 className="mt-3 text-2xl font-bold text-green-600">
                  {formatDuration(summary?.totalWorkedMinutes)}
                </h3>
              </div>

              <div className="rounded-2xl border border-[#E2EAF2] bg-white p-5">
                <p className="text-sm font-medium text-slate-500">
                  Total Shortage
                </p>

                <h3 className="mt-3 text-2xl font-bold text-amber-600">
                  {formatDuration(summary?.totalShortageMinutes)}
                </h3>
              </div>

              <div className="rounded-2xl border border-[#E2EAF2] bg-white p-5">
                <p className="text-sm font-medium text-slate-500">
                  Total Extra Hours
                </p>

                <h3 className="mt-3 text-2xl font-bold text-blue-600">
                  {formatDuration(summary?.totalExtraMinutes)}
                </h3>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-hidden rounded-2xl border border-[#E2EAF2] bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-[#E8EEF4] bg-[#FBFCFE] p-5">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      Employee Attendance
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Showing {filteredRecords.length} of {records.length} employee records
                    </p>
                  </div>

                  <span className="w-fit rounded-full border border-[#DCE6EF] bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                    {formatDate(attendanceData.date)}
                  </span>
                </div>

                {/* Filter by attendance and leave category */}
                <AttendanceFilterTabs
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  counts={filterCounts}
                />
              </div>

              {filteredRecords.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-4xl">📋</p>

                  <h3 className="mt-3 font-semibold text-slate-700">
                    {activeFilter === "Present"
                      ? "No present employees"
                      : activeFilter === "Absent"
                        ? "No absent employees"
                        : activeFilter === "Leave"
                          ? "No employees on leave or WFH"
                          : activeFilter === "Day Off"
                            ? "No day-off records"
                            : "No employees found"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {activeFilter === "Present"
                      ? "No employees have checked in on this date."
                      : activeFilter === "Absent"
                        ? "There are no absent employees on this date."
                        : activeFilter === "Leave"
                          ? "Approved leave and work-from-home records will appear here."
                          : activeFilter === "Day Off"
                            ? "No weekend or day-off records are available."
                            : "There are no active employee records."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left">
                    <thead className="bg-[#F8FAFC]">
                      <tr className="text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-4 font-bold">Employee</th>
                        <th className="px-5 py-4 font-bold">Department</th>
                        <th className="px-5 py-4 font-bold">Check In / Out</th>
                        <th className="px-5 py-4 font-bold">Worked</th>
                        <th className="px-5 py-4 font-bold">Required</th>
                        <th className="px-5 py-4 font-bold">Shortage</th>
                        <th className="px-5 py-4 font-bold">Extra</th>
                        <th className="px-5 py-4 font-bold">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E8EEF4]">
                      {filteredRecords.map((record) => (
                        <tr
                          key={record.employee.id}
                          className="transition hover:bg-[#FAFCFE]"
                        >
                          {/* Employee */}
                          <td className="px-5 py-5">
                            <p className="font-semibold text-slate-800">
                              {record.employee.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {record.employee.email}
                            </p>

                            {record.employee.designation && (
                              <p className="mt-1 text-xs text-slate-500">
                                {record.employee.designation}
                              </p>
                            )}
                          </td>

                          {/* Department */}
                          <td className="px-5 py-5">
                            <p className="text-sm font-medium text-slate-700">
                              {record.employee.department || "--"}
                            </p>

                            {record.employee.subDepartment && (
                              <p className="mt-1 text-xs text-slate-400">
                                {record.employee.subDepartment}
                              </p>
                            )}
                          </td>

                          {/* Sessions */}
                          <td className="px-5 py-5">
                            <AttendanceSessions
                              sessions={record.sessions}
                            />
                          </td>

                          {/* Worked Hours */}
                          <td className="px-5 py-5">
                            <span className="font-semibold text-slate-700">
                              {formatDuration(record.workedMinutes)}
                            </span>
                          </td>

                          {/* Required Hours */}
                          <td className="px-5 py-5">
                            <span className="text-sm text-slate-600">
                              {formatDuration(record.requiredMinutes)}
                            </span>
                          </td>

                          {/* Shortage */}
                          <td className="px-5 py-5">
                            <span
                              className={`text-sm font-semibold ${
                                record.shortageMinutes > 0
                                  ? "text-amber-600"
                                  : "text-green-600"
                              }`}
                            >
                              {formatDuration(record.shortageMinutes)}
                            </span>
                          </td>

                          {/* Extra */}
                          <td className="px-5 py-5">
                            <span className="text-sm font-semibold text-blue-600">
                              {formatDuration(record.extraMinutes)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-5">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                                record.status
                              )}`}
                            >
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
