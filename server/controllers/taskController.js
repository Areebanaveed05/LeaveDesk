import mongoose from "mongoose";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import ProjectPhase from "../models/ProjectPhase.js";
import User from "../models/User.js";

const validId = (id) => mongoose.isValidObjectId(id);

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Returns midnight UTC for today's Pakistan calendar date.
// Date-only values from HTML inputs are stored as YYYY-MM-DD (UTC midnight),
// so this comparison makes a task eligible from the start of its scheduled
// date in Pakistan without accidentally using the next local calendar day.

const getPakistanStartOfTodayUTC = () => {
  const pakistanDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return new Date(`${pakistanDate}T00:00:00.000Z`);
};

const isLead = (project, user) =>
  project?.projectLead?.toString() === user._id.toString();

const taskPopulate = (query) =>
  query
    .populate("project", "name status projectLead startDate deadline")
    .populate("phase", "name order startDate deadline status")
    .populate("assignedTo", "name email department designation")
    .populate("assignedBy", "name email")
    .populate({
      path: "dependsOn",
      select: "title status assignedTo deadline",
      populate: { path: "assignedTo", select: "name email" },
    });

// ------------------------------------------
// GET /api/tasks
// ------------------------------------------

export const getTasks = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role !== "admin") {
      const ledProjectIds = await Project.distinct("_id", {
        projectLead: req.user._id,
      });

      filter = {
        $or: [
          { assignedTo: req.user._id },
          { project: { $in: ledProjectIds } },
        ],
      };
    }

    const tasks = await taskPopulate(
      Task.find(filter).sort({ createdAt: -1 })
    );

    return res.status(200).json(tasks);
  } catch (error) {
    console.error("getTasks:", error);
    return res.status(500).json({ message: "Unable to load tasks." });
  }
};

// ------------------------------------------
// POST /api/tasks
// ------------------------------------------

export const createTask = async (req, res) => {
  try {
    const {
      title,
      description = "",
      project: projectId,
      phase: phaseId,
      assignedTo,
      priority = "Medium",
      startDate,
      deadline,
      dependsOn = [],
    } = req.body;

    if (
      !title?.trim() ||
      !validId(projectId) ||
      !validId(phaseId) ||
      !validId(assignedTo) ||
      !startDate ||
      !deadline
    ) {
      return res.status(400).json({
        message:
          "Title, project, phase, assigned employee, start date and deadline are required.",
      });
    }

    if (!["Low", "Medium", "High", "Urgent"].includes(priority)) {
      return res.status(400).json({
        message: "Invalid task priority.",
      });
    }

    if (
      !Array.isArray(dependsOn) ||
      dependsOn.some((id) => !validId(id))
    ) {
      return res.status(400).json({
        message: "Task dependencies must be valid task IDs.",
      });
    }

    const parsedStart = parseDate(startDate);
    const parsedDeadline = parseDate(deadline);

    if (!parsedStart || !parsedDeadline) {
      return res.status(400).json({
        message: "Please provide valid task dates.",
      });
    }

    if (parsedDeadline < parsedStart) {
      return res.status(400).json({
        message: "Task deadline cannot be before its start date.",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    if (req.user.role !== "employee" || !isLead(project, req.user)) {
      return res.status(403).json({
        message: "Only this project's Project Lead can assign tasks.",
      });
    }

    if (["Completed", "On Hold"].includes(project.status)) {
      return res.status(400).json({
        message:
          "Tasks cannot be assigned to completed or on-hold projects.",
      });
    }

    if (
      parsedStart < new Date(project.startDate) ||
      parsedDeadline > new Date(project.deadline)
    ) {
      return res.status(400).json({
        message: "Task dates must be within the project's timeline.",
      });
    }

    const phase = await ProjectPhase.findOne({
      _id: phaseId,
      project: projectId,
    });

    if (!phase) {
      return res.status(400).json({
        message: "Select a phase belonging to this project.",
      });
    }

    if (
      parsedStart < phase.startDate ||
      parsedDeadline > phase.deadline
    ) {
      return res.status(400).json({
        message: "Task dates must be within the selected phase's timeline.",
      });
    }

    const employee = await User.findOne({
      _id: assignedTo,
      role: "employee",
      isActive: true,
    }).select("_id");

    if (!employee) {
      return res.status(404).json({
        message: "Active employee not found.",
      });
    }

    const isMember = project.teamMembers.some(
      (member) =>
        member.employee.toString() === employee._id.toString()
    );

    if (!isMember) {
      return res.status(400).json({
        message:
          "You can only assign tasks to members of your project.",
      });
    }

    const uniqueDependencies = [...new Set(dependsOn.map(String))];

    if (uniqueDependencies.length !== dependsOn.length) {
      return res.status(400).json({
        message: "A dependency cannot be selected more than once.",
      });
    }

    if (uniqueDependencies.length) {
      const dependencies = await Task.find({
        _id: { $in: uniqueDependencies },
        project: projectId,
      }).select("_id status deadline");

      if (dependencies.length !== uniqueDependencies.length) {
        return res.status(400).json({
          message:
            "Dependencies must be existing tasks in the same project.",
        });
      }

      if (dependencies.some((task) => task.deadline > parsedStart)) {
        return res.status(400).json({
          message:
            "A dependent task cannot start before its prerequisite task's deadline.",
        });
      }
    }

    const task = await Task.create({
      title: title.trim(),
      description,
      project: project._id,
      phase: phase._id,
      assignedTo: employee._id,
      assignedBy: req.user._id,
      priority,
      startDate: parsedStart,
      deadline: parsedDeadline,
      dependsOn: uniqueDependencies,
      status: "To Do",
    });

    const populatedTask = await taskPopulate(
      Task.findById(task._id)
    );

    return res.status(201).json({
      message: "Task assigned successfully.",
      task: populatedTask,
    });
  } catch (error) {
    console.error("createTask:", error);
    return res.status(500).json({
      message: "Unable to assign task.",
    });
  }
};

// ------------------------------------------
// PATCH /api/tasks/:id/status
// ------------------------------------------

// Employees can manually confirm completion only.
// In Progress is controlled automatically by the server scheduler.

export const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["To Do", "In Progress", "Completed"].includes(status)) {
      return res.status(400).json({
        message: "Invalid task status.",
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    const isAdmin = req.user.role === "admin";

    const isAssignedEmployee =
      task.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isAssignedEmployee) {
      return res.status(403).json({
        message: "You are not allowed to update this task.",
      });
    }

    if (!isAdmin && status !== "Completed") {
      return res.status(403).json({
        message:
          "Employees can manually mark a task as Completed. To Do and In Progress are managed automatically.",
      });
    }

    if (!isAdmin && task.status === "Completed") {
      return res.status(400).json({
        message: "This task is already completed.",
      });
    }

    if (status === "In Progress" || status === "Completed") {
      if (task.dependsOn?.length) {
        const incompleteDependencies = await Task.countDocuments({
          _id: { $in: task.dependsOn },
          status: { $ne: "Completed" },
        });

        if (incompleteDependencies > 0) {
          return res.status(400).json({
            message:
              "This task is locked. Complete its prerequisite tasks first.",
          });
        }
      }

      if (
        task.startDate &&
        task.startDate > getPakistanStartOfTodayUTC()
      ) {
        return res.status(400).json({
          message:
            "This task cannot be completed before its scheduled start date.",
        });
      }
    }

    task.status = status;
    task.completedAt = status === "Completed" ? new Date() : null;

    await task.save();

    const updatedTask = await taskPopulate(
      Task.findById(task._id)
    );

    return res.status(200).json({
      message: "Task status updated successfully.",
      task: updatedTask,
    });
  } catch (error) {
    console.error("updateTaskStatus:", error);

    return res.status(500).json({
      message: "Unable to update task status.",
    });
  }
};

// ------------------------------------------
// PATCH /api/tasks/:id/dependencies
// ------------------------------------------

// Project Lead can revise dependencies for tasks in their own project.

export const updateTaskDependencies = async (req, res) => {
  try {
    const { dependsOn } = req.body;

    if (
      !Array.isArray(dependsOn) ||
      dependsOn.some((id) => !validId(id))
    ) {
      return res.status(400).json({
        message: "Provide an array of valid task IDs.",
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    if (req.user.role !== "employee" || !isLead(project, req.user)) {
      return res.status(403).json({
        message:
          "Only this project's Project Lead can edit dependencies.",
      });
    }

    if (task.status !== "To Do") {
      return res.status(400).json({
        message:
          "Dependencies can only be changed before a task starts.",
      });
    }

    const ids = [...new Set(dependsOn.map(String))];

    if (
      ids.length !== dependsOn.length ||
      ids.includes(task._id.toString())
    ) {
      return res.status(400).json({
        message:
          "Duplicate or self-dependencies are not allowed.",
      });
    }

    const dependencies = await Task.find({
      _id: { $in: ids },
      project: task.project,
    }).select("_id status deadline dependsOn");

    if (dependencies.length !== ids.length) {
      return res.status(400).json({
        message: "Dependencies must belong to the same project.",
      });
    }

    if (
      dependencies.some(
        (item) => task.startDate && item.deadline > task.startDate
      )
    ) {
      return res.status(400).json({
        message:
          "A prerequisite task's deadline cannot be after this task's start date.",
      });
    }

    // Prevent circular dependency chains.

    const dependencyMap = new Map(
      dependencies.map((item) => [item._id.toString(), item])
    );

    const visited = new Set();

    const reachesCurrentTask = async (candidateId) => {
      if (candidateId === task._id.toString()) return true;

      if (visited.has(candidateId)) return false;

      visited.add(candidateId);

      const candidate =
        dependencyMap.get(candidateId) ||
        (await Task.findById(candidateId).select("_id dependsOn"));

      if (!candidate) return false;

      for (const parentId of candidate.dependsOn || []) {
        if (await reachesCurrentTask(parentId.toString())) {
          return true;
        }
      }

      return false;
    };

    for (const id of ids) {
      visited.clear();

      if (await reachesCurrentTask(id)) {
        return res.status(400).json({
          message:
            "This dependency would create a circular task dependency.",
        });
      }
    }

    task.dependsOn = ids;

    await task.save();

    const updatedTask = await taskPopulate(
      Task.findById(task._id)
    );

    return res.status(200).json({
      message: "Task dependencies updated.",
      task: updatedTask,
    });
  } catch (error) {
    console.error("updateTaskDependencies:", error);

    return res.status(500).json({
      message: "Unable to update task dependencies.",
    });
  }
};