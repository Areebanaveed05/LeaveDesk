import LeaveRequest from "../models/LeaveRequest.js";

export const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const BUCKET_NAMES = {
  annual: "annual leave",
  sick: "sick leave",
};

const getOrganizationTimeZone = () =>
  process.env.ORG_TIME_ZONE || "Asia/Karachi";

const getOrganizationDate = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getOrganizationTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const dateParts = {};
  for (const part of parts) dateParts[part.type] = part.value;

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
};

export const parseDateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
};

export const getBucket = (type) => {
  if (type === "Sick Leave") return "sick";
  if (type === "Annual Leave" || type === "Half Day") return "annual";
  return null;
};

export const calculateDays = (type, start, end) => {
  if (type === "Half Day") return 0.5;
  return Math.round((end.getTime() - start.getTime()) / DAY_IN_MS) + 1;
};

export const getDayRange = (dateParam) => {
  const dateString =
    dateParam !== undefined ? String(dateParam) : getOrganizationDate();

  const start = parseDateOnly(dateString);
  if (!start) return null;

  return {
    start,
    end: new Date(start.getTime() + DAY_IN_MS - 1),
  };
};

const allowanceOf = (user) => ({
  annual: user.leaveAllowance?.annual ?? 20,
  sick: user.leaveAllowance?.sick ?? 10,
});

export const getBalance = async (user, year, excludeId = null) => {
  const allowance = allowanceOf(user);

  const balance = {
    annual: { allowance: allowance.annual, used: 0, pending: 0 },
    sick: { allowance: allowance.sick, used: 0, pending: 0 },
  };

  const filter = {
    employee: user._id,
    status: { $in: ["Approved", "Pending"] },
    startDate: {
      $gte: new Date(Date.UTC(year, 0, 1)),
      $lt: new Date(Date.UTC(year + 1, 0, 1)),
    },
  };

  if (excludeId) filter._id = { $ne: excludeId };

  const requests = await LeaveRequest.find(filter).select("type status days");

  for (const request of requests) {
    const bucket = getBucket(request.type);
    if (!bucket) continue;

    if (request.status === "Approved") {
      balance[bucket].used += request.days;
    } else {
      balance[bucket].pending += request.days;
    }
  }

  for (const item of Object.values(balance)) {
    item.remaining = item.allowance - item.used;
    item.available = item.allowance - item.used - item.pending;
  }

  return balance;
};

export const buildSummary = async (user, year) => {
  const balance = await getBalance(user, year);

  const all = await LeaveRequest.find({
    employee: user._id,
  }).select("type status days startDate");

  const counts = {
    total: all.length,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  let wfhDays = 0;

  for (const request of all) {
    counts[request.status.toLowerCase()] += 1;

    if (
      request.type === "Work From Home" &&
      request.status === "Approved" &&
      request.startDate.getUTCFullYear() === year
    ) {
      wfhDays += request.days;
    }
  }

  return { year, balance, counts, wfhDays };
};
