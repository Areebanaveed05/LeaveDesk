// Shared date helpers used across the app.

const DEFAULT_OPTIONS = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

// "YYYY-MM-DD" built from the LOCAL calendar values of a Date.
export const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// "YYYY-MM-DD" string -> local Date at midnight.
export const parseDateKey = (value) => {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Format a local Date object.
export const formatLocalDate = (date, options = DEFAULT_OPTIONS) =>
  date.toLocaleDateString("en-GB", options);

// Format an ISO date coming from the API.
// Dates are stored as midnight UTC, so we format them in UTC
// to avoid showing the previous day in some timezones.
export const formatUTCDate = (iso, options = DEFAULT_OPTIONS) =>
  new Date(iso).toLocaleDateString("en-GB", {
    ...options,
    timeZone: "UTC",
  });

// ISO string from the API -> "YYYY-MM-DD" (the stored calendar day).
export const toDateKey = (iso) => String(iso).slice(0, 10);
