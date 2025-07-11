// ℹ️ Gets access to environment variables/settings
// https://www.npmjs.com/package/dotenv
require("dotenv").config();

// ℹ️ Connects to the database
require("./db");

// Handles http requests (express is node js framework)
// https://www.npmjs.com/package/express
const express = require("express");

const app = express();

// ℹ️ This function is getting exported from the config folder. It runs most pieces of middleware
require("./config")(app);

// 👇 Start handling routes here
const indexRoutes = require("./routes/index.route");
app.use("/api", indexRoutes);

const authRoutes = require("./routes/auth.route");
app.use("/auth", authRoutes);

const usersRoutes = require("./routes/users.route");
app.use("/users", usersRoutes);

const calendarRoutes = require("./routes/calendar.route");
app.use("/calendar", calendarRoutes);

const settingsRoutes = require("./routes/settings.route");
app.use("/settings", settingsRoutes);

const bugReportRoutes = require("./routes/bugReport.route");
app.use("/bug-reports", bugReportRoutes);

// ❗ To handle errors. Routes that don't exist or errors that you handle in specific routes
require("./error-handling")(app);

module.exports = app;
