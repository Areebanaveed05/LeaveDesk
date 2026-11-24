
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import api from "../api";
import useDismiss from "../hooks/useDismiss";

import {
  getDateKey,
  parseDateKey,
  formatLocalDate,
} from "../utils/date";

const TYPES = [
  "Work From Home",
  "Annual Leave",
  "Sick Leave",
  "Half Day",
];

const emptyForm = {
  type: "",
  startDate: "",
  endDate: "",
  reason: "",
};

const formatPickerDate = (value) => {
  if (!value) return "Choose date";
  return formatLocalDate(parseDateKey(value));
};

// ==========================================
// CUSTOM DROPDOWN
// ==========================================

function CustomSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const baseId = useId();
  const buttonId = `${baseId}-button`;
  const labelId = `${baseId}-label`;
  const valueId = `${baseId}-value`;

  const closeMenu = useCallback(() => setOpen(false), []);

  useDismiss(containerRef, open, closeMenu);

  return (
    <div className="relative" ref={containerRef}>
      <label
        id={labelId}
        htmlFor={buttonId}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <button
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${valueId}`}
        onClick={() => setOpen((previous) => !previous)}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#789BC5] ${
          open
            ? "border-[#789BC5] bg-white ring-2 ring-[#DCE8F6]"
            : "border-[#D9E5F0] bg-[#F0F5FA] hover:border-[#AFC5DF]"
        }`}
      >
        <span
          id={valueId}
          className={value ? "text-slate-800" : "text-slate-400"}
        >
          {value || placeholder}
        </span>

        <span
          aria-hidden="true"
          className={`text-[#52749B] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-labelledby={labelId}
          className="absolute z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-[#D9E5F0] bg-white p-1.5 shadow-xl shadow-slate-200/70"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                value === option
                  ? "bg-[#E8F0FA] font-semibold text-[#52749B]"
                  : "text-slate-700 hover:bg-[#F0F5FA] hover:text-[#52749B]"
              }`}
            >
              {option}

              {value === option && (
                <span
                  aria-hidden="true"
                  className="float-right text-[#52749B]"
                >
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// CUSTOM DATE PICKER
// ==========================================

function CustomDatePicker({
  label,
  value,
  onChange,
  minDate,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const baseId = useId();
  const buttonId = `${baseId}-button`;
  const labelId = `${baseId}-label`;
  const valueId = `${baseId}-value`;

  const closeCalendar = useCallback(() => setOpen(false), []);

  useDismiss(containerRef, open, closeCalendar);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = value ? parseDateKey(value) : new Date();

    return new Date(
      base.getFullYear(),
      base.getMonth(),
      1
    );
  });

  const [today] = useState(() => getDateKey(new Date()));

  const firstDay = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1
  );

  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0
  ).getDate();

  // Week starts on Monday
  const startingDay = (firstDay.getDay() + 6) % 7;

  const calendarDays = [
    ...Array(startingDay).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => index + 1
    ),
  ];

  const changeMonth = (amount) => {
    setVisibleMonth((previous) =>
      new Date(
        previous.getFullYear(),
        previous.getMonth() + amount,
        1
      )
    );
  };

  const selectDate = (day) => {
    const selectedDate = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      day
    );

    const dateKey = getDateKey(selectedDate);

    if (minDate && dateKey < minDate) return;

    onChange(dateKey);
    setOpen(false);
  };

  const selectToday = () => {
    if (minDate && today < minDate) return;

    onChange(today);

    setVisibleMonth(
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      )
    );

    setOpen(false);
  };

  const todayDisabled = minDate && today < minDate;

  return (
    <div className="relative" ref={containerRef}>
      <label
        id={labelId}
        htmlFor={buttonId}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <button
        id={buttonId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${valueId}`}
        onClick={() => setOpen((previous) => !previous)}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#789BC5] ${
          open
            ? "border-[#789BC5] bg-white ring-2 ring-[#DCE8F6]"
            : "border-[#D9E5F0] bg-[#F0F5FA] hover:border-[#AFC5DF]"
        }`}
      >
        <span
          id={valueId}
          className={value ? "text-slate-800" : "text-slate-400"}
        >
          {formatPickerDate(value)}
        </span>

        <svg
          className="h-5 w-5 text-[#52749B]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${label} calendar`}
          className="absolute left-0 z-40 mt-2 w-[min(100%,320px)] rounded-2xl border border-[#D9E5F0] bg-white p-4 shadow-xl shadow-slate-200/70"
        >
          {/* Calendar Header */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">
              {visibleMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h3>

            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => changeMonth(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F0FA] text-[#52749B] transition-colors hover:bg-[#D9E7F6]"
              >
                ‹
              </button>

              <button
                type="button"
                aria-label="Next month"
                onClick={() => changeMonth(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F0FA] text-[#52749B] transition-colors hover:bg-[#D9E7F6]"
              >
                ›
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="mb-2 grid grid-cols-7 gap-1 text-center">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(
              (day) => (
                <span
                  key={day}
                  className="py-2 text-xs font-bold text-[#789BC5]"
                >
                  {day}
                </span>
              )
            )}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`blank-${index}`} />;
              }

              const dateKey = getDateKey(
                new Date(
                  visibleMonth.getFullYear(),
                  visibleMonth.getMonth(),
                  day
                )
              );

              const isSelected = value === dateKey;
              const isToday = today === dateKey;
              const isDisabled = minDate && dateKey < minDate;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  aria-label={formatLocalDate(
                    new Date(
                      visibleMonth.getFullYear(),
                      visibleMonth.getMonth(),
                      day
                    ),
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                  onClick={() => selectDate(day)}
                  className={`flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-all duration-150 ${
                    isDisabled
                      ? "cursor-not-allowed text-slate-300"
                      : isSelected
                        ? "bg-[#789BC5] font-bold text-white shadow-sm"
                        : isToday
                          ? "border border-[#AFC5DF] bg-[#E8F0FA] font-bold text-[#52749B]"
                          : "text-slate-700 hover:bg-[#E8F0FA] hover:text-[#52749B]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Calendar Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100"
            >
              Clear
            </button>

            <button
              type="button"
              disabled={todayDisabled}
              onClick={selectToday}
              className="rounded-lg bg-[#E8F0FA] px-3 py-2 text-xs font-semibold text-[#52749B] transition-colors hover:bg-[#D9E7F6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// REQUEST FORM
// ==========================================

export default function RequestForm({ onCreated }) {
  const [form, setForm] = useState(emptyForm);

  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================
  // LOAD LOGGED-IN EMPLOYEE
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const fetchCurrentUser = async () => {
      try {
        setLoadingUser(true);

        const { data } = await api.get("/auth/me");

        if (!cancelled) {
          setCurrentUser(data.user);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load your account details. Please log in again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingUser(false);
        }
      }
    };

    fetchCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // FORM HANDLERS
  // ==========================================

  const handleChange = (e) => {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));

    setError("");
    setSuccess("");
  };

  const updateField = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,

      // Clear end date if it is before the new start date
      ...(name === "startDate" &&
      previous.endDate &&
      previous.endDate < value
        ? { endDate: "" }
        : {}),
    }));

    setError("");
    setSuccess("");
  };

  // ==========================================
  // SUBMIT REQUEST
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!currentUser) {
      setError("Your account details could not be loaded. Please log in again.");
      return;
    }

    if (
      !form.type ||
      !form.startDate ||
      !form.endDate ||
      !form.reason.trim()
    ) {
      setError("Please complete all fields before submitting.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError("End date must be on or after the start date.");
      return;
    }

    setSubmitting(true);

    try {
      // Name and department are intentionally NOT sent.
      // The backend gets them from the authenticated user.
      const { data } = await api.post("/requests", {
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
      });

      if (onCreated) {
        onCreated(data);
      }

      setForm(emptyForm);

      setSuccess(
        "Your leave request has been submitted successfully!"
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not submit the request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // STYLES
  // ==========================================

  const inputClass =
    "w-full rounded-xl border border-[#D9E5F0] bg-[#F0F5FA] px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-[#AFC5DF] focus:border-[#789BC5] focus:bg-white focus:ring-2 focus:ring-[#DCE8F6]";

  const labelClass =
    "mb-2 block text-sm font-semibold text-slate-700";

  // ==========================================
  // UI
  // ==========================================

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mb-8 rounded-2xl border border-[#DCE6EF] bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-7 lg:p-8"
    >
      {/* Form Header */}
      <div className="mb-7 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F0FA] text-xl text-[#52749B]"
          >
            +
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Submit a Request
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter the details below to create a new request.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-[#FCE5E5] px-4 py-3 text-sm font-medium text-[#B54343]"
        >
          <span aria-hidden="true" className="text-lg">
            !
          </span>

          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div
          role="status"
          className="mb-5 flex items-center gap-3 rounded-xl border border-[#C9E2D1] bg-[#E3F1E8] px-4 py-3 text-sm font-medium text-[#527D61]"
        >
          <span aria-hidden="true" className="text-lg">
            ✓
          </span>

          {success}
        </div>
      )}

      <div className="space-y-5">

        {/* Employee Name and Department */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

          <div>
            <label
              htmlFor="employeeName"
              className={labelClass}
            >
              Employee Name
            </label>

            <input
              id="employeeName"
              type="text"
              value={
                loadingUser
                  ? "Loading account..."
                  : currentUser?.name || ""
              }
              readOnly
              disabled={loadingUser || !currentUser}
              placeholder="Employee name"
              className={`${inputClass} cursor-not-allowed bg-[#E8F0FA]`}
            />
          </div>

          <div>
            <label
              htmlFor="department"
              className={labelClass}
            >
              Department
            </label>

            <input
              id="department"
              type="text"
              value={
                loadingUser
                  ? "Loading account..."
                  : currentUser?.department || ""
              }
              readOnly
              disabled={loadingUser || !currentUser}
              placeholder="Department"
              className={`${inputClass} cursor-not-allowed bg-[#E8F0FA]`}
            />
          </div>

        </div>

        {/* Request Type */}
        <div>
          <CustomSelect
            label="Request Type"
            value={form.type}
            options={TYPES}
            placeholder="Select request type"
            onChange={(value) => updateField("type", value)}
          />
        </div>

        {/* Start Date and End Date */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CustomDatePicker
            label="Start Date"
            value={form.startDate}
            onChange={(value) => updateField("startDate", value)}
          />

          <CustomDatePicker
            label="End Date"
            value={form.endDate}
            minDate={form.startDate}
            onChange={(value) => updateField("endDate", value)}
          />
        </div>

        {/* Reason */}
        <div>
          <label
            htmlFor="reason"
            className={labelClass}
          >
            Reason
          </label>

          <textarea
            id="reason"
            name="reason"
            value={form.reason}
            onChange={handleChange}
            placeholder="Write the reason for your request..."
            required
            aria-required="true"
            rows={4}
            className={`${inputClass} resize-y`}
          />
        </div>

      </div>

      {/* Submit Button */}
      <div className="mt-7 flex justify-center border-t border-slate-100 pt-6">
        <button
          type="submit"
          disabled={submitting || loadingUser || !currentUser}
          className="inline-flex min-w-52 items-center justify-center gap-2 rounded-xl border border-[#C9D9EE] bg-[#E8F0FA] px-8 py-3.5 text-sm font-bold text-[#52749B] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#AFC5DF] hover:bg-[#DCE8F6] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#789BC5]/40 border-t-[#52749B]" />
              Submitting...
            </>
          ) : loadingUser ? (
            "Loading Account..."
          ) : (
            <>
              <span aria-hidden="true" className="text-lg">
                +
              </span>
              Submit Request
            </>
          )}
        </button>
      </div>
    </form>
  );
}
