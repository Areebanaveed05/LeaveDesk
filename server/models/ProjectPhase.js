import mongoose from "mongoose";

const projectPhaseSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Phase name is required"],
      trim: true,
      maxlength: [120, "Phase name cannot exceed 120 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Phase description cannot exceed 2000 characters"],
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    startDate: {
      type: Date,
      required: [true, "Phase start date is required"],
    },
    deadline: {
      type: Date,
      required: [true, "Phase deadline is required"],
    },
    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Completed"],
      default: "Not Started",
    },
  },
  { timestamps: true }
);

projectPhaseSchema.pre("validate", function () {
  if (this.startDate && this.deadline && this.deadline < this.startDate) {
    this.invalidate("deadline", "Phase deadline cannot be before its start date.");
  }
});

projectPhaseSchema.index({ project: 1, order: 1 }, { unique: true });

const ProjectPhase = mongoose.model("ProjectPhase", projectPhaseSchema);
export default ProjectPhase;
