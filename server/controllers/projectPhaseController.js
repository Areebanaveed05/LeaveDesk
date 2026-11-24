import mongoose from "mongoose";
import Project from "../models/Project.js";
import ProjectPhase from "../models/ProjectPhase.js";
import Task from "../models/Task.js";

const validId = (id) => mongoose.isValidObjectId(id);

const isProjectLead = (project, user) =>
  project?.projectLead &&
  project.projectLead.toString() === user._id.toString();

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const validatePhaseDates = (project, startDate, deadline) => {
  if (!startDate || !deadline) {
    return "A valid phase start date and deadline are required.";
  }
  if (deadline < startDate) {
    return "Phase deadline cannot be before its start date.";
  }
  if (startDate < new Date(project.startDate) || deadline > new Date(project.deadline)) {
    return "Phase dates must be within the project's timeline.";
  }
  return null;
};

// GET /api/project-phases/:projectId
export const getProjectPhases = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!validId(projectId)) {
      return res.status(400).json({ message: "Invalid project ID." });
    }

    const project = await Project.findById(projectId).select("projectLead teamMembers");
    if (!project) return res.status(404).json({ message: "Project not found." });

    if (
      req.user.role !== "admin" &&
      !isProjectLead(project, req.user) &&
      !project.teamMembers.some((m) => m.employee.toString() === req.user._id.toString())
    ) {
      return res.status(403).json({ message: "You cannot view this project's phases." });
    }

    const phases = await ProjectPhase.find({ project: projectId }).sort({ order: 1, createdAt: 1 });
    return res.status(200).json(phases);
  } catch (error) {
    console.error("getProjectPhases:", error);
    return res.status(500).json({ message: "Unable to load project phases." });
  }
};

// POST /api/project-phases
export const createProjectPhase = async (req, res) => {
  try {
    const { project: projectId, name, description = "", startDate, deadline } = req.body;

    if (!validId(projectId) || !name?.trim()) {
      return res.status(400).json({ message: "A valid project and phase name are required." });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });

    if (req.user.role !== "employee" || !isProjectLead(project, req.user)) {
      return res.status(403).json({ message: "Only this project's Project Lead can create phases." });
    }
    if (["Completed", "On Hold"].includes(project.status)) {
      return res.status(400).json({ message: "Phases cannot be added to completed or on-hold projects." });
    }

    const parsedStart = parseDate(startDate);
    const parsedDeadline = parseDate(deadline);
    const dateError = validatePhaseDates(project, parsedStart, parsedDeadline);
    if (dateError) return res.status(400).json({ message: dateError });

    const lastPhase = await ProjectPhase.findOne({ project: projectId }).sort({ order: -1 });
    const phase = await ProjectPhase.create({
      project: projectId,
      name: name.trim(),
      description,
      order: (lastPhase?.order || 0) + 1,
      startDate: parsedStart,
      deadline: parsedDeadline,
    });

    return res.status(201).json({ message: "Project phase created successfully.", phase });
  } catch (error) {
    console.error("createProjectPhase:", error);
    return res.status(500).json({ message: "Unable to create project phase." });
  }
};

// PATCH /api/project-phases/:id
export const updateProjectPhase = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return res.status(400).json({ message: "Invalid phase ID." });

    const phase = await ProjectPhase.findById(id);
    if (!phase) return res.status(404).json({ message: "Phase not found." });

    const project = await Project.findById(phase.project);
    if (!project) return res.status(404).json({ message: "Project not found." });

    if (req.user.role !== "employee" || !isProjectLead(project, req.user)) {
      return res.status(403).json({ message: "Only this project's Project Lead can update phases." });
    }

    const nextStart = req.body.startDate !== undefined ? parseDate(req.body.startDate) : phase.startDate;
    const nextDeadline = req.body.deadline !== undefined ? parseDate(req.body.deadline) : phase.deadline;
    const dateError = validatePhaseDates(project, nextStart, nextDeadline);
    if (dateError) return res.status(400).json({ message: dateError });

    if (req.body.name !== undefined) {
      if (typeof req.body.name !== "string" || !req.body.name.trim()) {
        return res.status(400).json({ message: "Phase name is required." });
      }
      phase.name = req.body.name.trim();
    }
    if (req.body.description !== undefined) phase.description = req.body.description;
    if (req.body.startDate !== undefined) phase.startDate = nextStart;
    if (req.body.deadline !== undefined) phase.deadline = nextDeadline;

    // Do not move phase dates so that existing tasks fall outside the phase.
    const outOfRangeTask = await Task.exists({
      phase: phase._id,
      $or: [
        { startDate: { $lt: nextStart } },
        { deadline: { $gt: nextDeadline } },
      ],
    });
    if (outOfRangeTask) {
      return res.status(400).json({
        message: "Phase dates cannot exclude the start date or deadline of its existing tasks.",
      });
    }

    await phase.save();
    return res.status(200).json({ message: "Phase updated successfully.", phase });
  } catch (error) {
    console.error("updateProjectPhase:", error);
    return res.status(500).json({ message: "Unable to update phase." });
  }
};

// DELETE /api/project-phases/:id
export const deleteProjectPhase = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return res.status(400).json({ message: "Invalid phase ID." });

    const phase = await ProjectPhase.findById(id);
    if (!phase) return res.status(404).json({ message: "Phase not found." });

    const project = await Project.findById(phase.project);
    if (!project) return res.status(404).json({ message: "Project not found." });

    if (req.user.role !== "employee" || !isProjectLead(project, req.user)) {
      return res.status(403).json({ message: "Only this project's Project Lead can delete phases." });
    }

    const hasTasks = await Task.exists({ phase: phase._id });
    if (hasTasks) {
      return res.status(400).json({ message: "This phase contains tasks. Move or delete its tasks before deleting the phase." });
    }

    await phase.deleteOne();
    await ProjectPhase.updateMany(
      { project: project._id, order: { $gt: phase.order } },
      { $inc: { order: -1 } }
    );

    return res.status(200).json({ message: "Phase deleted successfully." });
  } catch (error) {
    console.error("deleteProjectPhase:", error);
    return res.status(500).json({ message: "Unable to delete phase." });
  }
};
