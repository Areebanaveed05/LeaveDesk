
import mongoose from "mongoose";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import OrganizationUnit from "../models/OrganizationUnit.js";

const isValidId = (id) => mongoose.isValidObjectId(id);

// ------------------------------------------
// POPULATE PROJECT DETAILS
// ------------------------------------------

const populateProject = (query) =>
  query
    .populate("createdBy", "name email")
    .populate("projectLead", "name email designation department")
    .populate({
      path: "organizationalTeams",
      select: "name type parent isActive",
      populate: {
        path: "parent",
        select: "name type",
      },
    })
    .populate({
      path: "teamMembers.employee",
      select:
        "name email department subDepartment designation isActive",
      populate: {
        path: "subDepartment",
        select: "name parent",
        populate: {
          path: "parent",
          select: "name type",
        },
      },
    })
    .populate(
      "teamMembers.organizationalTeam",
      "name type parent"
    );

// ------------------------------------------
// AUTOMATIC PROJECT STATUS + OVERDUE INDICATOR
// ------------------------------------------

// Automatically change Planning projects to Active
// when their start date arrives.
//
// On Hold and Completed projects are never automatically
// changed by this function.

const syncPlanningProjects = async () => {
  const now = new Date();

  await Project.updateMany(
    {
      status: "Planning",
      startDate: { $lte: now },
    },
    {
      $set: { status: "Active" },
    }
  );
};

// Overdue is an indicator, not a stored project status.
// The project remains Active.
//
// Date-only deadlines remain valid through the end
// of the selected deadline date.

const addStatusIndicators = (projects) => {
  const items = Array.isArray(projects)
    ? projects
    : [projects];

  const decorated = items.map((project) => {
    if (!project) return project;

    const plainProject =
      typeof project.toObject === "function"
        ? project.toObject()
        : { ...project };

    const now = new Date();

    const deadline = plainProject.deadline
      ? new Date(plainProject.deadline)
      : null;

    if (
      deadline &&
      !Number.isNaN(deadline.getTime())
    ) {
      deadline.setUTCHours(23, 59, 59, 999);
    }

    plainProject.isOverdue =
      plainProject.status === "Active" &&
      Boolean(deadline) &&
      deadline < now;

    return plainProject;
  });

  return Array.isArray(projects)
    ? decorated
    : decorated[0];
};

// ------------------------------------------
// VALIDATE ORGANIZATIONAL TEAMS AND MEMBERS
// ------------------------------------------

const validateProjectTeam = async (
  organizationalTeamIds,
  teamMembers
) => {
  if (
    !Array.isArray(organizationalTeamIds) ||
    !Array.isArray(teamMembers)
  ) {
    return {
      valid: false,
      status: 400,
      message:
        "Organizational teams and project team members must be arrays.",
    };
  }

  const uniqueTeamIds = [
    ...new Set(organizationalTeamIds.map(String)),
  ];

  if (uniqueTeamIds.some((id) => !isValidId(id))) {
    return {
      valid: false,
      status: 400,
      message:
        "One or more organizational team IDs are invalid.",
    };
  }

  if (
    uniqueTeamIds.length !== organizationalTeamIds.length
  ) {
    return {
      valid: false,
      status: 400,
      message:
        "An organizational team has been selected more than once.",
    };
  }

  if (uniqueTeamIds.length === 0) {
    return {
      valid: false,
      status: 400,
      message:
        "Select at least one organizational team.",
    };
  }

  const teams = await OrganizationUnit.find({
    _id: { $in: uniqueTeamIds },
    type: "Team",
    isActive: true,
  }).select("_id");

  if (teams.length !== uniqueTeamIds.length) {
    return {
      valid: false,
      status: 400,
      message:
        "Select only valid active organizational teams.",
    };
  }

  if (teamMembers.length === 0) {
    return {
      valid: false,
      status: 400,
      message:
        "Select at least one employee for the project team.",
    };
  }

  const normalizedMembers = [];
  const seenEmployees = new Set();

  for (const member of teamMembers) {
    const employeeId = member?.employee;

    const organizationalTeamId =
      member?.organizationalTeam;

    const projectRole =
      typeof member?.projectRole === "string"
        ? member.projectRole.trim()
        : "";

    if (
      !isValidId(employeeId) ||
      !isValidId(organizationalTeamId)
    ) {
      return {
        valid: false,
        status: 400,
        message:
          "A project team member or organizational team ID is invalid.",
      };
    }

    const employeeKey = String(employeeId);
    const teamKey = String(organizationalTeamId);

    if (seenEmployees.has(employeeKey)) {
      return {
        valid: false,
        status: 400,
        message:
          "An employee can only be added once to a project.",
      };
    }

    if (!uniqueTeamIds.includes(teamKey)) {
      return {
        valid: false,
        status: 400,
        message:
          "Every selected employee must belong to one of the selected organizational teams.",
      };
    }

    if (projectRole.length > 100) {
      return {
        valid: false,
        status: 400,
        message:
          "Project role cannot exceed 100 characters.",
      };
    }

    seenEmployees.add(employeeKey);

    normalizedMembers.push({
      employee: employeeId,
      organizationalTeam: organizationalTeamId,
      projectRole,
    });
  }

  const employeeIds = normalizedMembers.map(
    (member) => member.employee
  );

  const employees = await User.find({
    _id: { $in: employeeIds },
    role: "employee",
    isActive: true,
  }).select("_id organizationTeams");

  if (employees.length !== employeeIds.length) {
    return {
      valid: false,
      status: 400,
      message:
        "All selected project members must be active employees.",
    };
  }

  const employeeById = new Map(
    employees.map((employee) => [
      String(employee._id),
      employee,
    ])
  );

  for (const member of normalizedMembers) {
    const employee = employeeById.get(
      String(member.employee)
    );

    const belongsToTeam = (
      employee.organizationTeams || []
    ).some(
      (teamId) =>
        String(teamId) ===
        String(member.organizationalTeam)
    );

    if (!belongsToTeam) {
      return {
        valid: false,
        status: 400,
        message:
          "An employee is not assigned to the organizational team selected for them. Refresh the employee list and try again.",
      };
    }
  }

  return {
    valid: true,
    organizationalTeams: uniqueTeamIds,
    teamMembers: normalizedMembers,
  };
};

// ------------------------------------------
// VALIDATE PROJECT LEAD
// ------------------------------------------

const validateProjectLead = async (
  projectLeadId,
  teamMembers
) => {
  if (!projectLeadId) {
    return {
      valid: false,
      status: 400,
      message: "Please select a Project Lead.",
    };
  }

  if (!isValidId(projectLeadId)) {
    return {
      valid: false,
      status: 400,
      message: "Project Lead ID is invalid.",
    };
  }

  // Project Lead must be one of this project's members.

  const isProjectMember = teamMembers.some(
    (member) =>
      String(member.employee) ===
      String(projectLeadId)
  );

  if (!isProjectMember) {
    return {
      valid: false,
      status: 400,
      message:
        "Project Lead must be selected from the project team members.",
    };
  }

  // Project Lead must be an active employee.

  const employee = await User.findOne({
    _id: projectLeadId,
    role: "employee",
    isActive: true,
  }).select("_id name email");

  if (!employee) {
    return {
      valid: false,
      status: 400,
      message:
        "Project Lead must be an active employee.",
    };
  }

  return {
    valid: true,
    projectLead: employee._id,
  };
};

// ------------------------------------------
// GET ALL PROJECTS
// ------------------------------------------

// Employees see projects where they are members
// or have assigned tasks.

export const getProjects = async (req, res) => {
  try {
    // Synchronize Planning -> Active transitions
    // whenever projects are requested.

    await syncPlanningProjects();

    const filter = {};

    if (req.user.role === "employee") {
      const taskProjectIds = await Task.distinct(
        "project",
        {
          assignedTo: req.user._id,
        }
      );

      filter.$or = [
        {
          "teamMembers.employee": req.user._id,
        },
        {
          _id: { $in: taskProjectIds },
        },
      ];
    }

    const projects = await populateProject(
      Project.find(filter).sort({
        createdAt: -1,
      })
    );

    return res.status(200).json(
      addStatusIndicators(projects)
    );
  } catch (error) {
    console.error("getProjects:", error);

    return res.status(500).json({
      message: "Unable to load projects.",
    });
  }
};

// ------------------------------------------
// CREATE PROJECT (ADMIN)
// ------------------------------------------

export const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      status,
      startDate,
      deadline,
      organizationalTeams = [],
      teamMembers = [],
      projectLead,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !startDate ||
      !deadline
    ) {
      return res.status(400).json({
        message:
          "Project name, start date and deadline are required.",
      });
    }

    const parsedStartDate = new Date(startDate);
    const parsedDeadline = new Date(deadline);

    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedDeadline.getTime())
    ) {
      return res.status(400).json({
        message: "Please provide valid project dates.",
      });
    }

    if (parsedDeadline < parsedStartDate) {
      return res.status(400).json({
        message:
          "Project deadline cannot be before its start date.",
      });
    }

    // Validate teams and project members.

    const teamValidation = await validateProjectTeam(
      organizationalTeams,
      teamMembers
    );

    if (!teamValidation.valid) {
      return res.status(teamValidation.status).json({
        message: teamValidation.message,
      });
    }

    // Validate the selected Project Lead.

    const leadValidation = await validateProjectLead(
      projectLead,
      teamValidation.teamMembers
    );

    if (!leadValidation.valid) {
      return res.status(leadValidation.status).json({
        message: leadValidation.message,
      });
    }

    const project = await Project.create({
      name: name.trim(),
      description,
      status,
      startDate: parsedStartDate,
      deadline: parsedDeadline,
      organizationalTeams:
        teamValidation.organizationalTeams,
      teamMembers: teamValidation.teamMembers,
      projectLead: leadValidation.projectLead,
      createdBy: req.user._id,
    });

    // Apply date-based transition immediately if
    // the start date has already arrived.

    await syncPlanningProjects();

    const populatedProject = await populateProject(
      Project.findById(project._id)
    );

    return res.status(201).json({
      message:
        "Project, project team and Project Lead created successfully.",
      project: addStatusIndicators(populatedProject),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("createProject:", error);

    return res.status(500).json({
      message: "Unable to create project.",
    });
  }
};

// ------------------------------------------
// UPDATE PROJECT (ADMIN)
// ------------------------------------------

// If team fields are omitted, existing membership is preserved.
// Project Lead is also preserved unless a new one is provided.

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(
      req.params.id
    );

    if (!project) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    const {
      name,
      description,
      status,
      startDate,
      deadline,
      organizationalTeams,
      teamMembers,
      projectLead,
    } = req.body;

    const nextStartDate =
      startDate !== undefined
        ? new Date(startDate)
        : project.startDate;

    const nextDeadline =
      deadline !== undefined
        ? new Date(deadline)
        : project.deadline;

    if (
      Number.isNaN(new Date(nextStartDate).getTime()) ||
      Number.isNaN(new Date(nextDeadline).getTime())
    ) {
      return res.status(400).json({
        message: "Please provide valid project dates.",
      });
    }

    if (nextDeadline < nextStartDate) {
      return res.status(400).json({
        message:
          "Project deadline cannot be before its start date.",
      });
    }

    // Existing project membership.

    const currentTeams = (
      project.organizationalTeams || []
    ).map(String);

    const currentMembers = (
      project.teamMembers || []
    ).map((member) => ({
      employee: String(member.employee),
      organizationalTeam: String(
        member.organizationalTeam
      ),
      projectRole: member.projectRole || "",
    }));

    let nextTeams = currentTeams;
    let nextMembers = currentMembers;

    // Validate teams and members together when either
    // of these fields is updated.

    if (
      organizationalTeams !== undefined ||
      teamMembers !== undefined
    ) {
      const teamValidation = await validateProjectTeam(
        organizationalTeams !== undefined
          ? organizationalTeams
          : currentTeams,
        teamMembers !== undefined
          ? teamMembers
          : currentMembers
      );

      if (!teamValidation.valid) {
        return res.status(teamValidation.status).json({
          message: teamValidation.message,
        });
      }

      nextTeams = teamValidation.organizationalTeams;
      nextMembers = teamValidation.teamMembers;

      // Do not remove project members who still have assigned tasks.

      const nextEmployeeIds = new Set(
        nextMembers.map(
          (member) => String(member.employee)
        )
      );

      const removedEmployeeIds = currentMembers
        .map((member) => member.employee)
        .filter(
          (employeeId) =>
            !nextEmployeeIds.has(employeeId)
        );

      if (removedEmployeeIds.length > 0) {
        const assignedTask = await Task.exists({
          project: project._id,
          assignedTo: {
            $in: removedEmployeeIds,
          },
        });

        if (assignedTask) {
          return res.status(400).json({
            message:
              "A project member with assigned tasks cannot be removed. Reassign or delete their tasks first.",
          });
        }
      }

      project.organizationalTeams = nextTeams;
      project.teamMembers = nextMembers;
    }

    // Determine the Project Lead to retain or assign.

    const nextProjectLead =
      projectLead !== undefined
        ? projectLead
        : project.projectLead;

    // Validate the Project Lead whenever:
    // - a new lead is submitted, or
    // - project team membership changes.

    const shouldValidateLead =
      projectLead !== undefined ||
      organizationalTeams !== undefined ||
      teamMembers !== undefined;

    if (shouldValidateLead) {
      const leadValidation = await validateProjectLead(
        nextProjectLead,
        nextMembers
      );

      if (!leadValidation.valid) {
        return res.status(leadValidation.status).json({
          message: leadValidation.message,
        });
      }

      project.projectLead = leadValidation.projectLead;
    }

    // Update basic project details.

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          message: "Project name is required.",
        });
      }

      project.name = name.trim();
    }

    if (description !== undefined) {
      project.description = description;
    }

    if (status !== undefined) {
      project.status = status;
    }

    if (startDate !== undefined) {
      project.startDate = nextStartDate;
    }

    if (deadline !== undefined) {
      project.deadline = nextDeadline;
    }

    await project.save();

    // Re-evaluate Planning projects after date/status edits.
    // On Hold and Completed projects remain unchanged.

    await syncPlanningProjects();

    const updatedProject = await populateProject(
      Project.findById(project._id)
    );

    return res.status(200).json({
      message: "Project updated successfully.",
      project: addStatusIndicators(updatedProject),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("updateProject:", error);

    return res.status(500).json({
      message: "Unable to update project.",
    });
  }
};

// ------------------------------------------
// DELETE PROJECT (ADMIN)
// ------------------------------------------

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(
      req.params.id
    );

    if (!project) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    // A project with existing tasks cannot be deleted.

    const existingTasks = await Task.exists({
      project: project._id,
    });

    if (existingTasks) {
      return res.status(400).json({
        message:
          "This project has tasks assigned. Delete its tasks first.",
      });
    }

    await project.deleteOne();

    return res.status(200).json({
      message: "Project deleted successfully.",
    });
  } catch (error) {
    console.error("deleteProject:", error);

    return res.status(500).json({
      message: "Unable to delete project.",
    });
  }
};
