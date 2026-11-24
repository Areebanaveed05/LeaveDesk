import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project is required"],
      index: true,
    },
    phase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectPhase",
      default: null,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned employee is required"],
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["To Do", "In Progress", "Completed"],
      default: "To Do",
    },
    startDate: {
      type: Date,
      default: null,
    },
    deadline: {
      type: Date,
      required: [true, "Task deadline is required"],
    },
    dependsOn: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    }],
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ project: 1, phase: 1 });
taskSchema.index({ dependsOn: 1 });
taskSchema.index({ status: 1, startDate: 1 });

const Task = mongoose.model("Task", taskSchema);
export default Task;