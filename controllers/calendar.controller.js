const calendarService = require("../services/calendar.service");

class CalendarController {
  // GET /calendar/tasks?start=2025-01-01&end=2025-01-31
  async getTasks(req, res) {
    try {
      const { start, end } = req.query;
      const userId = req.payload._id;

      if (!start || !end) {
        return res.status(400).json({
          message: "Les paramètres start et end sont requis",
        });
      }

      const tasks = await calendarService.getTasksWithColors(
        start,
        end,
        userId
      );

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      console.error("Error in getTasks:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des tâches",
        error: error.message,
      });
    }
  }

  // GET /calendar/unassigned-tasks
  async getUnassignedTasks(req, res) {
    try {
      const tasks = await calendarService.getUnassignedTasksWithColors();

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      console.error("Error in getUnassignedTasks:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des tâches non assignées",
        error: error.message,
      });
    }
  }

  // POST /calendar/tasks
  async createTask(req, res) {
    try {
      const taskData = req.body;

      // Validation des données obligatoires
      if (!taskData.name || !taskData.projectId) {
        return res.status(400).json({
          success: false,
          message: "Le nom de la tâche et le projet sont obligatoires",
        });
      }

      if (!taskData.startDate || !taskData.endDate) {
        return res.status(400).json({
          success: false,
          message: "Les dates de début et de fin sont obligatoires",
        });
      }

      const newTask = await calendarService.createTask(taskData);

      res.status(201).json({
        success: true,
        data: newTask,
        message: "Tâche créée avec succès",
      });
    } catch (error) {
      console.error("Error in createTask:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la création de la tâche",
        error: error.message,
      });
    }
  }

  // PATCH /calendar/tasks/:id
  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedTask = await calendarService.updateTask(id, updates);

      res.json({
        success: true,
        data: updatedTask,
        message: "Tâche mise à jour avec succès",
      });
    } catch (error) {
      console.error("Error in updateTask:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la mise à jour de la tâche",
        error: error.message,
      });
    }
  }

  // DELETE /calendar/tasks/:id
  async deleteTask(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "L'ID de la tâche est requis",
        });
      }

      await calendarService.deleteTask(id);

      res.json({
        success: true,
        message: "Tâche supprimée avec succès",
      });
    } catch (error) {
      console.error("Error in deleteTask:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la suppression de la tâche",
        error: error.message,
      });
    }
  }

  // GET /calendar/users
  async getUsers(req, res) {
    try {
      const users = await calendarService.getCreatives();

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error("Error in getUsers:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des utilisateurs",
        error: error.message,
      });
    }
  }

  // GET /calendar/clients
  async getClients(req, res) {
    try {
      const clients = await calendarService.getClients();

      res.json({
        success: true,
        data: clients,
      });
    } catch (error) {
      console.error("Error in getClients:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des clients",
        error: error.message,
      });
    }
  }

  // GET /calendar/projects
  async getProjects(req, res) {
    try {
      const projects = await calendarService.getProjects();

      res.json({
        success: true,
        data: projects,
      });
    } catch (error) {
      console.error("Error in getProjects:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des projets",
        error: error.message,
      });
    }
  }

  // GET /calendar/status-options
  async getStatusOptions(req, res) {
    try {
      const statusOptions = await calendarService.getStatusOptions();

      res.json({
        success: true,
        data: statusOptions,
      });
    } catch (error) {
      console.error("Error in getStatusOptions:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des options de statut",
        error: error.message,
      });
    }
  }

  // GET /calendar/preferences
  async getUserPreferences(req, res) {
    try {
      const userId = req.payload._id;
      const preferences = await calendarService.getUserPreferences(userId);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      console.error("Error in getUserPreferences:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des préférences",
        error: error.message,
      });
    }
  }

  // PATCH /calendar/preferences
  async saveUserPreferences(req, res) {
    try {
      const userId = req.payload._id;
      const preferences = req.body;

      const updatedPreferences = await calendarService.saveUserPreferences(
        userId,
        preferences
      );

      res.json({
        success: true,
        data: updatedPreferences,
        message: "Préférences sauvegardées avec succès",
      });
    } catch (error) {
      console.error("Error in saveUserPreferences:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la sauvegarde des préférences",
        error: error.message,
      });
    }
  }

  // GET /calendar/client-colors
  async getClientColors(req, res) {
    try {
      const clientColors = await calendarService.getClientColors();

      res.json({
        success: true,
        data: clientColors,
      });
    } catch (error) {
      console.error("Error in getClientColors:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des couleurs clients",
        error: error.message,
      });
    }
  }

  // PATCH /calendar/client-colors
  async saveClientColors(req, res) {
    try {
      const userId = req.payload._id;
      const clientColorsData = req.body;

      const updatedColors = await calendarService.saveClientColors(
        clientColorsData,
        userId
      );

      res.json({
        success: true,
        data: updatedColors,
        message: "Couleurs clients sauvegardées avec succès",
      });
    } catch (error) {
      console.error("Error in saveClientColors:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la sauvegarde des couleurs clients",
        error: error.message,
      });
    }
  }

  // POST /calendar/tasks/filter
  async filterTasks(req, res) {
    try {
      const { tasks, filters } = req.body;

      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({
          success: false,
          message: "Le paramètre tasks est requis et doit être un tableau",
        });
      }

      const filteredTasks = calendarService.filterTasks(tasks, filters || {});

      res.json({
        success: true,
        data: filteredTasks,
      });
    } catch (error) {
      console.error("Error in filterTasks:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors du filtrage des tâches",
        error: error.message,
      });
    }
  }
}

module.exports = new CalendarController();
