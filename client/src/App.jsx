
import { useEffect, useState } from "react";
import api from "./api";

import RequestForm from "./components/RequestForm";
import FilterTabs from "./components/FilterTabs";
import RequestList from "./components/RequestList";
import OutTodayBanner from "./components/OutTodayBanner";
import RecentLeaveDecisions from "./components/RecentLeaveDecisions";
import Spinner from "./components/Spinner";
import LandingPage from "./components/LandingPage";
import Sidebar from "./components/Sidebar";

export default function App() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [showDashboard, setShowDashboard] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");

  // Fetch all leave requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data } = await api.get("/requests");
        setRequests(data);
        setError("");
      } catch {
        setError("Could not load requests. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  // Handle new request creation
  const handleCreated = (newRequest) => {
    setRequests((prev) => [newRequest, ...prev]);
    setRefreshKey((k) => k + 1);
    setActivePage("Dashboard");
  };

  // Handle approve / reject
  const handleStatusChange = async (id, status) => {
    setBusyId(id);
    setActionError("");

    try {
      const { data } = await api.patch(`/requests/${id}/status`, {
        status,
      });

      setRequests((prev) =>
        prev.map((r) => (r._id === id ? data : r))
      );

      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Could not update status."
      );
    } finally {
      setBusyId(null);
    }
  };

  // Handle request deletion
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this request? This cannot be undone.")) {
      return;
    }

    setBusyId(id);
    setActionError("");

    try {
      await api.delete(`/requests/${id}`);

      setRequests((prev) => prev.filter((r) => r._id !== id));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Could not delete request."
      );
    } finally {
      setBusyId(null);
    }
  };

  // Request counts
  const counts = {
    All: requests.length,
    Pending: requests.filter((r) => r.status === "Pending").length,
    Approved: requests.filter((r) => r.status === "Approved").length,
    Rejected: requests.filter((r) => r.status === "Rejected").length,
  };

  // Filter requests
  const visibleRequests =
    filter === "All"
      ? requests
      : requests.filter((r) => r.status === filter);

  // Loading state
  if (loading) {
    return <Spinner label="Loading requests..." />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-slate-700">{error}</p>

          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[#2563EB] px-5 py-2.5 font-medium text-white hover:bg-[#1D4ED8]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Landing Page
  if (!showDashboard) {
    return (
      <LandingPage
        onGetStarted={() => {
          setShowDashboard(true);
          setActivePage("Dashboard");
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">

      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onBackHome={() => setShowDashboard(false)}
      />

      {/* Main Content */}
      <main className="min-w-0 flex-1 px-8 py-8">

        {/* Dashboard Page */}
        {activePage === "Dashboard" && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">
                Welcome to LeaveDesk
              </h1>

              <p className="mt-2 text-slate-500">
                Here's an overview of your leave management activity.
              </p>
            </div>

            {/* Today's Approved Leave and Remote Work */}
            <OutTodayBanner refreshKey={refreshKey} />

            {/* Yesterday, Today and Tomorrow Decisions */}
            <RecentLeaveDecisions requests={requests} />
          </div>
        )}

        {/* Leave Requests Page */}
        {activePage === "Leave Requests" && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">
                Leave Requests
              </h1>

              <p className="mt-2 text-slate-500">
                View and manage all employee requests.
              </p>
            </div>

            {actionError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {actionError}
              </div>
            )}

            <FilterTabs
              active={filter}
              onChange={setFilter}
              counts={counts}
            />

            <div className="mt-5">
              <RequestList
                requests={visibleRequests}
                filter={filter}
                busyId={busyId}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            </div>
          </div>
        )}

        {/* New Request Page */}
        {activePage === "New Request" && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">
                Create New Request
              </h1>

              <p className="mt-2 text-slate-500">
                Fill in the details to submit a leave request.
              </p>
            </div>

            <RequestForm onCreated={handleCreated} />
          </div>
        )}

        {/* Out Today Page */}
        {activePage === "Out Today" && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">
                Out Today
              </h1>

              <p className="mt-2 text-slate-500">
                Employees who are on approved leave or working remotely today.
              </p>
            </div>

            <OutTodayBanner refreshKey={refreshKey} />
          </div>
        )}

      </main>
    </div>
  );
}
