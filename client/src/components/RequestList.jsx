const STATUS_STYLES = {
  Pending: "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export default function RequestList({
  requests,
  busyId,
  onStatusChange,
  onDelete,
  filter,
}) {
  if (requests.length === 0) {
    return (
      <p className="rounded border border-dashed p-6 text-center text-gray-500">
        {filter === "All"
          ? "No requests yet. Submit one using the form above."
          : `No ${filter.toLowerCase()} requests.`}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((r) => {
        const busy = busyId === r._id;
        return (
          <li key={r._id} className="rounded border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{r.employeeName}</p>
                <p className="text-sm text-gray-600">
                  {r.department} · {r.type}
                </p>
              </div>
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${STATUS_STYLES[r.status]}`}
              >
                {r.status}
              </span>
            </div>

            <p className="mt-2 text-sm">
              {formatDate(r.startDate)} → {formatDate(r.endDate)}
            </p>
            <p className="mt-1 text-sm text-gray-700">{r.reason}</p>

            <div className="mt-3 flex gap-2">
              {r.status !== "Approved" && (
                <button
                  disabled={busy}
                  onClick={() => onStatusChange(r._id, "Approved")}
                  className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
              )}
              {r.status !== "Rejected" && (
                <button
                  disabled={busy}
                  onClick={() => onStatusChange(r._id, "Rejected")}
                  className="rounded bg-orange-500 px-3 py-1 text-sm text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  Reject
                </button>
              )}
              <button
                disabled={busy}
                onClick={() => onDelete(r._id)}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}