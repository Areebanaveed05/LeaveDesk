import { useState } from "react";
import api from "../api";

export default function LoginPage({
  onLogin,
  onBackHome,
  onForgotPassword,
}) {
  const [email, setEmail] = useState(
    localStorage.getItem("rememberedEmail") || "",
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    Boolean(localStorage.getItem("rememberedEmail")),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email.trim());
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      onLogin(data.user);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EAF4FF] px-4 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto mb-6 max-w-6xl">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 font-semibold text-slate-600 transition hover:text-blue-600"
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
          Home
        </button>
      </div>

      <div className="mx-auto grid max-w-6xl items-stretch gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="flex flex-col justify-between rounded-3xl border border-blue-100 bg-[#DCEBFF] p-8 sm:p-10">
          <div>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-8 w-8"
              >
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18M8 14h3M8 17h6" />
              </svg>
            </div>

            <h2 className="mt-8 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              Welcome to
              <span className="block text-blue-600">LeaveDesk.</span>
            </h2>

            <p className="mt-5 text-base leading-8 text-slate-600">
              Simplify your workplace leave management. Manage requests, track
              approvals, and stay organized with one easy platform.
            </p>
          </div>

          <div className="mt-10 space-y-5">
            {[
              {
                title: "Easy Leave Management",
                description: "Submit and manage leave requests easily.",
              },
              {
                title: "Quick Approvals",
                description: "Keep track of pending and approved requests.",
              },
              {
                title: "Organized Team",
                description: "Stay informed about your team's availability.",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="h-5 w-5"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-semibold text-slate-800">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-10 text-xs text-slate-500">
            © 2026 LeaveDesk. All rights reserved.
          </p>
        </section>

        <section className="flex items-center rounded-3xl border border-blue-100 bg-white p-7 shadow-xl sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-9">
              <h1 className="text-3xl font-bold tracking-tight text-blue-600">
                LeaveDesk<span className="text-slate-800">.</span>
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Employee Leave Management System
              </p>
            </div>

            <div className="mb-9">
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-600">
                Welcome Back
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Sign in to your account
              </h2>
              <p className="mt-3 leading-7 text-slate-500">
                Enter your credentials to access your LeaveDesk account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 pr-16 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 hover:text-blue-600"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded accent-blue-600"
                  />
                  Remember my email
                </label>

                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Forgot Password?
                </button>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
                {!loading && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path d="M5 12h14m-7-7 7 7-7 7" />
                  </svg>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
              >
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              Your account is protected with secure authentication.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
