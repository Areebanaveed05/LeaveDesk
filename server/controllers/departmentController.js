
import Department from "../models/Department.js";
import User from "../models/User.js";

const DEFAULT_DEPARTMENTS = [
  {
    name: "Engineering",
    description: "Software development and engineering",
  },
  {
    name: "Design",
    description: "UI/UX and visual design",
  },
  {
    name: "QA",
    description: "Quality assurance and software testing",
  },
  {
    name: "Product",
    description: "Product management and planning",
  },
  {
    name: "Operations",
    description: "Business and operational activities",
  },
];

const seedDepartments = async () => {
  for (const department of DEFAULT_DEPARTMENTS) {
    await Department.updateOne(
      { name: department.name },
      { $setOnInsert: department },
      { upsert: true }
    );
  }
};

const validateDepartmentHead = async (headId, departmentName) => {
  if (!headId) return null;

  const employee = await User.findOne({
    _id: headId,
    role: "employee",
    isActive: true,
    department: departmentName,
  });

  return employee;
};

// GET all departments
export const getDepartments = async (req, res) => {
  try {
    await seedDepartments();

    const departments = await Department.find()
      .populate("head", "name email department")
      .sort({ name: 1 })
      .lean();

    const employeeCounts = await User.aggregate([
      { $match: { role: "employee" } },
      {
        $group: {
          _id: "$department",
          total: { $sum: 1 },
          active: {
            $sum: { $cond: ["$isActive", 1, 0] },
          },
        },
      },
    ]);

    const countMap = new Map(
      employeeCounts.map((item) => [item._id, item])
    );

    res.json(
      departments.map((department) => {
        const counts = countMap.get(department.name);

        return {
          ...department,
          employeeCount: counts?.total || 0,
          activeEmployeeCount: counts?.active || 0,
        };
      })
    );
  } catch (error) {
    console.error("getDepartments:", error);
    res.status(500).json({ message: "Unable to load departments." });
  }
};

// CREATE department
export const createDepartment = async (req, res) => {
  try {
    const { name, description = "" } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        message: "Department name is required.",
      });
    }

    const existing = await Department.findOne({
      name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (existing) {
      return res.status(409).json({
        message: "A department with this name already exists.",
      });
    }

    const department = await Department.create({
      name: name.trim(),
      description,
    });

    res.status(201).json({
      message: "Department created successfully.",
      department,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A department with this name already exists.",
      });
    }

    console.error("createDepartment:", error);
    res.status(500).json({ message: "Unable to create department." });
  }
};

// UPDATE department
export const updateDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    const { name, description, head, isActive } = req.body;
    const oldName = department.name;

    const newName =
      name !== undefined ? name.trim() : department.name;

    if (!newName) {
      return res.status(400).json({
        message: "Department name cannot be empty.",
      });
    }

    const duplicate = await Department.findOne({
      _id: { $ne: department._id },
      name: { $regex: `^${newName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (duplicate) {
      return res.status(409).json({
        message: "Another department already uses this name.",
      });
    }

    if (head !== undefined && head !== null && head !== "") {
      const employee = await validateDepartmentHead(head, newName);

      if (!employee) {
        return res.status(400).json({
          message: "Department head must be an active employee of this department.",
        });
      }

      department.head = employee._id;
    } else if (head === null || head === "") {
      department.head = null;
    }

    if (description !== undefined) {
      department.description = description;
    }

    if (typeof isActive === "boolean") {
      department.isActive = isActive;
    }

    department.name = newName;

    // Keep existing employee department values consistent after rename
    if (oldName !== newName) {
      await User.updateMany(
        { role: "employee", department: oldName },
        { $set: { department: newName } }
      );
    }

    await department.save();

    const updated = await Department.findById(department._id)
      .populate("head", "name email department");

    res.json({
      message: "Department updated successfully.",
      department: updated,
    });
  } catch (error) {
    console.error("updateDepartment:", error);
    res.status(500).json({ message: "Unable to update department." });
  }
};

// GET employees belonging to a department
export const getDepartmentEmployees = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    const employees = await User.find({
      role: "employee",
      department: department.name,
    })
      .select("name email department isActive")
      .sort({ name: 1 });

    res.json(employees);
  } catch (error) {
    console.error("getDepartmentEmployees:", error);
    res.status(500).json({ message: "Unable to load department employees." });
  }
};
