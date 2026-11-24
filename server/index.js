
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import requestRoutes from "./routes/requestRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import projectPhaseRoutes from "./routes/projectPhaseRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";

import Project from "./models/Project.js";
import Task from "./models/Task.js";

dotenv.config();

// ------------------------------------------
// ENVIRONMENT VALIDATION
// ------------------------------------------

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET in server/.env");
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error("Missing MONGO_URI in server/.env");
  process.exit(1);
}

// ------------------------------------------
// EXPRESS APP
// ------------------------------------------

const app = express();

app.use(helmet());

// Allow multiple frontend URLs.
// Example:
// CLIENT_URL=http://localhost:5173,https://leavedesk.vercel.app

const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as server-to-server
      // requests and health checks.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json({ limit: "10kb" }));

// ------------------------------------------
// API ROUTES
// ------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/project-phases", projectPhaseRoutes);
app.use("/api/attendance", attendanceRoutes);

// ------------------------------------------
// ROOT ROUTE / HEALTH CHECK
// ------------------------------------------

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LeaveDesk API is running",
  });
});

// ------------------------------------------
// PAKISTAN DATE HELPER
// ------------------------------------------

// Task and project date inputs are date-only values (YYYY-MM-DD).
// They are stored by JavaScript as UTC midnight. This helper returns
// UTC midnight for today's Pakistan calendar date, so a task becomes
// eligible on its scheduled Pakistan date.

const getPakistanStartOfTodayUTC = () => {
  const pakistanDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return new Date(`${pakistanDate}T00:00:00.000Z`);
};

// ------------------------------------------
// AUTOMATIC PROJECT STATUS SCHEDULER
// ------------------------------------------

let projectSchedulerRunning = false;

const updateProjectStatuses = async () => {
  if (projectSchedulerRunning) return;

  projectSchedulerRunning = true;

  try {
    const todayStartUTC = getPakistanStartOfTodayUTC();

    const result = await Project.updateMany(
      {
        status: "Planning",
        startDate: {
          $ne: null,
          $lte: todayStartUTC,
        },
      },
      {
        $set: {
          status: "Active",
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `${result.modifiedCount} project(s) automatically changed from Planning to Active.`
      );
    }
  } catch (error) {
    console.error(
      "Automatic project status update failed:",
      error.message
    );
  } finally {
    projectSchedulerRunning = false;
  }
};

// ------------------------------------------
// AUTOMATIC TASK STATUS SCHEDULER
// ------------------------------------------

// A task changes from To Do to In Progress only when:
//
// 1. Its scheduled start date has arrived in Pakistan.
// 2. Every prerequisite task exists and is Completed.
//
// Completed tasks are never changed by this scheduler.

let taskSchedulerRunning = false;

const updateTaskStatuses = async () => {
  if (taskSchedulerRunning) return;

  taskSchedulerRunning = true;

  try {
    const todayStartUTC = getPakistanStartOfTodayUTC();

    const eligibleTasks = await Task.find({
      status: "To Do",
      startDate: {
        $ne: null,
        $lte: todayStartUTC,
      },
    }).select("_id dependsOn");

    if (!eligibleTasks.length) return;

    let updatedCount = 0;

    for (const task of eligibleTasks) {
      const dependencyIds = task.dependsOn || [];

      if (dependencyIds.length > 0) {
        const completedDependencies = await Task.countDocuments({
          _id: {
            $in: dependencyIds,
          },
          status: "Completed",
        });

        if (completedDependencies !== dependencyIds.length) {
          continue;
        }
      }

      const result = await Task.updateOne(
        {
          _id: task._id,
          status: "To Do",
          startDate: {
            $ne: null,
            $lte: todayStartUTC,
          },
        },
        {
          $set: {
            status: "In Progress",
          },
        }
      );

      if (result.modifiedCount > 0) {
        updatedCount += 1;
      }
    }

    if (updatedCount > 0) {
      console.log(
        `${updatedCount} task(s) automatically changed from To Do to In Progress.`
      );
    }
  } catch (error) {
    console.error(
      "Automatic task status update failed:",
      error.message
    );
  } finally {
    taskSchedulerRunning = false;
  }
};

// ------------------------------------------
// DATABASE CONNECTION AND SERVER START
// ------------------------------------------

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  })
  .then(() => {
    console.log("MongoDB connected");

    // Run once immediately, then re-check every 60 seconds.
    void updateProjectStatuses();
    void updateTaskStatuses();

    setInterval(
      () => void updateProjectStatuses(),
      60 * 1000
    );

    setInterval(
      () => void updateTaskStatuses(),
      60 * 1000
    );

    console.log(
      "Project and task status schedulers started. Checking every 60 seconds."
    );

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:");
    console.error("Name:", err.name);
    console.error("Code:", err.code);
    console.error("Message:", err.message);
    console.error("Cause:", err.cause?.message);

    process.exit(1);
  });
