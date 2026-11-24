
import { useState } from "react";
import api from "../api";

export default function AdminSettings({ user, onLogout }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    setLoading(true);

    try {
      await api.patch("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      setSuccess(
        "Password changed successfully. Please sign in again with your new password.",
      );

      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Backend increments tokenVersion, invalidating the old token.
      // Sign out so the admin can log in with the new password.
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.setTimeout(() => {
        onLogout?.();
      }, 1800);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to change password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Page Header */}
      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#52749B]">
          Administration
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Account Settings
        </h1>

        <p className="mt-2 text-slate-500">
          Manage your administrator account and security preferences.
        </p>
      </div>

      {/* Account Information */}
      <section className="mb-8 rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Administrator Profile
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your current account information.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-4 rounded-xl bg-[#F8FAFC] p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F0FA] text-2xl font-bold text-[#52749B]">
            {user?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>

          <div>
            <h3 className="font-bold text-slate-800">
              {user?.name || "Administrator"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {user?.role === "admin" ? "Administrator" : user?.role || "Admin"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Full Name
            </label>

            <input
              type="text"
              value={user?.name || ""}
              readOnly
              className="w-full rounded-xl border border-[#DCE6EF] bg-[#F8FAFC] px-4 py-3 text-sm text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Email Address
            </label>

            <input
              type="email"
              value={user?.email || ""}
              readOnly
              className="w-full rounded-xl border border-[#DCE6EF] bg-[#F8FAFC] px-4 py-3 text-sm text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Account Role
            </label>

            <input
              type="text"
              value="Administrator"
              readOnly
              className="w-full rounded-xl border border-[#DCE6EF] bg-[#F8FAFC] px-4 py-3 text-sm text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Department
            </label>

            <input
              type="text"
              value={user?.department || "Not specified"}
              readOnly
              className="w-full rounded-xl border border-[#DCE6EF] bg-[#F8FAFC] px-4 py-3 text-sm text-slate-600 outline-none"
            />
          </div>
        </div>

        <p className="mt-5 text-xs text-slate-400">
          Profile information is currently read-only.
        </p>
      </section>

      {/* Change Password */}
      <section className="rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Change Password
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Update your administrator account password.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-5">
          {/* Current Password */}
          <PasswordField
            label="Current Password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleChange}
            show={showCurrentPassword}
            onToggle={() => setShowCurrentPassword((previous) => !previous)}
            placeholder="Enter your current password"
          />

          {/* New Password */}
          <PasswordField
            label="New Password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            show={showNewPassword}
            onToggle={() => setShowNewPassword((previous) => !previous)}
            placeholder="Enter your new password"
          />

          {/* Confirm Password */}
          <PasswordField
            label="Confirm New Password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            show={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((previous) => !previous)}
            placeholder="Confirm your new password"
          />

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-800">
              Password requirements
            </p>

            <ul className="mt-2 space-y-1 text-xs text-blue-700">
              <li>• At least 8 characters</li>
              <li>• New password must differ from current password</li>
              <li>• Confirmation must match the new password</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || Boolean(success)}
            className="w-full rounded-xl bg-[#2563EB] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {loading ? "Updating Password..." : "Update Password"}
          </button>
        </form>
      </section>

      {/* Account Security */}
      <section className="mt-8 rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-700">
            ✓
          </div>

          <div>
            <h2 className="font-bold text-slate-900">
              Account Security
            </h2>

            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              LeaveDesk uses authenticated sessions and role-based access
              control to protect administrator functionality.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// Reusable password input
function PasswordField({
  label,
  name,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <div className="flex rounded-xl border border-[#DCE6EF] transition focus-within:border-[#789BC5] focus-within:ring-2 focus-within:ring-blue-100">
        <input
          id={name}
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          required
          minLength={name !== "currentPassword" ? 8 : undefined}
          placeholder={placeholder}
          autoComplete="new-password"
          className="min-w-0 flex-1 rounded-l-xl px-4 py-3 text-sm outline-none"
        />

        <button
          type="button"
          onClick={onToggle}
          className="rounded-r-xl px-4 text-xs font-semibold text-[#52749B] hover:bg-[#F8FAFC]"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
