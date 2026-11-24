import mongoose from "mongoose";

// Existing project model. Phases are stored separately in ProjectPhase.
const projectTeamMemberSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Project team member is required"],
    },
    organizationalTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganizationUnit",
      required: [true, "Organizational team is required"],
    },
    projectRole: {
      type: String,
      trim: true,
      default: "",
      maxlength: [100, "Project role cannot exceed 100 characters"],
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [120, "Project name cannot exceed 120 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: ["Planning", "Active", "Completed", "On Hold"],
      default: "Planning",
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    deadline: {
      type: Date,
      required: [true, "Project deadline is required"],
      validate: {
        validator(value) {
          if (!this.startDate || !value) return true;
          return value >= this.startDate;
        },
        message: "Project deadline cannot be before its start date",
      },
    },
    organizationalTeams: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrganizationUnit",
      }],
      default: [],
    },
    teamMembers: {
      type: [projectTeamMemberSchema],
      default: [],
    },
    projectLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Project creator is required"],
    },
  },
  { timestamps: true }
);

projectSchema.pre("validate", function () {
  if (!this.projectLead) return;

  const isProjectMember = this.teamMembers.some(
    (member) =>
      member.employee &&
      member.employee.toString() === this.projectLead.toString()
  );

  if (!isProjectMember) {
    this.invalidate(
      "projectLead",
      "Project Lead must be selected from the project team members."
    );
  }
});

projectSchema.index({ status: 1, deadline: 1 });
projectSchema.index({ "teamMembers.employee": 1 });
projectSchema.index({ organizationalTeams: 1 });
projectSchema.index({ projectLead: 1 });

const Project = mongoose.model("Project", projectSchema);
export default Project;
