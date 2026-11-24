import { useState } from "react";
import { getDateKey, formatLocalDate, toDateKey } from "../utils/date";

export default function RecentLeaveDecisions({ requests }) {
  const [today] = useState(() => new Date());

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dateGroups = [
    {
      label: "Yesterday",
      date: yesterday,
      card: "bg-[#E3F1E8] border-[#C9E2D1]",
      heading: "text-[#527D61]",
      dot: "bg-[#79A889]",
    },
    {
      label: "Today",
      date: today,
      card: "bg-[#E8F0FA] border-[#C9D9EE]",
      heading: "text-[#52749B]",
      dot: "bg-[#789BC5]",
    },
    {
      label: "Tomorrow",
      date: tomorrow,
      card: "bg-[#F8F2D9] border-[#E9DFAF]",
      heading: "text-[#89783D]",
      dot: "bg-[#C5AD58]",
    },
  ];

  const decidedRequests = requests.filter(
    (request) =>
      request.status === "Approved" || request.status === "Rejected"
  );

  return (
    <section className="mt-8 rounded-2xl border border-[#D9E5F0] bg-[#F0F5FA] p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0E8DF] text-xl text-[#98765B]"
          >
            ✓
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            Recent Leave Decisions
          </h2>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          Approved and rejected requests that cover yesterday, today or
          tomorrow.
        </p>
      </div>

      {/* Three Date Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dateGroups.map((group) => {
          const groupDateKey = getDateKey(group.date);

          // A request belongs to this day if the day falls
          // anywhere between its start date and end date.
          const groupRequests = decidedRequests.filter((request) => {
            if (!request.startDate || !request.endDate) return false;

            const startKey = toDateKey(request.startDate);
            const endKey = toDateKey(request.endDate);

            return startKey <= groupDateKey && groupDateKey <= endKey;
          });

          return (
            <div
              key={group.label}
              className={`min-w-0 rounded-xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${group.card}`}
            >
              {/* Card Heading */}
              <div className="mb-4 border-b border-black/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${group.dot}`} />

                  <h3 className={`font-bold ${group.heading}`}>
                    {group.label}
                  </h3>
                </div>

                <p
                  className={`mt-1 pl-[18px] text-xs font-medium ${group.heading}`}
                >
                  {formatLocalDate(group.date, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Employee Decisions */}
              {groupRequests.length > 0 ? (
                <div className="space-y-2">
                  {groupRequests.map((request) => (
                    <div
                      key={request._id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/70 bg-white/75 px-3 py-2.5 transition-all duration-200 hover:bg-white hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {request.employeeName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {request.type}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          request.status === "Approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-white/70 bg-white/50 px-3 py-3">
                  <p className="text-xs text-slate-600">
                    No leave decisions for this date.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
