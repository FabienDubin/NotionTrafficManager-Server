const express = require("express");
const router = express.Router();
const calendarController = require("../controllers/calendar.controller");
const { isAuthenticated } = require("../middleware/jwt.middleware");

// Middleware d'authentification pour toutes les routes
router.use(isAuthenticated);

// Routes pour les tâches
router.get("/tasks", calendarController.getTasks);
router.post("/tasks", calendarController.createTask);
router.get("/unassigned-tasks", calendarController.getUnassignedTasks);
router.patch("/tasks/:id", calendarController.updateTask);
router.post("/tasks/filter", calendarController.filterTasks);

// Routes pour les données de référence
router.get("/users", calendarController.getUsers);
router.get("/clients", calendarController.getClients);
router.get("/projects", calendarController.getProjects);
router.get("/status-options", calendarController.getStatusOptions);

// Routes pour les préférences utilisateur
router.get("/preferences", calendarController.getUserPreferences);
router.patch("/preferences", calendarController.saveUserPreferences);

// Routes pour les couleurs clients
router.get("/client-colors", calendarController.getClientColors);
router.patch("/client-colors", calendarController.saveClientColors);

module.exports = router;
