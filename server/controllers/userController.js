import mongoose from "mongoose";
import User from "../models/User.js";
import LeaveRequest from "../models/LeaveRequest.js";
import OrganizationUnit from "../models/OrganizationUnit.js";
import { buildSummary } from "../utils/leaveHelpers.js";

// Admin-safe employee representation. Department is derived from the
// selected sub-department's parent whenever the relationship is available.
const userView = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.subDepartment?.parent?.name || user.department || "",
  subDepartment: user.subDepartment
    ? {
        id: user.subDepartment._id,
        name: user.subDepartment.name,
      }
    : null,
  designation: user.designation || "",
  organizationTeams: (user.organizationTeams || []).map((team) => ({
    id: team._id,
    name: team.name,
  })),
  leaveAllowance: user.leaveAllowance,
  isActive: user.isActive,
  mustChangePassword: user.mustChangePassword,
  createdAt: user.createdAt,
});

const resolveYear = (value) => {
  const year = Number.parseInt(value, 10);
  return Number.isInteger(year) && year >= 2000 && year <= 2100
    ? year
    : new Date().getUTCFullYear();
};

const handleError = (err, res, label) => {
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(", ") });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid value supplied." });
  }

  if (err.code === 11000) {
    return res
      .status(409)
      .json({ message: "An account with this email already exists" });
  }

  console.error(`${label}:`, err);
  return res.status(500).json({ message: "Server error" });
};

// A valid employee sub-department must be active and have an active
// Department parent. Permanent employee Teams are intentionally not used.
const findActiveSubDepartment = async (subDepartmentId) => {
  if (!mongoose.isValidObjectId(subDepartmentId)) return null;

  const subDepartment = await OrganizationUnit.findOne({
    _id: subDepartmentId,
    type: "Sub-department",
    isActive: true,
  }).populate("parent");

  if (
    !subDepartment ||
    !subDepartment.parent ||
    subDepartment.parent.type !== "Department" ||
    !subDepartment.parent.isActive
  ) {
    return null;
  }

  return subDepartment;
};

// Validate selected organizational teams. Only active Team units are accepted.
const findActiveOrganizationTeams = async (teamIds = []) => {
  if (!Array.isArray(teamIds)) return null;

  const uniqueIds = [...new Set(teamIds.map(String))];

  if (uniqueIds.some((id) => !mongoose.isValidObjectId(id))) {
    return null;
  }

  if (uniqueIds.length === 0) return [];

  const teams = await OrganizationUnit.find({
    _id: { $in: uniqueIds },
    type: "Team",
    isActive: true,
  });

  if (teams.length !== uniqueIds.length) return null;

  return teams;
};

// Admin creates an employee account with a temporary password.
export const createEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      subDepartment: subDepartmentId,
      designation,
      organizationTeams = [],
      temporaryPassword,
      annualAllowance,
      sickAllowance,
    } = req.body;

    if (
      typeof temporaryPassword !== "string" ||
      temporaryPassword.length < 8
    ) {
      return res
        .status(400)
        .json({ message: "Temporary password must be at least 8 characters" });
    }

    if (!subDepartmentId) {
      return res.status(400).json({
        message: "Please select an active sub-department.",
      });
    }

    const selectedSubDepartment =
      await findActiveSubDepartment(subDepartmentId);

    if (!selectedSubDepartment) {
      return res.status(400).json({
        message: "Please select a valid active sub-department.",
      });
    }

    const selectedTeams = await findActiveOrganizationTeams(organizationTeams);

    if (!selectedTeams) {
      return res.status(400).json({
        message: "Please select valid active organizational teams.",
      });
    }

    const employee = await User.create({
      name,
      email,
      department: selectedSubDepartment.parent.name,
      subDepartment: selectedSubDepartment._id,
      designation: designation || "",
      organizationTeams: selectedTeams.map((team) => team._id),
      password: temporaryPassword,
      role: "employee",
      mustChangePassword: true,
      leaveAllowance: {
        annual: annualAllowance ?? 20,
        sick: sickAllowance ?? 10,
      },
    });

    await employee.populate([
      { path: "subDepartment", populate: { path: "parent" } },
      { path: "organizationTeams", select: "name type" },
    ]);

    return res.status(201).json(userView(employee));
  } catch (err) {
    return handleError(err, res, "createEmployee");
  }
};

// Admin: all employees, each with how many requests they made.
export const getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" })
      .populate({
        path: "subDepartment",
        populate: { path: "parent" },
      })
      .populate("organizationTeams", "name type")
      .sort({ name: 1 });

    const grouped = await LeaveRequest.aggregate([
      {
        $group: {
          _id: { employee: "$employee", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    const countsByEmployee = {};

    for (const group of grouped) {
      const key = String(group._id.employee);

      countsByEmployee[key] ??= {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      };

      countsByEmployee[key][group._id.status.toLowerCase()] = group.count;
      countsByEmployee[key].total += group.count;
    }

    return res.json(
      employees.map((employee) => ({
        ...userView(employee),
        counts: countsByEmployee[String(employee._id)] || {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
        },
      })),
    );
  } catch (err) {
    return handleError(err, res, "getEmployees");
  }
};

// Admin: one employee's balance, counts and full request history.
export const getEmployeeSummary = async (req, res) => {
  try {
    const employee = await User.findOne({
      _id: req.params.id,
      role: "employee",
    }).populate([
      { path: "subDepartment", populate: { path: "parent" } },
      { path: "organizationTeams", select: "name type" },
    ]);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const year = resolveYear(req.query.year);

    const [summary, requests] = await Promise.all([
      buildSummary(employee, year),
      LeaveRequest.find({ employee: employee._id }).sort({ createdAt: -1 }),
    ]);

    return res.json({ employee: userView(employee), summary, requests });
  } catch (err) {
    return handleError(err, res, "getEmployeeSummary");
  }
};

// Employee: own balance and counts.
export const getMySummary = async (req, res) => {
  try {
    const summary = await buildSummary(req.user, resolveYear(req.query.year));
    return res.json({ summary });
  } catch (err) {
    return handleError(err, res, "getMySummary");
  }
};

// Admin: edit employee details, sub-department, allowances, or account status.
export const updateEmployee = async (req, res) => {
  try {
    const employee = await User.findOne({
      _id: req.params.id,
      role: "employee",
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const {
      name,
      subDepartment: subDepartmentId,
      designation,
      organizationTeams,
      annualAllowance,
      sickAllowance,
      isActive,
    } = req.body;

    if (name !== undefined) employee.name = name;

    if (subDepartmentId !== undefined) {
      const selectedSubDepartment =
        await findActiveSubDepartment(subDepartmentId);

      if (!selectedSubDepartment) {
        return res.status(400).json({
          message: "Please select a valid active sub-department.",
        });
      }

      employee.subDepartment = selectedSubDepartment._id;
      // Keep the legacy department string synchronized for older features.
      employee.department = selectedSubDepartment.parent.name;
    }

    if (designation !== undefined) {
      employee.designation = designation;
    }

    if (organizationTeams !== undefined) {
      const selectedTeams = await findActiveOrganizationTeams(organizationTeams);

      if (!selectedTeams) {
        return res.status(400).json({
          message: "Please select valid active organizational teams.",
        });
      }

      employee.organizationTeams = selectedTeams.map((team) => team._id);
    }

    if (annualAllowance !== undefined) {
      employee.set("leaveAllowance.annual", annualAllowance);
    }

    if (sickAllowance !== undefined) {
      employee.set("leaveAllowance.sick", sickAllowance);
    }

    if (typeof isActive === "boolean") {
      employee.isActive = isActive;
    }

    await employee.save();
    await employee.populate([
      { path: "subDepartment", populate: { path: "parent" } },
      { path: "organizationTeams", select: "name type" },
    ]);

    return res.json(userView(employee));
  } catch (err) {
    return handleError(err, res, "updateEmployee");
  }
};

// Admin: set a new temporary password (for a forgotten password).
export const resetEmployeePassword = async (req, res) => {
  try {
    const { temporaryPassword } = req.body;

    if (
      typeof temporaryPassword !== "string" ||
      temporaryPassword.length < 8
    ) {
      return res
        .status(400)
        .json({ message: "Temporary password must be at least 8 characters" });
    }

    const employee = await User.findOne({
      _id: req.params.id,
      role: "employee",
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    employee.password = temporaryPassword;
    employee.mustChangePassword = true;
    await employee.save();

    return res.json({
      message: "Temporary password set. Employee must change it.",
    });
  } catch (err) {
    return handleError(err, res, "resetEmployeePassword");
  }
};
