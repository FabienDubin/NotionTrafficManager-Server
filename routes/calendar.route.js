const express = require("express");
const router = express.Router();
const notionService = require("../services/notion.service");
const { isAuthenticated } = require("../middleware/jwt.middleware");

// Middleware d'authentification pour toutes les routes
// router.use(isAuthenticated);

// GET /api/calendar/tasks/unassigned - Récupère les tâches non assignées
router.get("/tasks/unassigned", async (req, res, next) => {
  try {
    const tasks = await notionService.getUnassignedTasks();
    res.json(tasks);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des tâches non assignées:",
      error
    );
    res.status(500).json({
      message: "Erreur lors de la récupération des tâches non assignées",
      error: error.message,
    });
  }
});

// GET /api/calendar/tasks/period - Récupère les tâches dans une période
router.get("/tasks/period", async (req, res, next) => {
  try {
    const { start, end, preload, viewType } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        message: "Les paramètres start et end sont requis",
      });
    }

    // Récupère les tâches de la période demandée
    const tasks = await notionService.getTasksInPeriod(start, end);

    // Si preload=true, précharge les périodes adjacentes en arrière-plan
    if (preload === "true") {
      notionService.preloadAdjacentPeriods(start, end, viewType || "month");
    }

    res.json(tasks);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des tâches par période:",
      error
    );
    res.status(500).json({
      message: "Erreur lors de la récupération des tâches",
      error: error.message,
    });
  }
});

// PATCH /api/calendar/tasks/:id - Met à jour une tâche
router.patch("/tasks/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({
        message: "L'ID de la tâche est requis",
      });
    }

    const updatedTask = await notionService.updateTask(id, updates);
    res.json(updatedTask);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la tâche:", error);
    res.status(500).json({
      message: "Erreur lors de la mise à jour de la tâche",
      error: error.message,
    });
  }
});

// GET /api/calendar/users - Récupère la liste des utilisateurs
router.get("/users", async (req, res, next) => {
  try {
    const users = await notionService.getUsers();
    res.json(users);
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des utilisateurs",
      error: error.message,
    });
  }
});

// GET /api/calendar/clients - Récupère la liste des clients
router.get("/clients", async (req, res, next) => {
  try {
    const clients = await notionService.getClients();
    res.json(clients);
  } catch (error) {
    console.error("Erreur lors de la récupération des clients:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des clients",
      error: error.message,
    });
  }
});

// GET /api/calendar/projects - Récupère la liste des projets
router.get("/projects", async (req, res, next) => {
  try {
    const projects = await notionService.getProjects();
    res.json(projects);
  } catch (error) {
    console.error("Erreur lors de la récupération des projets:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des projets",
      error: error.message,
    });
  }
});

module.exports = router;
