
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";

const STATUSES = ["All", "Pending", "Approved", "Rejected"];

const REQUEST_TYPES = [
  "All",
  "Annual Leave",
  "Sick Leave",
  "Half Day",
  "Work From Home",
];

const formatDate = (date) => {
  if (!date) return "—";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "—";

  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const getStatusStyle = (status) => {
  switch (status) {
    case "Approved":
      return "bg-emerald-50 text-emerald-700";

    case "Rejected":
      return "bg-red-50 text-red-600";

    default:
      return "bg-amber-50 text-amber-700";
  }
};

export default function AdminLeaveRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeStatus, setActiveStatus] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const [search, setSearch] = useState("");

  const [busyId, setBusyId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Rejection modal state
  const [rejectionRequest, setRejectionRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch all requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/requests");

      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load leave requests. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Request counts
  const counts = useMemo(
    () => ({
      All: requests.length,
      Pending: requests.filter((r) => r.status === "Pending").length,
      Approved: requests.filter((r) => r.status === "Approved").length,
      Rejected: requests.filter((r) => r.status === "Rejected").length,
    }),
    [requests]
  );

  // Search and filters
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus =
        activeStatus === "All" || request.status === activeStatus;

      const matchesType =
        activeType === "All" || request.type === activeType;

      const searchValue = search.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        request.employeeName?.toLowerCase().includes(searchValue) ||
        request.department?.toLowerCase().includes(searchValue) ||
        request.type?.toLowerCase().includes(searchValue) ||
        request.reason?.toLowerCase().includes(searchValue) ||
        request.rejectionReason?.toLowerCase().includes(searchValue);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [requests, activeStatus, activeType, search]);

  // Approve request
  const handleApprove = async (request) => {
    const confirmed = window.confirm(
      `Are you sure you want to approve ${request.employeeName}'s ${request.type} request?`
    );

    if (!confirmed) return;

    setBusyId(request._id);
    setError("");
    setSuccess("");

    try {
      const { data } = await api.patch(
        `/requests/${request._id}/status`,
        { status: "Approved" }
      );

      setRequests((previous) =>
        previous.map((item) =>
          item._id === request._id ? data : item
        )
      );

      setSelectedRequest((previous) =>
        previous?._id === request._id ? data : previous
      );

      setSuccess("Request successfully approved.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to approve this request."
      );
    } finally {
      setBusyId(null);
    }
  };

  // Open rejection modal
  const openRejectionModal = (request) => {
    setRejectionRequest(request);
    setRejectionReason("");
    setError("");
    setSuccess("");
  };

  // Confirm rejection with reason
  const handleReject = async (e) => {
    e.preventDefault();

    if (!rejectionRequest) return;

    const trimmedReason = rejectionReason.trim();

    if (!trimmedReason) {
      setError("Please provide a reason for rejecting this request.");
      return;
    }

    if (trimmedReason.length > 1000) {
      setError("Rejection reason cannot exceed 1000 characters.");
      return;
    }

    const request = rejectionRequest;

    setBusyId(request._id);
    setError("");
    setSuccess("");

    try {
      const { data } = await api.patch(
        `/requests/${request._id}/status`,
        {
          status: "Rejected",
          rejectionReason: trimmedReason,
        }
      );

      setRequests((previous) =>
        previous.map((item) =>
          item._id === request._id ? data : item
        )
      );

      setSelectedRequest((previous) =>
        previous?._id === request._id ? data : previous
      );

      setRejectionRequest(null);
      setRejectionReason("");

      setSuccess("Request rejected successfully. Reason has been shared with the employee.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reject this request."
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      {/* Page Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#52749B]">
            Administration
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Leave Requests
          </h1>

          <p className="mt-2 text-slate-500">
            Review and manage leave applications submitted by employees.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          disabled={loading}
          className="rounded-xl border border-[#DCE6EF] bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-[#F0F5FA] disabled:opacity-50"
        >
          ↻ Refresh Requests
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

      {/* Statistics Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setActiveStatus(status)}
            className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              activeStatus === status
                ? "border-[#789BC5] ring-2 ring-blue-100"
                : "border-[#E2EAF2]"
            }`}
          >
            <p className="text-sm font-medium text-slate-500">
              {status === "All" ? "Total Requests" : status}
            </p>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {loading ? "—" : counts[status]}
            </p>
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-[#E2EAF2] bg-white p-4 lg:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employee, department or reason..."
          className="min-w-0 flex-1 rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm outline-none transition focus:border-[#789BC5] focus:ring-2 focus:ring-blue-100"
        />

        <select
          value={activeStatus}
          onChange={(e) => setActiveStatus(e.target.value)}
          className="rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm text-slate-600 outline-none focus:border-[#789BC5]"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status === "All" ? "All Statuses" : status}
            </option>
          ))}
        </select>

        <select
          value={activeType}
          onChange={(e) => setActiveType(e.target.value)}
          className="rounded-xl border border-[#DCE6EF] bg-white px-4 py-3 text-sm text-slate-600 outline-none focus:border-[#789BC5]"
        >
          {REQUEST_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === "All" ? "All Leave Types" : type}
            </option>
          ))}
        </select>
      </div>

      {/* Requests Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E2EAF2] bg-white shadow-sm">
        <div className="border-b border-[#E8EEF4] px-6 py-5">
          <h2 className="font-bold text-slate-900">
            Employee Applications
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {filteredRequests.length} request(s) found
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading leave requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg font-semibold text-slate-700">
              No leave requests found
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your filters or search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Employee</th>
                  <th className="px-6 py-4 font-semibold">Leave Type</th>
                  <th className="px-6 py-4 font-semibold">Dates</th>
                  <th className="px-6 py-4 font-semibold">Days</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E8EEF4]">
                {filteredRequests.map((request) => {
                  const isBusy = busyId === request._id;

                  return (
                    <tr
                      key={request._id}
                      className="transition hover:bg-[#F8FAFC]"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">
                          {request.employeeName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {request.department || "No department"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {request.type}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                        <p>{formatDate(request.startDate)}</p>

                        <p className="mt-1 text-xs text-slate-400">
                          to {formatDate(request.endDate)}
                        </p>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {request.days}{" "}
                        {request.days === 1 ? "day" : "days"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(request.status)}`}
                        >
                          {request.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(request)}
                            className="rounded-lg border border-[#DCE6EF] px-3 py-2 text-xs font-semibold text-[#52749B] hover:bg-[#E8F0FA]"
                          >
                            View
                          </button>

                          {request.status === "Pending" && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleApprove(request)}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {isBusy ? "..." : "Approve"}
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => openRejectionModal(request)}
                                className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedRequest(null);
            }
          }}
        >
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Leave Request Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Review the employee's application.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                aria-label="Close details"
                className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Employee
                </p>

                <p className="mt-1 font-semibold text-slate-800">
                  {selectedRequest.employeeName}
                </p>

                <p className="text-sm text-slate-500">
                  {selectedRequest.department}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Leave Type
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {selectedRequest.type}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Duration
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {selectedRequest.days} days
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Start Date
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {formatDate(selectedRequest.startDate)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    End Date
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {formatDate(selectedRequest.endDate)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Employee's Reason
                </p>

                <div className="mt-2 rounded-xl bg-[#F8FAFC] p-4 text-sm leading-relaxed text-slate-600">
                  {selectedRequest.reason || "No reason provided."}
                </div>
              </div>

              {selectedRequest.status === "Rejected" && (
                <div>
                  <p className="text-xs font-semibold uppercase text-red-500">
                    Rejection Reason
                  </p>

                  <div className="mt-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-relaxed text-red-700">
                    {selectedRequest.rejectionReason ||
                      "No rejection reason was recorded for this request."}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Request Status
                </p>

                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(selectedRequest.status)}`}
                >
                  {selectedRequest.status}
                </span>
              </div>

              {selectedRequest.reviewedAt && (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Reviewed On
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {formatDate(selectedRequest.reviewedAt)}
                  </p>
                </div>
              )}
            </div>

            {selectedRequest.status === "Pending" && (
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={busyId === selectedRequest._id}
                  onClick={() => openRejectionModal(selectedRequest)}
                  className="flex-1 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Reject Request
                </button>

                <button
                  type="button"
                  disabled={busyId === selectedRequest._id}
                  onClick={() => handleApprove(selectedRequest)}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Approve Request
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedRequest(null)}
              className="mt-3 w-full rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectionRequest && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busyId) {
              setRejectionRequest(null);
              setRejectionReason("");
              setError("");
            }
          }}
        >
          <form
            onSubmit={handleReject}
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-xl text-red-500">
                  !
                </div>

                <h2 className="text-xl font-bold text-slate-900">
                  Reject Leave Request
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  You are rejecting {rejectionRequest.employeeName}'s{" "}
                  {rejectionRequest.type} request.
                </p>
              </div>

              <button
                type="button"
                disabled={busyId === rejectionRequest._id}
                onClick={() => {
                  setRejectionRequest(null);
                  setRejectionReason("");
                  setError("");
                }}
                aria-label="Close rejection modal"
                className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-slate-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <label
              htmlFor="rejectionReason"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Rejection Reason <span className="text-red-500">*</span>
            </label>

            <textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setError("");
              }}
              placeholder="Explain why this request is being rejected..."
              rows={5}
              maxLength={1000}
              required
              autoFocus
              className="w-full resize-y rounded-xl border border-[#DCE6EF] bg-[#F8FAFC] px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#789BC5] focus:bg-white focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>This reason will be visible to the employee.</span>
              <span>{rejectionReason.length}/1000</span>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                disabled={busyId === rejectionRequest._id}
                onClick={() => {
                  setRejectionRequest(null);
                  setRejectionReason("");
                  setError("");
                }}
                className="flex-1 rounded-xl border border-[#DCE6EF] px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  busyId === rejectionRequest._id ||
                  !rejectionReason.trim()
                }
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyId === rejectionRequest._id
                  ? "Rejecting..."
                  : "Confirm Rejection"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
