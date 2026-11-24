
import mongoose from "mongoose";
import OrganizationUnit from "../models/OrganizationUnit.js";
import User from "../models/User.js";

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const handleError = (err, res, label) => {
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map(
      (error) => error.message
    );

    return res.status(400).json({
      message: messages.join(", "),
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID provided.",
    });
  }

  console.error(`${label}:`, err);

  return res.status(500).json({
    message: "Server error",
  });
};

const getExpectedParentType = (type) => {
  if (type === "Department") return null;
  if (type === "Sub-department") return "Department";
  if (type === "Team") return "Sub-department";

  return undefined;
};

// Validate parent-child relationship.
const validateParent = async (type, parentId) => {
  const expectedParentType = getExpectedParentType(type);

  if (expectedParentType === undefined) {
    return {
      valid: false,
      message: "Invalid organization unit type.",
    };
  }

  if (type === "Department") {
    if (parentId) {
      return {
        valid: false,
        message: "A department cannot have a parent.",
      };
    }

    return { valid: true };
  }

  if (!parentId) {
    return {
      valid: false,
      message: `${type} must have a parent.`,
    };
  }

  if (!mongoose.isValidObjectId(parentId)) {
    return {
      valid: false,
      message: "Invalid parent ID.",
    };
  }

  const parent = await OrganizationUnit.findById(parentId);

  if (!parent) {
    return {
      valid: false,
      message: "Parent organization unit not found.",
    };
  }

  if (!parent.isActive) {
    return {
      valid: false,
      message: "Cannot add a unit under an inactive parent.",
    };
  }

  if (parent.type !== expectedParentType) {
    return {
      valid: false,
      message: `${type} must belong to a ${expectedParentType}.`,
    };
  }

  return {
    valid: true,
    parent,
  };
};

// GET: Fetch complete organization hierarchy.
export const getOrganizationTree = async (req, res) => {
  try {
    const [departments, subDepartments, teams] = await Promise.all([
      OrganizationUnit.find({ type: "Department" })
        .populate("manager", "name email")
        .sort({ name: 1 })
        .lean(),

      OrganizationUnit.find({ type: "Sub-department" })
        .populate("manager", "name email")
        .sort({ name: 1 })
        .lean(),

      OrganizationUnit.find({ type: "Team" })
        .populate("manager", "name email")
        .sort({ name: 1 })
        .lean(),
    ]);

    const teamsByParent = new Map();

    teams.forEach((team) => {
      const parentId = String(team.parent);

      if (!teamsByParent.has(parentId)) {
        teamsByParent.set(parentId, []);
      }

      teamsByParent.get(parentId).push(team);
    });

    const subDepartmentsByParent = new Map();

    subDepartments.forEach((subDepartment) => {
      const parentId = String(subDepartment.parent);

      const subDepartmentWithTeams = {
        ...subDepartment,
        teams: teamsByParent.get(String(subDepartment._id)) || [],
      };

      if (!subDepartmentsByParent.has(parentId)) {
        subDepartmentsByParent.set(parentId, []);
      }

      subDepartmentsByParent.get(parentId).push(
        subDepartmentWithTeams
      );
    });

    const organizationTree = departments.map((department) => ({
      ...department,
      subDepartments:
        subDepartmentsByParent.get(String(department._id)) || [],
    }));

    return res.json(organizationTree);
  } catch (err) {
    return handleError(err, res, "getOrganizationTree");
  }
};

// GET: Fetch organization units with optional filters.
export const getOrganizationUnits = async (req, res) => {
  try {
    const { type, parent } = req.query;
    const filter = {};

    if (type) {
      if (
        !["Department", "Sub-department", "Team"].includes(type)
      ) {
        return res.status(400).json({
          message: "Invalid organization unit type.",
        });
      }

      filter.type = type;
    }

    if (parent === "null") {
      filter.parent = null;
    } else if (parent) {
      if (!mongoose.isValidObjectId(parent)) {
        return res.status(400).json({
          message: "Invalid parent ID.",
        });
      }

      filter.parent = parent;
    }

    const units = await OrganizationUnit.find(filter)
      .populate("parent", "name type")
      .populate("manager", "name email")
      .sort({ name: 1 });

    return res.json(units);
  } catch (err) {
    return handleError(err, res, "getOrganizationUnits");
  }
};

// POST: Create a department, sub-department or team.
export const createOrganizationUnit = async (req, res) => {
  try {
    const { name, type, parent, description } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Organization unit name is required.",
      });
    }

    if (!type) {
      return res.status(400).json({
        message: "Organization unit type is required.",
      });
    }

    const parentValidation = await validateParent(type, parent);

    if (!parentValidation.valid) {
      return res.status(400).json({
        message: parentValidation.message,
      });
    }

    const duplicateFilter = {
      name: {
        $regex: `^${escapeRegex(name.trim())}$`,
        $options: "i",
      },
      parent: parent || null,
    };

    const existingUnit = await OrganizationUnit.findOne(
      duplicateFilter
    );

    if (existingUnit) {
      return res.status(409).json({
        message:
          "An organization unit with this name already exists under this parent.",
      });
    }

    const organizationUnit = await OrganizationUnit.create({
      name: name.trim(),
      type,
      parent: parent || null,
      description: description || "",
    });

    const populatedUnit = await OrganizationUnit.findById(
      organizationUnit._id
    )
      .populate("parent", "name type")
      .populate("manager", "name email");

    return res.status(201).json({
      message: `${type} created successfully.`,
      organizationUnit: populatedUnit,
    });
  } catch (err) {
    return handleError(err, res, "createOrganizationUnit");
  }
};

// PATCH: Update unit name, description or manager.
export const updateOrganizationUnit = async (req, res) => {
  try {
    const organizationUnit = await OrganizationUnit.findById(
      req.params.id
    );

    if (!organizationUnit) {
      return res.status(404).json({
        message: "Organization unit not found.",
      });
    }

    const { name, description, manager } = req.body;

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Organization unit name is required.",
        });
      }

      const duplicate = await OrganizationUnit.findOne({
        _id: { $ne: organizationUnit._id },
        parent: organizationUnit.parent,
        name: {
          $regex: `^${escapeRegex(name.trim())}$`,
          $options: "i",
        },
      });

      if (duplicate) {
        return res.status(409).json({
          message: "Another unit with this name already exists.",
        });
      }

      organizationUnit.name = name.trim();
    }

    if (description !== undefined) {
      organizationUnit.description = description;
    }

    if (manager !== undefined) {
      if (manager === null || manager === "") {
        organizationUnit.manager = null;
      } else {
        if (!mongoose.isValidObjectId(manager)) {
          return res.status(400).json({
            message: "Invalid manager ID.",
          });
        }

        const selectedManager = await User.findOne({
          _id: manager,
          role: "employee",
          isActive: true,
        });

        if (!selectedManager) {
          return res.status(400).json({
            message: "Manager must be an active employee.",
          });
        }

        organizationUnit.manager = selectedManager._id;
      }
    }

    await organizationUnit.save();

    const updatedUnit = await OrganizationUnit.findById(
      organizationUnit._id
    )
      .populate("parent", "name type")
      .populate("manager", "name email");

    return res.json({
      message: "Organization unit updated successfully.",
      organizationUnit: updatedUnit,
    });
  } catch (err) {
    return handleError(err, res, "updateOrganizationUnit");
  }
};

// PATCH: Activate or deactivate a unit.
export const updateOrganizationUnitStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false.",
      });
    }

    const organizationUnit = await OrganizationUnit.findById(
      req.params.id
    );

    if (!organizationUnit) {
      return res.status(404).json({
        message: "Organization unit not found.",
      });
    }

    // Do not deactivate a parent while it has active children.
    if (!isActive) {
      const activeChild = await OrganizationUnit.findOne({
        parent: organizationUnit._id,
        isActive: true,
      });

      if (activeChild) {
        return res.status(400).json({
          message:
            "Deactivate all child units before deactivating this unit.",
        });
      }
    }

    // A child cannot be activated under an inactive parent.
    if (isActive && organizationUnit.parent) {
      const parent = await OrganizationUnit.findById(
        organizationUnit.parent
      );

      if (!parent || !parent.isActive) {
        return res.status(400).json({
          message: "Activate the parent unit first.",
        });
      }
    }

    organizationUnit.isActive = isActive;

    await organizationUnit.save();

    const updatedUnit = await OrganizationUnit.findById(
      organizationUnit._id
    )
      .populate("parent", "name type")
      .populate("manager", "name email");

    return res.json({
      message: `Organization unit ${
        isActive ? "activated" : "deactivated"
      } successfully.`,
      organizationUnit: updatedUnit,
    });
  } catch (err) {
    return handleError(err, res, "updateOrganizationUnitStatus");
  }
};
