import { useEffect, useState } from "react";
import api from "../api";
import Spinner from "./Spinner";

const TYPE_STYLES = {
  "Work From Home": "bg-blue-100 text-blue-800",
  "Annual Leave": "bg-purple-100 text-purple-800",
  "Sick Leave": "bg-red-100 text-red-800",
  "Half Day": "bg-orange-100 text-orange-800",
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

  useEffect(() => {
    const fetchOutToday = async () => {
      try {
        const { data } = await api.get("/requests", {
          params: { today: true, status: "Approved" },
        });
        setPeople(data);
        setError("");
      } catch (err) {
        setError("Could not load who is out today.");
      } finally {
        setLoading(false);
      }
    };

    fetchOutToday();
  }, [refreshKey]);

  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section
      aria-labelledby="out-today-heading"
      className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-5"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="out-today-heading" className="text-xl font-bold text-blue-900">
          Out Today
        </h2>
        <p className="text-sm text-blue-700">{todayLabel}</p>
      </div>

      {loading && <Spinner label="Checking who is out..." />}

      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && people.length === 0 && (
        <p className="text-sm text-gray-600">
          Everyone is in today. No approved leave or remote work.
        </p>
      )}

      {!loading && !error && people.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {people.map((p) => (
            <li key={p._id} className="rounded border bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.employeeName}</p>
                  <p className="text-xs text-gray-500">{p.department}</p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[p.type]}`}
                >
                  {p.type}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                Until {formatDate(p.endDate)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}