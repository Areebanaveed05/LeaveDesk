
import { formatUTCDate } from "../utils/date";

const STATUS_STYLES = {
  Pending: "bg-[#F8F2D9] text-[#89783D] border-[#E9DFAF]",
  Approved: "bg-[#DDF3E7] text-[#26734A] border-[#BCE5CC]",
  Rejected: "bg-[#FCE5E5] text-[#B54343] border-[#F3CACA]",
};

export default function RequestList({
  requests = [],
  filter,
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D9E5F0] bg-[#F0F5FA] px-6 py-12 text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl text-[#789BC5] shadow-sm"
        >
          ▤
        </div>

        <h3 className="font-semibold text-slate-800">
          No requests found
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          {filter === "All"
            ? "No requests yet. Submit one using the New Request page."
            : `There are currently no ${filter.toLowerCase()} requests.`}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {requests.map((r) => (
        <li
          key={r._id}
          className="group rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B9D0E8] hover:shadow-md sm:p-6"
        >
          {/* Employee Details and Status */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F0FA] font-bold text-[#52749B]"
              >
                {r.employeeName?.charAt(0)?.toUpperCase() || "E"}
              </div>

              <div className="min-w-0">
                <p className="font-bold text-slate-900">
                  {r.employeeName}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {r.department}
                  <span className="mx-1.5 text-slate-300">·</span>
                  {r.type}
                </p>
              </div>
            </div>

            {/* Request Status */}
            <span
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold ${
                STATUS_STYLES[r.status] ||
                "border-slate-200 bg-slate-100 text-slate-600"
              }`}
            >
              {r.status}
            </span>
          </div>

          {/* Request Information */}
          <div className="mt-5 rounded-xl bg-[#F5F8FC] p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
              <span>{formatUTCDate(r.startDate)}</span>

              <span aria-hidden="true" className="text-[#789BC5]">
                →
              </span>

              <span>{formatUTCDate(r.endDate)}</span>
            </div>

            {r.reason && (
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {r.reason}
              </p>
            )}
          </div>

          {/* Admin Decision Information */}
          <div className="mt-4">
            {r.status === "Approved" && (
              <div className="rounded-xl border border-[#BCE5CC] bg-[#F0FAF4] p-4">
                <p className="text-sm font-semibold text-[#26734A]">
                  ✓ Your request has been approved.
                </p>
              </div>
            )}

            {r.status === "Rejected" && (
              <div className="rounded-xl border border-[#F3CACA] bg-[#FFF5F5] p-4">
                <p className="text-sm font-semibold text-[#B54343]">
                  Your request has been rejected.
                </p>

                <div className="mt-3 border-t border-[#F3CACA] pt-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#B54343]">
                    Reason for rejection
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {r.rejectionReason ||
                      "No rejection reason was recorded for this request."}
                  </p>
                </div>
              </div>
            )}

            {r.status === "Pending" && (
              <p className="text-sm text-slate-500">
                Your request is waiting for Admin review.
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
