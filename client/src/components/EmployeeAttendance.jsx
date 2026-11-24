
import { useCallback, useEffect, useState } from "react";
import api from "../api";

const getPakistanDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

// Convert a leave date to a Pakistan calendar date (YYYY-MM-DD).
// Date-only values are kept as-is to avoid timezone shifting.
const toDateKey = (value) => {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const formatTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (value) => {
  if (!value) return "—";

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDuration = (minutes) => {
  const safeMinutes = Math.max(0, Math.floor(minutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  return `${hours}h ${remainingMinutes}m`;
};

const calculateWorkedMinutes = (record) => {
  if (!record) return 0;

  const sessions = record.sessions || [];

  return sessions.reduce((total, session) => {
    if (!session.checkIn) return total;

    const start = new Date(session.checkIn).getTime();
    const end = session.checkOut
      ? new Date(session.checkOut).getTime()
      : Date.now();

    if (!Number.isFinite(start) || !Number.isFinite(end)) return total;

    return total + Math.max(0, Math.floor((end - start) / 60000));
  }, 0);
};

function SummaryCard({ title, value, description, color }) {
  return (
    <div className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h2 className={`mt-3 text-2xl font-bold ${color}`}>{value}</h2>
      <p className="mt-2 text-xs text-slate-400">{description}</p>
    </div>
  );
}

export default function EmployeeAttendance() {
  const [records, setRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  const today = getPakistanDate();

  const fetchAttendance = useCallback(async () => {
    try {
      setError("");

      const { data } = await api.get("/attendance/me");

      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load attendance records."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Load the employee's own leave requests to show an approved leave chip.
  // This does not disable attendance: employees may still check in if they
  // come to work during an approved leave period.
  useEffect(() => {
    let isMounted = true;

    const fetchLeaveRequests = async () => {
      try {
        const { data } = await api.get("/requests");

        if (isMounted) {
          setLeaveRequests(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Unable to load leave requests for attendance:", err);
        if (isMounted) setLeaveRequests([]);
      }
    };

    fetchLeaveRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const todayRecord =
    records.find((record) => record.dateKey === today) || null;

  const sessions = todayRecord?.sessions || [];

  const activeSession = sessions.find((session) => !session.checkOut);

  const workedMinutes = calculateWorkedMinutes(todayRecord);
  const requiredMinutes = todayRecord?.requiredMinutes ?? 480;

  const shortageMinutes = Math.max(
    0,
    requiredMinutes - workedMinutes
  );

  const extraMinutes = Math.max(
    0,
    workedMinutes - requiredMinutes
  );

  const isCheckedIn = Boolean(activeSession);

  // Only approved requests covering today's Pakistan date count as leave.
  const approvedLeaveToday = leaveRequests.find((request) => {
    if (request.status !== "Approved") return false;

    const startDate = toDateKey(request.startDate);
    const endDate = toDateKey(request.endDate);

    return Boolean(startDate && endDate && startDate <= today && today <= endDate);
  });

  const leaveChipLabel = approvedLeaveToday
    ? ["Annual Leave", "Sick Leave"].includes(approvedLeaveToday.type)
      ? "On Leave"
      : approvedLeaveToday.type
    : "";

  const handleCheckIn = async () => {
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await api.post("/attendance/check-in");

      setSuccess(data.message || "Check-in successful.");
      await fetchAttendance();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to check in."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await api.post("/attendance/check-out");

      setSuccess(data.message || "Check-out successful.");
      await fetchAttendance();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to check out."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const historyRecords = [...records]
    .filter((record) => record.dateKey !== today)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .slice(0, 10);

  // Keep the live timer updated while an employee is checked in.
  const liveWorkedMinutes = isCheckedIn
    ? calculateWorkedMinutes(todayRecord)
    : workedMinutes;

  const liveShortageMinutes = Math.max(
    0,
    requiredMinutes - liveWorkedMinutes
  );

  const liveExtraMinutes = Math.max(
    0,
    liveWorkedMinutes - requiredMinutes
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#DCE6EF] bg-white p-10 text-center text-slate-500">
        Loading attendance...
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div>
        <p className="text-sm font-semibold text-[#52749B]">
          Employee Portal / Attendance
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Attendance & Check-in
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Track your daily working hours and attendance sessions.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {/* Today's Attendance */}
      <section className="rounded-2xl border border-[#D5E5F5] bg-gradient-to-r from-[#EAF2FC] to-[#DCEBFA] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-[#52749B]">
              Today's Attendance
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#1E3A5F]">
              {formatDate(today)}
            </h2>

            <p className="mt-2 text-sm text-[#52749B]">
              Daily target: 8 hours
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {approvedLeaveToday && (
              <span
                title={`Approved ${approvedLeaveToday.type} leave`}
                className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700"
              >
                {leaveChipLabel}
              </span>
            )}

            {!isCheckedIn ? (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? "Please wait..." : "Check In"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? "Please wait..." : "Check Out"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-white/70 bg-white/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-600">
              Current Status
            </p>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isCheckedIn
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isCheckedIn ? "Checked In" : "Checked Out"}
            </span>
          </div>

          {isCheckedIn && (
            <p className="mt-3 text-sm text-slate-600">
              Current session started at{" "}
              <strong>{formatTime(activeSession.checkIn)}</strong>
            </p>
          )}
        </div>
      </section>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Worked"
          value={formatDuration(liveWorkedMinutes)}
          description="Your total working time today"
          color="text-blue-700"
        />

        <SummaryCard
          title="Required Hours"
          value={formatDuration(requiredMinutes)}
          description="Daily working target"
          color="text-slate-800"
        />

        <SummaryCard
          title="Remaining Hours"
          value={formatDuration(liveShortageMinutes)}
          description="Hours remaining to reach target"
          color="text-amber-600"
        />

        <SummaryCard
          title="Extra Hours"
          value={formatDuration(liveExtraMinutes)}
          description="Time worked above daily target"
          color="text-emerald-600"
        />
      </div>

      {/* Today's Sessions */}
      <section className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="font-bold text-slate-800">
            Today's Sessions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Each check-in and check-out is recorded separately.
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
            No attendance sessions recorded today.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, index) => {
              const start = new Date(session.checkIn).getTime();

              const end = session.checkOut
                ? new Date(session.checkOut).getTime()
                : currentTime;

              const duration =
                Number.isFinite(start) && Number.isFinite(end)
                  ? Math.max(0, Math.floor((end - start) / 60000))
                  : 0;

              return (
                <div
                  key={session._id || index}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      Session {index + 1}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Check-in: {formatTime(session.checkIn)}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Check-out:{" "}
                      {session.checkOut
                        ? formatTime(session.checkOut)
                        : "In progress"}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-slate-700">
                      {formatDuration(duration)}
                    </p>

                    <span
                      className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        session.checkOut
                          ? "bg-slate-100 text-slate-600"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {session.checkOut ? "Completed" : "Active"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Attendance History */}
      <section className="rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="font-bold text-slate-800">
            Attendance History
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your latest recorded attendance days.
          </p>
        </div>

        {historyRecords.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
            No previous attendance records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">First Check-in</th>
                  <th className="px-4 py-3 font-semibold">Last Check-out</th>
                  <th className="px-4 py-3 font-semibold">Worked</th>
                  <th className="px-4 py-3 font-semibold">Shortage</th>
                </tr>
              </thead>

              <tbody>
                {historyRecords.map((record) => {
                  const recordSessions = record.sessions || [];

                  const firstSession = recordSessions[0];

                  const lastSession =
                    recordSessions[recordSessions.length - 1];

                  return (
                    <tr
                      key={record._id}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-4 py-4 font-medium text-slate-700">
                        {formatDate(record.dateKey)}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {formatTime(firstSession?.checkIn)}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {formatTime(lastSession?.checkOut)}
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-700">
                        {formatDuration(record.workedMinutes)}
                      </td>

                      <td className="px-4 py-4 font-medium text-amber-600">
                        {formatDuration(record.shortageMinutes)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
