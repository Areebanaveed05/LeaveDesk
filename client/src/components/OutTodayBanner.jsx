
import { useEffect, useState } from "react";
import api from "../api";
import Spinner from "./Spinner";

const TYPE_STYLES = {
  "Work From Home": {
    card: "bg-[#EFF6FF] border-[#BFDBFE] hover:bg-[#E4EEFF]",
    badge: "bg-[#DBEAFE] text-[#1D4ED8]",
    accent: "bg-[#3B82F6]",
  },
  "Annual Leave": {
    card: "bg-[#F5EEE6] border-[#EADCCB] hover:bg-[#F0E5D9]",
    badge: "bg-[#EADCCB] text-[#76583E]",
    accent: "bg-[#B89572]",
  },
  "Sick Leave": {
    card: "bg-[#FFF1F0] border-[#FECACA] hover:bg-[#FFE7E5]",
    badge: "bg-[#FEE2E2] text-[#B91C1C]",
    accent: "bg-[#EF4444]",
  },
  "Half Day": {
    card: "bg-[#FFF4E8] border-[#FED7AA] hover:bg-[#FFEDD9]",
    badge: "bg-[#FFEDD5] text-[#C2410C]",
    accent: "bg-[#F59E0B]",
  },
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export default function OutTodayBanner({ refreshKey }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [todayLabel] = useState(() =>
    new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  );

  useEffect(() => {
    const fetchOutToday = async () => {
      try {
        const { data } = await api.get("/requests", {
          params: { today: true, status: "Approved" },
        });

        setPeople(data);
        setError("");
      } catch {
        setError("Could not load who is out today.");
      } finally {
        setLoading(false);
      }
    };

    fetchOutToday();
  }, [refreshKey]);

  return (
    <section
      aria-labelledby="out-today-heading"
      className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm"
    >
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="out-today-heading"
          className="text-xl font-bold text-blue-900"
        >
          Out Today
        </h2>

        <p className="text-sm font-medium text-blue-700">
          {todayLabel}
        </p>
      </div>

      {loading && <Spinner label="Checking who is out..." />}

      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && people.length === 0 && (
        <p className="text-sm text-gray-600">
          Everyone is in today. No approved leave or remote work.
        </p>
      )}

      {/* Employee Cards */}
      {!loading && !error && people.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {people.map((p) => {
            const style = TYPE_STYLES[p.type] || {
              card: "bg-white border-slate-200 hover:bg-slate-50",
              badge: "bg-slate-100 text-slate-700",
              accent: "bg-slate-400",
            };

            return (
              <li
                key={p._id}
                className={`relative w-full max-w-[300px] overflow-hidden rounded-xl border p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${style.card}`}
              >
                {/* Colored Accent */}
                <div
                  className={`absolute left-0 top-0 h-full w-1 ${style.accent}`}
                />

                <div className="flex items-start justify-between gap-2 pl-1">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {p.employeeName}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-600">
                      {p.department}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${style.badge}`}
                  >
                    {p.type}
                  </span>
                </div>

                <p className="mt-3 pl-1 text-xs font-medium text-slate-600">
                  Until {formatDate(p.endDate)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
