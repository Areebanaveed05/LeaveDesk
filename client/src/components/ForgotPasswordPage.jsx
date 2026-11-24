
import { useState } from "react";
import api from "../api";

export default function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState(
    localStorage.getItem("rememberedEmail") || "",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const { data } = await api.post("/auth/forgot-password", {
        email,
      });

      setMessage(data.message);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to send reset email. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EAF4FF] px-4 py-8 sm:px-6">

      <div className="w-full max-w-lg">

        {/* Forgot Password Card */}
        <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl sm:p-8">

          {/* Back to Sign In */}
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="m15 18-6-6 6-6" />
              <path d="M20 12H9" />
            </svg>
            Sign In
          </button>

          {/* Logo */}
          <div className="mb-4 mt-4 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-blue-600 sm:text-3xl">
              LeaveDesk<span className="text-slate-800">.</span>
            </h1>

            <p className="mt-1.5 text-sm text-slate-500">
              Account Recovery
            </p>
          </div>

          {/* Main Heading with Email Icon */}
          <div className="mb-5 flex items-center justify-center gap-3">

            {/* Email Icon */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 sm:h-14 sm:w-14">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-7 w-7 sm:h-8 sm:w-8"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </div>

            {/* Forgot Password Heading */}
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Forgot Password?
            </h2>
          </div>

          {/* Description */}
          <p className="mb-5 text-center text-sm leading-6 text-slate-500">
            Enter your registered email address. We will send you a password
            reset link to recover your account.
          </p>

          {/* Forgot Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email Input */}
            <div>
              <label
                htmlFor="forgotEmail"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email Address
              </label>

              <input
                id="forgotEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* Error Message */}
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600"
              >
                {error}
              </p>
            )}

            {/* Success Message */}
            {message && (
              <p
                role="status"
                className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm leading-6 text-green-700"
              >
                {message}
              </p>
            )}

            {/* Send Reset Link */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-xs text-slate-400">
          © 2026 LeaveDesk. All rights reserved.
        </p>

      </div>
    </div>
  );
}
