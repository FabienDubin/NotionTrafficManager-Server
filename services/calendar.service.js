const notionService = require("./notion.service");
const UserPreferences = require("../models/UserPreferences.model");
const ClientColors = require("../models/ClientColors.model");

class CalendarService {
  // Récupérer les tâches avec les couleurs clients pour une période
  async getTasksWithColors(startDate, endDate, userId) {
    try {
      console.log(`🔍 [DEBUG] Starting getTasksWithColors - Environment: ${process.env.NODE_ENV || 'development'}`);
      const startTime = Date.now();

      // Récupérer les tâches depuis Notion
      const tasks = await notionService.getTasksByDateRange(startDate, endDate);
      console.log(`⏱️ [TIMING] Tasks loaded in ${Date.now() - startTime}ms`);

      // Récupérer les données de référence pour résoudre les IDs
      const refDataTime = Date.now();
      const [clients, projects, users] = await Promise.all([
        notionService.getClients(),
        this.getProjects(), // Utiliser la version enrichie avec clients
        notionService.getUsers(),
      ]);
      console.log(`⏱️ [TIMING] Reference data loaded in ${Date.now() - refDataTime}ms`);

      // Log des données de référence
      console.log(`🔍 [DEBUG] Reference data loaded:`, {
        clients: clients.length,
        projects: projects.length,
        users: users.length,
      });

      // Log quelques exemples de clients et projets pour vérifier leur structure
      if (clients.length > 0) {
        console.log(`🔍 [DEBUG] Sample clients:`, clients.slice(0, 3).map(c => ({ id: c.id, name: c.name })));
      } else {
        console.log(`⚠️ [WARNING] No clients loaded from Notion!`);
      }

      if (projects.length > 0) {
        console.log(`🔍 [DEBUG] Sample projects:`, projects.slice(0, 3).map(p => ({ id: p.id, name: p.name, client: p.client })));
      } else {
        console.log(`⚠️ [WARNING] No projects loaded from Notion!`);
      }

      // Créer des maps pour la résolution rapide
      const clientsMap = new Map(clients.map((c) => [c.id, c.name]));
      const projectsMap = new Map(projects.map((p) => [p.id, p])); // Stocker l'objet projet complet
      const usersMap = new Map(users.map((u) => [u.id, u.name]));

      // Récupérer les couleurs des clients
      const colorsTime = Date.now();
      const clientColors = await this.getClientColorsMap();
      console.log(`⏱️ [TIMING] Client colors loaded in ${Date.now() - colorsTime}ms`);

      // Log de l'état des données de base
      console.log(`🔍 [DEBUG] Data state before enrichment:`, {
        tasksCount: tasks.length,
        clientsMapSize: clientsMap.size,
        projectsMapSize: projectsMap.size,
        usersMapSize: usersMap.size,
        clientColorsCount: Object.keys(clientColors).length,
      });

      // Séparer les tâches congés des autres pour les logs
      const vacationTasks = tasks.filter(t => t.name && t.name.includes('Congés'));
      const normalTasks = tasks.filter(t => t.name && !t.name.includes('Congés'));
      
      console.log(`🔍 [DEBUG] Task distribution:`, {
        vacationTasks: vacationTasks.length,
        normalTasks: normalTasks.length,
        totalTasks: tasks.length
      });

      // Enrichir les tâches avec les noms résolus et les couleurs
      const enrichedTasks = tasks.map((task, index) => {
        // Résoudre les IDs clients en noms (essayer d'abord le rollup)
        let clientNames = this.resolveIds(task.client, clientsMap);
        let clientName = Array.isArray(clientNames)
          ? clientNames[0]
          : clientNames;

        // Si le client n'est pas trouvé via le rollup, essayer via le projet
        if (!clientName && task.project && Array.isArray(task.project) && task.project.length > 0) {
          const clientFromProject = this.resolveClientFromProject(task.project, projectsMap);
          if (clientFromProject) {
            clientName = clientFromProject;
            clientNames = [clientFromProject];
          }
        }

        // Résoudre les IDs projets en noms
        const projectNames = this.resolveProjectNames(task.project, projectsMap);
        const projectName = Array.isArray(projectNames)
          ? projectNames[0]
          : projectNames;

        // Résoudre les IDs utilisateurs en noms
        const userNames = this.resolveIds(task.assignedUsers, usersMap);

        // Couleur du client avec debug
        const clientColor = this.getClientColor(clientName, clientColors);

        // Debug logs détaillés - montrer différents types de tâches
        const isVacation = task.name && task.name.includes('Congés');
        const clientResolvedFromProject = !task.client && clientName;
        
        if (index < 3 || (!isVacation && normalTasks.indexOf(task) < 3)) {
          console.log(`🔍 [DEBUG] Task enrichment #${index + 1} ${isVacation ? '(VACATION)' : '(NORMAL)'}:`, {
            taskName: task.name,
            taskType: isVacation ? 'VACATION' : 'NORMAL',
            originalClient: task.client,
            resolvedClientName: clientName,
            clientResolvedFromProject: clientResolvedFromProject,
            clientColor: clientColor,
            originalProject: task.project,
            resolvedProjectName: projectName,
            hasClientData: !!task.client,
            hasProjectData: !!task.project,
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
          clientColor: clientColor,
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

      console.log(`⏱️ [TIMING] Total getTasksWithColors execution: ${Date.now() - startTime}ms`);
      console.log(`🔍 [DEBUG] Enrichment completed - returning ${enrichedTasks.length} tasks`);
      
      // Log final pour vérifier les couleurs appliquées
      const tasksWithColors = enrichedTasks.filter(t => t.clientColor && t.clientColor !== '#6366f1');
      const tasksWithDefaultColor = enrichedTasks.filter(t => !t.clientColor || t.clientColor === '#6366f1');
      
      console.log(`🎨 [DEBUG] Color application summary:`, {
        tasksWithCustomColors: tasksWithColors.length,
        tasksWithDefaultColor: tasksWithDefaultColor.length,
        totalTasks: enrichedTasks.length
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
        this.getProjects(), // Utiliser la version enrichie avec clients
        notionService.getUsers(),
      ]);

      // Créer des maps pour la résolution rapide
      const clientsMap = new Map(clients.map((c) => [c.id, c.name]));
      const projectsMap = new Map(projects.map((p) => [p.id, p])); // Stocker l'objet projet complet
      const usersMap = new Map(users.map((u) => [u.id, u.name]));

      const clientColors = await this.getClientColorsMap();

      return tasks.map((task) => {
        // Résoudre les IDs clients en noms (essayer d'abord le rollup)
        let clientNames = this.resolveIds(task.client, clientsMap);
        let clientName = Array.isArray(clientNames)
          ? clientNames[0]
          : clientNames;

        // Si le client n'est pas trouvé via le rollup, essayer via le projet
        if (!clientName && task.project && Array.isArray(task.project) && task.project.length > 0) {
          const clientFromProject = this.resolveClientFromProject(task.project, projectsMap);
          if (clientFromProject) {
            clientName = clientFromProject;
            clientNames = [clientFromProject];
          }
        }
        const projectNames = this.resolveProjectNames(task.project, projectsMap);
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
        this.getProjects(), // Utiliser la version enrichie avec clients
        notionService.getUsers(),
      ]);

      // Créer des maps pour la résolution rapide
      const clientsMap = new Map(clients.map((c) => [c.id, c.name]));
      const projectsMap = new Map(projects.map((p) => [p.id, p])); // Stocker l'objet projet complet
      const usersMap = new Map(users.map((u) => [u.id, u.name]));

      // Récupérer les couleurs des clients
      const clientColors = await this.getClientColorsMap();

      // Résoudre les IDs clients en noms (essayer d'abord le rollup)
      let clientNames = this.resolveIds(task.client, clientsMap);
      let clientName = Array.isArray(clientNames)
        ? clientNames[0]
        : clientNames;

      // Si le client n'est pas trouvé via le rollup, essayer via le projet
      if (!clientName && task.project && Array.isArray(task.project) && task.project.length > 0) {
        const clientFromProject = this.resolveClientFromProject(task.project, projectsMap);
        if (clientFromProject) {
          clientName = clientFromProject;
          clientNames = [clientFromProject];
        }
      }

      // Résoudre les IDs projets en noms
      const projectNames = this.resolveProjectNames(task.project, projectsMap);
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

  // Résoudre les IDs de projets en noms (gère les objets complets)  
  resolveProjectNames(ids, projectsMap) {
    if (!ids) return null;

    if (Array.isArray(ids)) {
      return ids.map((id) => {
        const project = projectsMap.get(id);
        return project?.name || id;
      }).filter(Boolean);
    } else {
      const project = projectsMap.get(ids);
      return project?.name || ids;
    }
  }

  // Résoudre le client depuis le projet (fallback quand le rollup est cassé)
  resolveClientFromProject(projectIds, projectsMap) {
    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return null;
    }

    try {
      // Prendre le premier projet de la liste
      const projectId = projectIds[0];
      const project = projectsMap.get(projectId);
      
      if (!project) {
        return null;
      }

      // Le projet a déjà le client résolu grâce à getProjects() qui enrichit les données
      if (project.client) {
        return Array.isArray(project.client) ? project.client[0] : project.client;
      }

      return null;
    } catch (error) {
      console.error("Error resolving client from project:", error);
      return null;
    }
  }

  // Utilitaires privées
  async getClientColorsMap() {
    try {
      const clientColors = await ClientColors.find({});
      const colorMap = {};

      console.log(`🎨 [DEBUG] ClientColors from DB: ${clientColors.length} entries found`);
      
      if (clientColors.length === 0) {
        console.log(`⚠️ [WARNING] No client colors found in database!`);
      }
      
      clientColors.forEach((cc) => {
        colorMap[cc.clientName] = cc.color;
        console.log(`🎨 [DEBUG] Color mapping: "${cc.clientName}" → ${cc.color}`);
      });

      console.log(`🎨 [DEBUG] Final colorMap:`, colorMap);
      
      // Log si le colorMap est vide
      if (Object.keys(colorMap).length === 0) {
        console.log(`⚠️ [WARNING] ColorMap is empty! This will cause all tasks to use default colors.`);
      }
      
      return colorMap;
    } catch (error) {
      console.error(`❌ [ERROR] Failed to get client colors from DB:`, error);
      return {}; // Retourner un objet vide en cas d'erreur
    }
  }

  getClientColor(clientName, colorMap) {
    if (!clientName) {
      console.log(`🎨 [DEBUG] No clientName provided, using default color`);
      return "#6366f1"; // Couleur par défaut
    }

    // Si c'est un array (rollup), prendre le premier élément
    const client = Array.isArray(clientName) ? clientName[0] : clientName;
    const color = colorMap[client] || this.generateColorForClient(client);
    
    console.log(`🎨 [DEBUG] Color resolution: "${client}" → ${color} ${colorMap[client] ? '(from config)' : '(generated)'}`);
    
    return color;
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

  // Vérifier les chevauchements de tâches pour les utilisateurs assignés
  async checkTaskOverlap(assignedUsers, startDate, endDate, excludeTaskId) {
    try {
      console.log("🔍 Checking task overlap for:", {
        assignedUsers,
        startDate,
        endDate,
        excludeTaskId,
      });

      const conflicts = [];
      
      // Convertir les dates en objets Date
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);

      // Récupérer toutes les tâches avec une période de travail
      const allTasks = await notionService.getTasksWithWorkPeriod();

      // Récupérer les données de référence pour résoudre les IDs
      const [users, projects] = await Promise.all([
        notionService.getUsers(),
        this.getProjects(), // Utiliser la version enrichie avec clients
      ]);

      // Créer des maps pour la résolution rapide
      const usersMap = new Map(users.map((u) => [u.id, u.name]));
      const projectsMap = new Map(projects.map((p) => [p.id, p])); // Stocker l'objet projet complet

      // Vérifier chaque utilisateur assigné
      for (const userId of assignedUsers) {
        const userName = usersMap.get(userId) || userId;
        
        // Trouver les tâches de cet utilisateur qui peuvent chevaucher
        const userTasks = allTasks.filter((task) => {
          // Exclure la tâche en cours d'édition
          if (excludeTaskId && task.id === excludeTaskId) return false;
          
          // Vérifier si l'utilisateur est assigné à cette tâche
          if (!task.assignedUsers || !task.assignedUsers.includes(userId)) return false;
          
          // Vérifier si la tâche a une période de travail
          if (!task.workPeriod || !task.workPeriod.start || !task.workPeriod.end) return false;
          
          return true;
        });

        // Vérifier les chevauchements temporels
        for (const existingTask of userTasks) {
          const existingStart = new Date(existingTask.workPeriod.start);
          const existingEnd = new Date(existingTask.workPeriod.end);

          // Vérifier si les périodes se chevauchent
          if (newStart < existingEnd && newEnd > existingStart) {
            // Résoudre le nom du projet
            const projectName = this.resolveProjectNames(existingTask.project, projectsMap);
            const finalProjectName = Array.isArray(projectName) ? projectName[0] : projectName;

            conflicts.push({
              userId,
              userName,
              conflictingTask: {
                id: existingTask.id,
                name: existingTask.name,
                projectName: finalProjectName,
                startDate: existingTask.workPeriod.start,
                endDate: existingTask.workPeriod.end,
              },
            });
          }
        }
      }

      // Créer le message de conflit
      let conflictMessage = "";
      if (conflicts.length > 0) {
        const conflictDescriptions = conflicts.map((conflict) => {
          const start = new Date(conflict.conflictingTask.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const end = new Date(conflict.conflictingTask.endDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          return `${conflict.userName} a déjà "${conflict.conflictingTask.name}" de ${start} à ${end}`;
        });
        conflictMessage = conflictDescriptions.join(", ");
      }

      console.log("🔍 Overlap check result:", {
        hasConflicts: conflicts.length > 0,
        conflictsCount: conflicts.length,
        conflictMessage,
      });

      return {
        hasConflicts: conflicts.length > 0,
        conflictMessage,
        conflicts,
      };
    } catch (error) {
      console.error("Error in checkTaskOverlap:", error);
      throw error;
    }
  }
}

module.exports = new CalendarService();
