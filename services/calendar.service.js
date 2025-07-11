const notionService = require("./notion.service");
const UserPreferences = require("../models/UserPreferences.model");
const ClientColors = require("../models/ClientColors.model");

class CalendarService {
  // Récupérer les tâches avec les couleurs clients pour une période
  async getTasksWithColors(startDate, endDate, userId) {
    try {
      // Récupérer les tâches depuis Notion
      const tasks = await notionService.getTasksByDateRange(startDate, endDate);

      // Récupérer les données de référence pour résoudre les IDs
      const [clients, projects, users] = await Promise.all([
        notionService.getClients(),
        notionService.getProjects(),
        notionService.getUsers(),
      ]);

      // Créer des maps pour la résolution rapide
      const clientsMap = new Map(clients.map((c) => [c.id, c.name]));
      const projectsMap = new Map(projects.map((p) => [p.id, p.name]));
      const usersMap = new Map(users.map((u) => [u.id, u.name]));

      // Récupérer les couleurs des clients
      const clientColors = await this.getClientColorsMap();

      // Enrichir les tâches avec les noms résolus et les couleurs
      const enrichedTasks = tasks.map((task) => {
        // Résoudre les IDs clients en noms
        const clientNames = this.resolveIds(task.client, clientsMap);
        const clientName = Array.isArray(clientNames)
          ? clientNames[0]
          : clientNames;

        // Résoudre les IDs projets en noms
        const projectNames = this.resolveIds(task.project, projectsMap);
        const projectName = Array.isArray(projectNames)
          ? projectNames[0]
          : projectNames;

        // Résoudre les IDs utilisateurs en noms
        const userNames = this.resolveIds(task.assignedUsers, usersMap);

        // Debug logs pour une tâche
        if (task.name && task.name.includes("PPM")) {
          console.log("🔍 Debug task resolution:", {
            taskName: task.name,
            originalClient: task.client,
            resolvedClientNames: clientNames,
            finalClientName: clientName,
            originalAssignedUsers: task.assignedUsers,
            resolvedUserNames: userNames,
            originalProject: task.project,
            resolvedProjectName: projectName,
          });
        }

        return {
          ...task,
          // Noms résolus pour l'affichage
          client: clientName,
          clientNames: clientNames,
          projectName: projectName,
          assignedUsersNames: userNames,
          // Couleur du client
          clientColor: this.getClientColor(clientName, clientColors),
          // Formater les dates pour FullCalendar
          start: task.workPeriod?.start,
          end: task.workPeriod?.end,
          title: task.name,
          // Propriétés supplémentaires pour l'affichage
          extendedProps: {
            client: clientName,
            project: projectName,
            assignedUsers: userNames,
            status: task.status,
            team: task.team,
          },
        };
      });

      return enrichedTasks;
    } catch (error) {
      console.error("Error in getTasksWithColors:", error);
      throw error;
    }
  }

  // Récupérer les tâches non assignées avec couleurs
  async getUnassignedTasksWithColors() {
    try {
      const tasks = await notionService.getUnassignedTasks();

      // Récupérer les données de référence pour résoudre les IDs
      const [clients, projects, users] = await Promise.all([
        notionService.getClients(),
        notionService.getProjects(),
        notionService.getUsers(),
      ]);

      // Créer des maps pour la résolution rapide
      const clientsMap = new Map(clients.map((c) => [c.id, c.name]));
      const projectsMap = new Map(projects.map((p) => [p.id, p.name]));
      const usersMap = new Map(users.map((u) => [u.id, u.name]));

      const clientColors = await this.getClientColorsMap();

      return tasks.map((task) => {
        // Résoudre les IDs en noms
        const clientNames = this.resolveIds(task.client, clientsMap);
        const clientName = Array.isArray(clientNames)
          ? clientNames[0]
          : clientNames;
        const projectNames = this.resolveIds(task.project, projectsMap);
        const projectName = Array.isArray(projectNames)
          ? projectNames[0]
          : projectNames;
        const userNames = this.resolveIds(task.assignedUsers, usersMap);

        return {
          ...task,
          // Noms résolus pour l'affichage
          client: clientName,
          clientNames: clientNames,
          projectName: projectName,
          assignedUsersNames: userNames,
          clientColor: this.getClientColor(clientName, clientColors),
        };
      });
    } catch (error) {
      console.error("Error in getUnassignedTasksWithColors:", error);
      throw error;
    }
  }

  // Enrichir une tâche individuelle avec les noms résolus et couleurs
  async enrichSingleTask(task) {
    try {
      // Récupérer les données de référence pour résoudre les IDs
      const [clients, projects, users] = await Promise.all([
        notionService.getClients(),
        notionService.getProjects(),
        notionService.getUsers(),
      ]);

      // Créer des maps pour la résolution rapide
      const clientsMap = new Map(clients.map((c) => [c.id, c.name]));
      const projectsMap = new Map(projects.map((p) => [p.id, p.name]));
      const usersMap = new Map(users.map((u) => [u.id, u.name]));

      // Récupérer les couleurs des clients
      const clientColors = await this.getClientColorsMap();

      // Résoudre les IDs clients en noms
      const clientNames = this.resolveIds(task.client, clientsMap);
      const clientName = Array.isArray(clientNames)
        ? clientNames[0]
        : clientNames;

      // Résoudre les IDs projets en noms
      const projectNames = this.resolveIds(task.project, projectsMap);
      const projectName = Array.isArray(projectNames)
        ? projectNames[0]
        : projectNames;

      // Résoudre les IDs utilisateurs en noms
      const userNames = this.resolveIds(task.assignedUsers, usersMap);

      return {
        ...task,
        // Noms résolus pour l'affichage
        client: clientName,
        clientNames: clientNames,
        projectName: projectName,
        assignedUsersNames: userNames,
        // Couleur du client
        clientColor: this.getClientColor(clientName, clientColors),
        // Formater les dates pour FullCalendar
        start: task.workPeriod?.start,
        end: task.workPeriod?.end,
        title: task.name,
        // Propriétés supplémentaires pour l'affichage
        extendedProps: {
          client: clientName,
          project: projectName,
          assignedUsers: userNames,
          status: task.status,
          team: task.team,
        },
      };
    } catch (error) {
      console.error("Error in enrichSingleTask:", error);
      throw error;
    }
  }

  // Créer une nouvelle tâche et renvoyer la tâche enrichie
  async createTask(taskData) {
    try {
      console.log("🔄 Creating new task:", taskData);

      // Créer la tâche dans Notion
      const newTask = await notionService.createTask(taskData);

      // Enrichir la tâche créée avec les noms résolus et couleurs
      const enrichedTask = await this.enrichSingleTask(newTask);

      console.log("✅ Task created and enriched:", {
        originalTask: newTask,
        enrichedTask: enrichedTask,
      });

      return enrichedTask;
    } catch (error) {
      console.error("Error in createTask:", error);
      throw error;
    }
  }

  // Mettre à jour une tâche et renvoyer la tâche enrichie
  async updateTask(taskId, updates) {
    try {
      // Effectuer la mise à jour dans Notion
      const updatedTask = await notionService.updateTask(taskId, updates);

      // Enrichir la tâche mise à jour avec les noms résolus et couleurs
      const enrichedTask = await this.enrichSingleTask(updatedTask);

      console.log("✅ Task updated and enriched:", {
        taskId,
        originalTask: updatedTask,
        enrichedTask: enrichedTask,
        clientResolved: `${updatedTask.client} → ${enrichedTask.client}`,
        usersResolved: `${updatedTask.assignedUsers} → ${enrichedTask.assignedUsersNames}`,
      });

      return enrichedTask;
    } catch (error) {
      console.error("Error in updateTask:", error);
      throw error;
    }
  }

  // Supprimer une tâche
  async deleteTask(taskId) {
    try {
      console.log("🗑️ Deleting task:", taskId);

      // Supprimer la tâche dans Notion (archivage)
      await notionService.deleteTask(taskId);

      console.log("✅ Task deleted successfully:", taskId);
    } catch (error) {
      console.error("Error in deleteTask:", error);
      throw error;
    }
  }

  // Récupérer les préférences utilisateur
  async getUserPreferences(userId) {
    try {
      let preferences = await UserPreferences.findOne({ userId });

      if (!preferences) {
        // Créer des préférences par défaut
        preferences = new UserPreferences({
          userId,
          visibleProperties: ["name", "client", "status", "assignee"],
          defaultView: "timeGridWeek",
          filterPreferences: {
            selectedCreatives: [],
            selectedClients: [],
            selectedProjects: [],
            showCompleted: false,
          },
        });
        await preferences.save();
      }

      return preferences;
    } catch (error) {
      console.error("Error in getUserPreferences:", error);
      throw error;
    }
  }

  // Sauvegarder les préférences utilisateur
  async saveUserPreferences(userId, preferences) {
    try {
      const updatedPreferences = await UserPreferences.findOneAndUpdate(
        { userId },
        preferences,
        { new: true, upsert: true }
      );

      return updatedPreferences;
    } catch (error) {
      console.error("Error in saveUserPreferences:", error);
      throw error;
    }
  }

  // Récupérer les couleurs des clients
  async getClientColors() {
    try {
      const clientColors = await ClientColors.find({}).sort({ clientName: 1 });
      return clientColors;
    } catch (error) {
      console.error("Error in getClientColors:", error);
      throw error;
    }
  }

  // Sauvegarder les couleurs des clients
  async saveClientColors(clientColorsData, userId) {
    try {
      const results = [];

      for (const colorData of clientColorsData) {
        const updatedColor = await ClientColors.findOneAndUpdate(
          { clientId: colorData.clientId },
          {
            clientName: colorData.clientName,
            color: colorData.color,
            createdBy: userId,
          },
          { new: true, upsert: true }
        );
        results.push(updatedColor);
      }

      return results;
    } catch (error) {
      console.error("Error in saveClientColors:", error);
      throw error;
    }
  }

  // Récupérer les utilisateurs/créatifs depuis Notion
  async getCreatives() {
    try {
      return await notionService.getUsers();
    } catch (error) {
      console.error("Error in getCreatives:", error);
      throw error;
    }
  }

  // Récupérer les clients depuis Notion
  async getClients() {
    try {
      return await notionService.getClients();
    } catch (error) {
      console.error("Error in getClients:", error);
      throw error;
    }
  }

  // Récupérer les projets depuis Notion
  async getProjects() {
    try {
      const projects = await notionService.getProjects();
      const clients = await notionService.getClients();

      // Créer une map pour résoudre les IDs clients en noms
      const clientsMap = new Map(clients.map((c) => [c.id, c.name]));

      // Enrichir les projets avec les noms des clients résolus
      return projects.map((project) => {
        const clientNames = this.resolveIds(project.clients, clientsMap);
        const clientName = Array.isArray(clientNames)
          ? clientNames[0]
          : clientNames;

        return {
          ...project,
          client: clientName || project.client, // Utiliser le nom résolu ou garder l'original
        };
      });
    } catch (error) {
      console.error("Error in getProjects:", error);
      throw error;
    }
  }

  // Récupérer les options de statut depuis Notion
  async getStatusOptions() {
    try {
      return await notionService.getStatusOptions();
    } catch (error) {
      console.error("Error in getStatusOptions:", error);
      throw error;
    }
  }

  // Récupérer les équipes depuis Notion
  async getTeams() {
    try {
      return await notionService.getTeams();
    } catch (error) {
      console.error("Error in getTeams:", error);
      throw error;
    }
  }

  // Résoudre les IDs en noms en utilisant une map
  resolveIds(ids, map) {
    if (!ids) return null;

    if (Array.isArray(ids)) {
      return ids.map((id) => map.get(id) || id).filter(Boolean);
    } else {
      return map.get(ids) || ids;
    }
  }

  // Utilitaires privées
  async getClientColorsMap() {
    const clientColors = await ClientColors.find({});
    const colorMap = {};

    clientColors.forEach((cc) => {
      colorMap[cc.clientName] = cc.color;
    });

    return colorMap;
  }

  getClientColor(clientName, colorMap) {
    if (!clientName) return "#6366f1"; // Couleur par défaut

    // Si c'est un array (rollup), prendre le premier élément
    const client = Array.isArray(clientName) ? clientName[0] : clientName;

    return colorMap[client] || this.generateColorForClient(client);
  }

  generateColorForClient(clientName) {
    // Générer une couleur basée sur le nom du client
    const colors = [
      "#6366f1",
      "#8b5cf6",
      "#a855f7",
      "#d946ef",
      "#ec4899",
      "#f43f5e",
      "#ef4444",
      "#f97316",
      "#f59e0b",
      "#eab308",
      "#84cc16",
      "#22c55e",
      "#10b981",
      "#14b8a6",
      "#06b6d4",
      "#0ea5e9",
      "#3b82f6",
      "#6366f1",
      "#8b5cf6",
      "#a855f7",
    ];

    let hash = 0;
    for (let i = 0; i < clientName.length; i++) {
      hash = clientName.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  // Filtrer les tâches selon les préférences
  filterTasks(tasks, filters) {
    return tasks.filter((task) => {
      // Filtre par créatifs
      if (filters.selectedCreatives && filters.selectedCreatives.length > 0) {
        const taskCreatives = Array.isArray(task.assignedUsersNames)
          ? task.assignedUsersNames
          : [task.assignedUsersNames].filter(Boolean);

        const hasMatchingCreative = taskCreatives.some((creative) =>
          filters.selectedCreatives.includes(creative)
        );

        if (!hasMatchingCreative) return false;
      }

      // Filtre par clients
      if (filters.selectedClients && filters.selectedClients.length > 0) {
        const taskClient = Array.isArray(task.client)
          ? task.client[0]
          : task.client;
        if (!filters.selectedClients.includes(taskClient)) return false;
      }

      // Filtre par projets
      if (filters.selectedProjects && filters.selectedProjects.length > 0) {
        if (!filters.selectedProjects.includes(task.projectName)) return false;
      }

      // Filtre tâches terminées
      if (!filters.showCompleted) {
        const completedStatuses = ["Terminé", "Completed", "Done", "Fini"];
        if (completedStatuses.includes(task.status)) return false;
      }

      return true;
    });
  }
}

module.exports = new CalendarService();
