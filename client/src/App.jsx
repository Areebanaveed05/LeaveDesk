import { useEffect, useState } from "react";
import api from "./api";
import RequestForm from "./components/RequestForm";
import FilterTabs from "./components/FilterTabs";
import RequestList from "./components/RequestList";
import OutTodayBanner from "./components/OutTodayBanner";
import Spinner from "./components/Spinner";

export default function App() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data } = await api.get("/requests");
        setRequests(data);
      } catch (err) {
        setError("Could not load requests");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleCreated = (newRequest) => {
    setRequests((prev) => [newRequest, ...prev]);
    setRefreshKey((k) => k + 1);
  };

  const handleStatusChange = async (id, status) => {
    setBusyId(id);
    setActionError("");
    try {
      const { data } = await api.patch(`/requests/${id}/status`, { status });
      setRequests((prev) => prev.map((r) => (r._id === id ? data : r)));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not update status.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this request? This cannot be undone.")) return;

    setBusyId(id);
    setActionError("");
    try {
      await api.delete(`/requests/${id}`);
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Could not delete request.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const counts = {
    All: requests.length,
    Pending: requests.filter((r) => r.status === "Pending").length,
    Approved: requests.filter((r) => r.status === "Approved").length,
  };

  const visibleRequests =
    filter === "All" ? requests : requests.filter((r) => r.status === filter);

  if (loading) return <Spinner label="Loading requests..." />;
  if (error)
    return (
      <div className="p-6 text-center">
        <p className="mb-3 text-red-600">{error}</p>

        <button
          onClick={() => window.location.reload()}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-blue-600">Leave Tracker</h1>
      <OutTodayBanner refreshKey={refreshKey} />

      <RequestForm onCreated={handleCreated} />

      <h2 className="mb-3 text-lg font-semibold">Requests</h2>
      <FilterTabs active={filter} onChange={setFilter} counts={counts} />

      {actionError && (
        <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-red-700">
          {actionError}
        </p>
      )}

      <RequestList
        requests={visibleRequests}
        filter={filter}
        busyId={busyId}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />
    </div>
  );
}
