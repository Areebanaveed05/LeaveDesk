import { useEffect, useState } from "react";
import api from "./api";

import RequestForm from "./components/RequestForm";
import FilterTabs from "./components/FilterTabs";
import RequestList from "./components/RequestList";
import EmployeeDashboard from "./components/EmployeeDashboard";
import MyProjects from "./components/MyProjects";
import MyTasks from "./components/MyTasks";
import EmployeeProfile from "./components/EmployeeProfile";
import Spinner from "./components/Spinner";
import LandingPage from "./components/LandingPage";
import Sidebar from "./components/Sidebar";
import LoginPage from "./components/LoginPage";
import ResetPassword from "./ResetPassword";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import AdminPortal from "./admin_components/AdminPortal";
import ManageProjectTasks from "./components/ManageProjectTasks";
import EmployeeAttendance from "./components/EmployeeAttendance";

export default function App() {
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isProjectLead, setIsProjectLead] = useState(false);

  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showDashboard, setShowDashboard] = useState(() =>
    Boolean(localStorage.getItem("token")),
  );

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      return null;
    }
  });

  // Temporary-password change form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setShowDashboard(true);
    setShowForgotPassword(false);
    setActivePage("Dashboard");
    setLoading(false);
    setError("");
    setPasswordError("");
    setPasswordSuccess("");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setRequests([]);
    setSummary(null);
    setActivePage("Dashboard");
    setSidebarOpen(false);
    setShowForgotPassword(false);
    setShowDashboard(true);
    setLoading(false);
    setError("");
    setActionError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError("");
    setPasswordSuccess("");
  };

  // Load the employee's own requests and personalized leave summary.
  // Admin users are handled separately by AdminPortal.
  useEffect(() => {
    if (!user || user.role !== "employee" || user.mustChangePassword) {
      setRequests([]);
      setSummary(null);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;

    const fetchEmployeeData = async () => {
      setLoading(true);
      setError("");

      try {
        const [requestsResponse, summaryResponse] = await Promise.all([
          api.get("/requests"),
          api.get("/users/me/summary"),
        ]);

        if (!cancelled) {
          setRequests(requestsResponse.data);
          setSummary(summaryResponse.data.summary);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Could not load your dashboard. Please check your connection.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEmployeeData();

    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);

  // Determine whether the logged-in employee is the lead of at least one project.
  // This controls visibility of the Manage Project Tasks navigation item.
  useEffect(() => {
    let cancelled = false;

    const checkProjectLead = async () => {
      if (!user || user.role !== "employee" || user.mustChangePassword) {
        setIsProjectLead(false);
        return;
      }

      try {
        const { data } = await api.get("/projects");

        const projects = Array.isArray(data)
          ? data
          : Array.isArray(data?.projects)
            ? data.projects
            : [];

        const currentUserId = String(user._id || user.id || "");

        const isLead = projects.some((project) => {
          const leadId =
            project.projectLead && typeof project.projectLead === "object"
              ? project.projectLead._id || project.projectLead.id
              : project.projectLead;

          return String(leadId || "") === currentUserId;
        });

        if (!cancelled) {
          setIsProjectLead(isLead);
        }
      } catch (error) {
        console.error("Could not check Project Lead access:", error);

        if (!cancelled) {
          setIsProjectLead(false);
        }
      }
    };

    checkProjectLead();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleTemporaryPasswordChange = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("Your new password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "Your new password must be different from the temporary password.",
      );
      return;
    }

    setPasswordLoading(true);

    try {
      // This endpoint updates the password and increments tokenVersion.
      // Therefore, the old token is invalidated.
      await api.patch("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      // Sign in again immediately to obtain a fresh JWT for the new tokenVersion.
      const { data } = await api.post("/auth/login", {
        email: user.email,
        password: newPassword,
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setUser(data.user);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordSuccess(
        "Password changed successfully. Welcome to LeaveDesk!",
      );
      setActivePage("Dashboard");
      setError("");
      setRequests([]);
      setSummary(null);
    } catch (err) {
      setPasswordError(
        err.response?.data?.message ||
          "Could not change your password. Please check your current password and try again.",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCreated = () => {
    setRefreshKey((key) => key + 1);
    setActivePage("Dashboard");
  };

  // This handler is retained for components that expose request decisions.
  // Employee APIs should reject employee attempts to approve/reject requests.
  const handleStatusChange = async (id, status) => {
    setBusyId(id);
    setActionError("");

    try {
      const { data } = await api.patch(`/requests/${id}/status`, { status });

      setRequests((prev) =>
        prev.map((request) => (request._id === id ? data : request)),
      );

      setRefreshKey((key) => key + 1);
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not update status.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Cancel this pending request?")) return;

    setBusyId(id);
    setActionError("");

    try {
      await api.delete(`/requests/${id}`);

      setRequests((prev) => prev.filter((request) => request._id !== id));

      setRefreshKey((key) => key + 1);
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Could not cancel request.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const counts = {
    All: requests.length,
    Pending: requests.filter((request) => request.status === "Pending").length,
    Approved: requests.filter((request) => request.status === "Approved")
      .length,
    Rejected: requests.filter((request) => request.status === "Rejected")
      .length,
  };

  const visibleRequests =
    filter === "All"
      ? requests
      : requests.filter((request) => request.status === filter);

  // Public password-reset link
  if (window.location.pathname === "/reset-password") {
    return (
      <ResetPassword
        onBackToLogin={() => {
          window.history.replaceState({}, "", "/");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          setShowForgotPassword(false);
          setShowDashboard(true);
        }}
      />
    );
  }

  if (!showDashboard) {
    return <LandingPage onGetStarted={() => setShowDashboard(true)} />;
  }

  if (!user && showForgotPassword) {
    return (
      <ForgotPasswordPage onBackToLogin={() => setShowForgotPassword(false)} />
    );
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onBackHome={() => setShowDashboard(false)}
        onForgotPassword={() => setShowForgotPassword(true)}
      />
    );
  }

  // Admin role is routed only to the Admin Portal.
  if (user.role === "admin") {
    return <AdminPortal user={user} onLogout={handleLogout} />;
  }

  // Reject unknown roles rather than treating them as employees.
  if (user.role !== "employee") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>

          <p className="mt-3 text-slate-500">
            Your account does not have permission to access this portal.
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 rounded-lg bg-[#2563EB] px-5 py-2.5 font-medium text-white hover:bg-[#1D4ED8]"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Mandatory first-login password-change screen.
  if (user.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-7 shadow-xl sm:p-10">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-7 w-7"
            >
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Account Security
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Change your temporary password
            </h1>

            <p className="mt-3 leading-7 text-slate-500">
              Hi {user.name || "there"}, create a new password to continue to
              your LeaveDesk employee portal.
            </p>
          </div>

          <form
            onSubmit={handleTemporaryPasswordChange}
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="currentPassword"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Temporary Password
              </label>

              <div className="relative">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-16 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="Enter your temporary password"
                />

                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((visible) => !visible)}
                  aria-label={
                    showCurrentPassword
                      ? "Hide temporary password"
                      : "Show temporary password"
                  }
                  aria-pressed={showCurrentPassword}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  {showCurrentPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                New Password
              </label>

              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-16 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="At least 8 characters"
                />

                <button
                  type="button"
                  onClick={() => setShowNewPassword((visible) => !visible)}
                  aria-label={
                    showNewPassword ? "Hide new password" : "Show new password"
                  }
                  aria-pressed={showNewPassword}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Confirm New Password
              </label>

              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-16 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="Re-enter your new password"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                  aria-pressed={showConfirmPassword}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {passwordError && (
              <p
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600"
              >
                {passwordError}
              </p>
            )}

            {passwordSuccess && (
              <p
                role="status"
                className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700"
              >
                {passwordSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordLoading
                ? "Updating password..."
                : "Update Password & Continue"}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Log out
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Your temporary password can only be used for your first sign-in.
          </p>
        </div>
      </div>
    );
  }

  // Employee Portal
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onBackHome={() => {
          setSidebarOpen(false);
          setShowDashboard(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isProjectLead={isProjectLead}
      />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex items-center gap-3 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE6EF] bg-white text-xl text-[#52749B] shadow-sm"
          >
            ☰
          </button>

          <p className="text-xl font-bold tracking-tight">
            <span className="text-slate-900">Leave</span>
            <span className="text-[#2563EB]">Desk</span>
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="ml-auto rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600"
          >
            Logout
          </button>
        </div>

        {loading && <Spinner label="Loading requests..." />}

        {!loading && error && (
          <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="mb-4 text-slate-700">{error}</p>

            <button
              type="button"
              onClick={() => {
                setError("");
                setUser({ ...user });
              }}
              className="rounded-lg bg-[#2563EB] px-5 py-2.5 font-medium text-white hover:bg-[#1D4ED8]"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {activePage === "Dashboard" && (
              <EmployeeDashboard
                user={user}
                summary={summary}
                requests={requests}
                onNavigate={setActivePage}
              />
            )}

            {/* My Projects Page */}
            {activePage === "My Projects" && <MyProjects user={user} />}

            {/* My Tasks Page */}
            {activePage === "My Tasks" && <MyTasks user={user} />}

            {/* Attendance & Check-in Page */}
            {activePage === "Attendance & Check-in" && <EmployeeAttendance />}

            {/* Manage Project Tasks Page */}
            {activePage === "Manage Project Tasks" && (
              <ManageProjectTasks user={user} />
            )}

            {activePage === "Leave Requests" && (
              <div>
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-slate-900">
                    Leave Requests
                  </h1>

                  <p className="mt-2 text-slate-500">
                    View and manage your leave requests.
                  </p>
                </div>

                {actionError && (
                  <div
                    role="alert"
                    className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600"
                  >
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

            {activePage === "Profile" && (
              <EmployeeProfile user={user} onLogout={handleLogout} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
