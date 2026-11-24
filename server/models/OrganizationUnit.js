
import mongoose from "mongoose";

export const ORGANIZATION_UNIT_TYPES = [
  "Department",
  "Sub-department",
  "Team",
];

const organizationUnitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization unit name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    type: {
      type: String,
      required: [true, "Organization unit type is required"],
      enum: ORGANIZATION_UNIT_TYPES,
    },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganizationUnit",
      default: null,
    },

    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

organizationUnitSchema.index({ parent: 1, type: 1 });

const OrganizationUnit = mongoose.model(
  "OrganizationUnit",
  organizationUnitSchema
);

export default OrganizationUnit;
