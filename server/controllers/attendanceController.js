import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import LeaveRequest from "../models/LeaveRequest.js";

const REQUIRED_MINUTES = 480; // 9 AM - 5 PM = 8 hours
const HALF_DAY_MINUTES = 240;
const TIME_ZONE = "Asia/Karachi";
const OFFICE_CLOSE_MINUTES = 17 * 60; // 5:00 PM

// ------------------------------------------
// DATE HELPERS
// ------------------------------------------

const getPakistanDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const getPakistanTimeMinutes = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 60 + Number(values.minute);
};

const isOfficeDayClosed = () => getPakistanTimeMinutes() >= OFFICE_CLOSE_MINUTES;

const isValidDateKey = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const isWeekendDate = (dateKey) => {
  const day = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  return day === 0 || day === 6;
};

const getDateRange = (dateKey) => {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
};

// ------------------------------------------
// APPROVED LEAVE HELPERS
// ------------------------------------------

const getApprovedLeaveForDate = async (employeeId, dateKey) => {
  const { start, end } = getDateRange(dateKey);

  return LeaveRequest.findOne({
    employee: employeeId,
    status: "Approved",
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).sort({ createdAt: -1 });
};

const getDailyRequirement = (leaveRequest) => {
  if (!leaveRequest) {
    return {
      requiredMinutes: REQUIRED_MINUTES,
      leaveStatus: null,
      isFullDayLeave: false,
    };
  }

  switch (leaveRequest.type) {
    case "Annual Leave":
    case "Sick Leave":
      return {
        requiredMinutes: 0,
        leaveStatus: "On Leave",
        isFullDayLeave: true,
      };

    case "Half Day":
      return {
        requiredMinutes: HALF_DAY_MINUTES,
        leaveStatus: "Half Day",
        isFullDayLeave: false,
      };

    case "Work From Home":
      return {
        requiredMinutes: REQUIRED_MINUTES,
        leaveStatus: "Work From Home",
        isFullDayLeave: false,
      };

    default:
      return {
        requiredMinutes: REQUIRED_MINUTES,
        leaveStatus: null,
        isFullDayLeave: false,
      };
  }
};

// ------------------------------------------
// WORKING HOURS HELPERS
// ------------------------------------------

const calculateWorkedMinutes = (sessions = []) =>
  sessions.reduce((total, session) => {
    if (!session.checkIn || !session.checkOut) return total;

    const duration =
      new Date(session.checkOut).getTime() -
      new Date(session.checkIn).getTime();

    return duration > 0 ? total + Math.floor(duration / 60000) : total;
  }, 0);

const calculateLiveWorkedMinutes = (sessions = []) => {
  const completedMinutes = calculateWorkedMinutes(sessions);
  const activeSession = sessions.find((session) => !session.checkOut);

  if (!activeSession?.checkIn) return completedMinutes;

  const activeDuration =
    Date.now() - new Date(activeSession.checkIn).getTime();

  if (activeDuration <= 0) return completedMinutes;

  return completedMinutes + Math.floor(activeDuration / 60000);
};

const updateAttendanceTotals = (attendance) => {
  const workedMinutes = calculateWorkedMinutes(attendance.sessions);
  const requiredMinutes = attendance.requiredMinutes ?? REQUIRED_MINUTES;

  attendance.workedMinutes = workedMinutes;
  attendance.shortageMinutes = Math.max(0, requiredMinutes - workedMinutes);
  attendance.extraMinutes = Math.max(0, workedMinutes - requiredMinutes);
};

// ------------------------------------------
// EMPLOYEE: CHECK IN
// ------------------------------------------

export const checkIn = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const today = getPakistanDate();

    if (isWeekendDate(today)) {
      return res.status(400).json({
        message: "Check-in is not available on weekends.",
      });
    }

    // Approved leave does NOT block check-in. If an employee comes to work
    // during leave, their attendance session is still recorded.
    const approvedLeave = await getApprovedLeaveForDate(employeeId, today);
    const requirement = getDailyRequirement(approvedLeave);

    const existingOpenAttendance = await Attendance.findOne({
      employee: employeeId,
      "sessions.checkOut": null,
    });

    if (existingOpenAttendance) {
      return res.status(400).json({
        message: "Please check out from your previous session first.",
      });
    }

    let attendance = await Attendance.findOne({
      employee: employeeId,
      dateKey: today,
    });

    if (!attendance) {
      attendance = new Attendance({
        employee: employeeId,
        dateKey: today,
        requiredMinutes: requirement.requiredMinutes,
        sessions: [],
      });
    }

    attendance.requiredMinutes = requirement.requiredMinutes;
    attendance.sessions.push({
      checkIn: new Date(),
      checkOut: null,
    });

    await attendance.save();

    return res.status(200).json({
      message: "Check-in successful.",
      attendance,
      leaveStatus: requirement.leaveStatus,
    });
  } catch (error) {
    console.error("Check-in error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Attendance already exists for today. Please try again.",
      });
    }

    return res.status(500).json({ message: "Unable to check in." });
  }
};

// ------------------------------------------
// EMPLOYEE: CHECK OUT
// ------------------------------------------

export const checkOut = async (req, res) => {
  try {
    const employeeId = req.user._id;

    const attendance = await Attendance.findOne({
      employee: employeeId,
      "sessions.checkOut": null,
    }).sort({ dateKey: -1 });

    if (!attendance) {
      return res.status(400).json({
        message: "You are not currently checked in.",
      });
    }

    const openSession = attendance.sessions.find((session) => !session.checkOut);

    if (!openSession) {
      return res.status(400).json({
        message: "No active check-in session found.",
      });
    }

    const now = new Date();

    if (now <= new Date(openSession.checkIn)) {
      return res.status(400).json({ message: "Invalid check-out time." });
    }

    openSession.checkOut = now;

    // Refresh the requirement in case the leave request was approved
    // while the employee's attendance session was active.
    const approvedLeave = await getApprovedLeaveForDate(
      employeeId,
      attendance.dateKey
    );
    const requirement = getDailyRequirement(approvedLeave);

    attendance.requiredMinutes = requirement.requiredMinutes;
    updateAttendanceTotals(attendance);

    await attendance.save();

    return res.status(200).json({
      message: "Check-out successful.",
      attendance,
      leaveStatus: requirement.leaveStatus,
    });
  } catch (error) {
    console.error("Check-out error:", error);
    return res.status(500).json({ message: "Unable to check out." });
  }
};

// ------------------------------------------
// EMPLOYEE: VIEW OWN ATTENDANCE
// ------------------------------------------

export const getMyAttendance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { employee: req.user._id };

    if (startDate || endDate) {
      if (
        (startDate && !isValidDateKey(startDate)) ||
        (endDate && !isValidDateKey(endDate))
      ) {
        return res.status(400).json({
          message: "Invalid date format. Use YYYY-MM-DD.",
        });
      }

      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({
          message: "Start date cannot be after end date.",
        });
      }

      filter.dateKey = {};
      if (startDate) filter.dateKey.$gte = startDate;
      if (endDate) filter.dateKey.$lte = endDate;
    }

    const records = await Attendance.find(filter).sort({ dateKey: -1 });

    const enrichedRecords = await Promise.all(
      records.map(async (record) => {
        const approvedLeave = await getApprovedLeaveForDate(
          req.user._id,
          record.dateKey
        );
        const requirement = getDailyRequirement(approvedLeave);

        return {
          ...record.toObject(),
          requiredMinutes: requirement.requiredMinutes,
          leaveStatus: requirement.leaveStatus,
        };
      })
    );

    return res.status(200).json(enrichedRecords);
  } catch (error) {
    console.error("My attendance error:", error);
    return res.status(500).json({
      message: "Unable to load attendance history.",
    });
  }
};

// ------------------------------------------
// ADMIN: VIEW ALL EMPLOYEES' ATTENDANCE
// ------------------------------------------

export const getAdminAttendance = async (req, res) => {
  try {
    const date = req.query.date || getPakistanDate();

    if (!isValidDateKey(date)) {
      return res.status(400).json({
        message: "Invalid date. Use YYYY-MM-DD.",
      });
    }

    const isWeekend = isWeekendDate(date);
    const today = getPakistanDate();
    const isToday = date === today;
    const dayHasEnded = isToday && isOfficeDayClosed();
    const { start, end } = getDateRange(date);

    const [employees, records, approvedLeaves] = await Promise.all([
      User.find({ role: "employee", isActive: true })
        .populate({
          path: "subDepartment",
          populate: { path: "parent" },
        })
        .sort({ name: 1 }),

      Attendance.find({ dateKey: date }),

      LeaveRequest.find({
        status: "Approved",
        startDate: { $lte: end },
        endDate: { $gte: start },
      }),
    ]);

    const recordsByEmployee = new Map(
      records.map((record) => [String(record.employee), record])
    );

    const leavesByEmployee = new Map(
      approvedLeaves.map((leave) => [String(leave.employee), leave])
    );

    const attendance = employees.map((employee) => {
      const record = recordsByEmployee.get(String(employee._id));
      const leave = leavesByEmployee.get(String(employee._id));
      const sessions = record?.sessions || [];

      const workedMinutes = calculateLiveWorkedMinutes(sessions);
      const openSession = sessions.find((session) => !session.checkOut);

      const requirement = getDailyRequirement(leave);
      const requiredMinutes = isWeekend ? 0 : requirement.requiredMinutes;

      const shortageMinutes = isWeekend
        ? 0
        : Math.max(0, requiredMinutes - workedMinutes);

      const extraMinutes = isWeekend
        ? 0
        : Math.max(0, workedMinutes - requiredMinutes);

      let status = "Absent";

      if (isWeekend) {
        status = "Day Off";
      } else if (openSession) {
        // Actual attendance takes precedence over leave status.
        status = "Checked In";
      } else if (record && workedMinutes > 0) {
        status = shortageMinutes > 0 ? "Incomplete" : "Completed";
      } else if (requirement.isFullDayLeave) {
        status = "On Leave";
      } else if (requirement.leaveStatus === "Half Day") {
        status = "Half Day";
      } else if (requirement.leaveStatus === "Work From Home") {
        status = "Work From Home";
      } else if (isToday && !dayHasEnded) {
        status = "Not Checked In";
      } else {
        // At/after 5 PM Pakistan time, employees with no check-in and
        // no approved leave are automatically shown as Absent.
        status = "Absent";
      }

      return {
        employee: {
          id: employee._id,
          name: employee.name,
          email: employee.email,
          department:
            employee.subDepartment?.parent?.name ||
            employee.department ||
            "",
          subDepartment: employee.subDepartment?.name || "",
          designation: employee.designation || "",
        },

        date,
        sessions,
        checkIn: sessions[0]?.checkIn || null,
        checkOut:
          sessions.length && !openSession
            ? sessions[sessions.length - 1].checkOut
            : null,

        workedMinutes,
        requiredMinutes,
        shortageMinutes,
        extraMinutes,
        isCurrentlyCheckedIn: Boolean(openSession),
        status,

        leave: leave
          ? {
              type: leave.type,
              startDate: leave.startDate,
              endDate: leave.endDate,
              days: leave.days,
            }
          : null,
      };
    });

    const summary = {
      totalEmployees: employees.length,

      present: attendance.filter((item) =>
        ["Checked In", "Incomplete", "Completed"].includes(item.status)
      ).length,

      absent: attendance.filter((item) => item.status === "Absent").length,
      onLeave: attendance.filter((item) => item.status === "On Leave").length,
      halfDay: attendance.filter((item) => item.status === "Half Day").length,
      workFromHome: attendance.filter(
        (item) => item.status === "Work From Home"
      ).length,

      currentlyCheckedIn: attendance.filter(
        (item) => item.isCurrentlyCheckedIn
      ).length,

      incomplete: attendance.filter((item) => item.shortageMinutes > 0).length,

      totalWorkedMinutes: attendance.reduce(
        (sum, item) => sum + item.workedMinutes,
        0
      ),

      totalShortageMinutes: attendance.reduce(
        (sum, item) => sum + item.shortageMinutes,
        0
      ),

      totalExtraMinutes: attendance.reduce(
        (sum, item) => sum + item.extraMinutes,
        0
      ),
    };

    return res.status(200).json({
      date,
      isWeekend,
      dayHasEnded,
      officeClosingTime: "17:00",
      summary,
      attendance,
    });
  } catch (error) {
    console.error("Admin attendance error:", error);
    return res.status(500).json({
      message: "Unable to load attendance records.",
    });
  }
};
