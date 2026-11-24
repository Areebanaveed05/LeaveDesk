import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "employee"],
      default: "employee",
    },

    // Kept as a name snapshot for backward compatibility and leave history.
    // For new employees this is set from the selected sub-department's parent.
    department: {
      type: String,
      trim: true,
      required: [
        function () {
          return this.role === "employee";
        },
        "Department is required for employees",
      ],
    },
    subDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganizationUnit",
      default: null,
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [100, "Designation cannot exceed 100 characters"],
      default: "",
    },
    // Permanent organizational team memberships. Project membership is stored
    // separately on each Project and does not change this field.
    organizationTeams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrganizationUnit",
      },
    ],

    leaveAllowance: {
      annual: { type: Number, default: 20, min: 0 },
      sick: { type: Number, default: 10, min: 0 },
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
