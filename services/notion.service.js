const { Client } = require("@notionhq/client");
const settingsService = require("./settings.service");

class NotionService {
  constructor() {
    this.notion = null;
    this.databases = null;
    this.configInitialized = false;
  }

  // Forcer la réinitialisation de la configuration
  resetConfig() {
    console.log("🔄 Forcing Notion config reset...");
    this.notion = null;
    this.databases = null;
    this.configInitialized = false;
  }

  // Initialiser la configuration Notion (DB en priorité, puis .env)
  async initializeConfig() {
    if (this.configInitialized) {
      return;
    }

    try {
      const activeConfig = await settingsService.getActiveNotionConfig();

      this.notion = new Client({
        auth: activeConfig.config.notionApiKey,
      });

      this.databases = {
        ...activeConfig.config.databaseIds,
        teams:
          activeConfig.config.databaseIds.teams ||
          process.env.NOTION_DATABASE_TEAMS_ID ||
          "",
      };
      this.configInitialized = true;

      console.log(`✅ Notion config initialized from ${activeConfig.source}`);
      console.log(`📊 Database IDs:`, {
        users: this.databases.users,
        clients: this.databases.clients,
        projects: this.databases.projects,
        trafic: this.databases.trafic,
        teams: this.databases.teams,
      });
    } catch (error) {
      console.error("❌ Failed to initialize Notion config:", error);
      throw new Error("Configuration Notion non disponible");
    }
  }

  // S'assurer que la config est initialisée avant chaque appel
  async ensureConfigInitialized() {
    if (!this.configInitialized) {
      await this.initializeConfig();
    }
  }

  // Récupérer les tâches pour une période donnée
  async getTasksByDateRange(startDate, endDate) {
    await this.ensureConfigInitialized();
    try {
      const response = await this.notion.databases.query({
        database_id: this.databases.trafic,
        filter: {
          and: [
            {
              property: "Période de travail",
              date: {
                on_or_after: startDate,
              },
            },
            {
              property: "Période de travail",
              date: {
                on_or_before: endDate,
              },
            },
          ],
        },
        sorts: [
          {
            property: "Période de travail",
            direction: "ascending",
          },
        ],
      });

      return response.results.map(this.formatTask);
    } catch (error) {
      console.error("Error fetching tasks from Notion:", error);
      throw new Error("Failed to fetch tasks from Notion");
    }
  }

  // Récupérer toutes les tâches non assignées (sans période de travail UNIQUEMENT)
  async getUnassignedTasks() {
    await this.ensureConfigInitialized();
    try {
      const response = await this.notion.databases.query({
        database_id: this.databases.trafic,
        filter: {
          property: "Période de travail",
          date: {
            is_empty: true,
          },
        },
        sorts: [
          {
            property: "Nom de tâche",
            direction: "ascending",
          },
        ],
      });

      return response.results.map(this.formatTask);
    } catch (error) {
      console.error("Error fetching unassigned tasks from Notion:", error);
      throw new Error("Failed to fetch unassigned tasks from Notion");
    }
  }

  // Créer une nouvelle tâche
  async createTask(taskData) {
    await this.ensureConfigInitialized();
    try {
      console.log("🔄 Creating new task in Notion:", taskData);

      const properties = {};

      // Nom de la tâche (obligatoire)
      if (taskData.name) {
        properties["Nom de tâche"] = {
          title: [
            {
              text: {
                content: taskData.name,
              },
            },
          ],
        };
      }

      // Projet (obligatoire)
      if (taskData.projectId) {
        properties["📁 Projets"] = {
          relation: [{ id: taskData.projectId }],
        };
      }

      // Période de travail (dates définies par la sélection)
      if (taskData.startDate && taskData.endDate) {
        let startDate = taskData.startDate;
        let endDate = taskData.endDate;

        // S'assurer que les dates sont au bon format ISO
        if (startDate && !startDate.includes("T")) {
          startDate = `${startDate}T09:00:00`;
        }
        if (endDate && !endDate.includes("T")) {
          endDate = `${endDate}T18:00:00`;
        }

        properties["Période de travail"] = {
          date: {
            start: startDate,
            end: endDate,
          },
        };
      }

      // Statut par défaut "Pas commencé"
      properties["État"] = {
        status: {
          name: taskData.status || "Pas commencé",
        },
      };

      // Utilisateurs assignés (optionnel)
      if (taskData.assignedUsers && taskData.assignedUsers.length > 0) {
        properties["Utilisateurs"] = {
          relation: taskData.assignedUsers.map((userId) => ({ id: userId })),
        };
      }

      // Notes/commentaires (optionnel)
      if (taskData.notes) {
        properties["Commentaire"] = {
          rich_text: [
            {
              text: {
                content: taskData.notes,
              },
            },
          ],
        };
      }

      // Ajouter au calendrier (optionnel)
      if (taskData.addToCalendar !== undefined) {
        properties["Ajouter au Calendrier"] = {
          checkbox: taskData.addToCalendar,
        };
      }

      // Ajouter au rétroplanning (optionnel)
      if (taskData.addToRetroPlanning !== undefined) {
        properties["Ajouter au rétroplanning client"] = {
          checkbox: taskData.addToRetroPlanning,
        };
      }

      console.log("📝 Notion properties for new task:", properties);

      const response = await this.notion.pages.create({
        parent: {
          database_id: this.databases.trafic,
        },
        properties,
      });

      console.log("✅ Task created successfully in Notion");
      return this.formatTask(response);
    } catch (error) {
      console.error("❌ Error creating task in Notion:", error);
      throw new Error(`Failed to create task in Notion: ${error.message}`);
    }
  }

  // Mettre à jour une tâche
  async updateTask(taskId, updates) {
    await this.ensureConfigInitialized();
    try {
      console.log("🔄 Updating task in Notion:", { taskId, updates });

      const properties = {};

      // Gestion des dates - support pour workPeriod et startDate/endDate
      if (updates.workPeriod) {
        properties["Période de travail"] = {
          date: {
            start: updates.workPeriod.start,
            end: updates.workPeriod.end || null,
          },
        };
      } else if (updates.startDate || updates.endDate) {
        // Validation et formatage des dates
        let startDate = updates.startDate;
        let endDate = updates.endDate;

        // S'assurer que les dates sont au bon format ISO
        if (startDate && !startDate.includes("T")) {
          startDate = `${startDate}T09:00:00`;
        }
        if (endDate && !endDate.includes("T")) {
          endDate = `${endDate}T18:00:00`;
        }

        // Validation des dates
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);

          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error("Format de date invalide");
          }

          if (end < start) {
            throw new Error(
              "La date de fin ne peut pas être antérieure à la date de début"
            );
          }
        }

        properties["Période de travail"] = {
          date: {
            start: startDate,
            end: endDate || null,
          },
        };
      }

      // Gestion du statut
      if (updates.status) {
        properties["État"] = {
          status: {
            name: updates.status,
          },
        };
      }

      // Gestion des utilisateurs assignés
      if (updates.assignedUsers) {
        properties["Utilisateurs"] = {
          relation: updates.assignedUsers.map((userId) => ({ id: userId })),
        };
      }

      // Gestion du nom de la tâche
      if (updates.name) {
        properties["Nom de tâche"] = {
          title: [
            {
              text: {
                content: updates.name,
              },
            },
          ],
        };
      }

      // Gestion du projet
      if (updates.projectId) {
        properties["📁 Projets"] = {
          relation: [{ id: updates.projectId }],
        };
      }

      // Gestion des notes/commentaires
      if (updates.notes !== undefined) {
        properties["Commentaire"] = {
          rich_text: [
            {
              text: {
                content: updates.notes || "",
              },
            },
          ],
        };
      }

      // Gestion d'Ajouter au calendrier
      if (updates.addToCalendar !== undefined) {
        properties["Ajouter au Calendrier"] = {
          checkbox: updates.addToCalendar,
        };
      }

      // Gestion d'Ajouter au rétroplanning
      if (updates.addToRetroPlanning !== undefined) {
        properties["Ajouter au rétroplanning client"] = {
          checkbox: updates.addToRetroPlanning,
        };
      }

      console.log("📝 Notion properties to update:", properties);

      const response = await this.notion.pages.update({
        page_id: taskId,
        properties,
      });

      console.log("✅ Task updated successfully in Notion");
      return this.formatTask(response);
    } catch (error) {
      console.error("❌ Error updating task in Notion:", error);
      throw new Error(`Failed to update task in Notion: ${error.message}`);
    }
  }

  // Supprimer une tâche (archivage dans Notion)
  async deleteTask(taskId) {
    await this.ensureConfigInitialized();
    try {
      console.log("🗑️ Deleting task in Notion:", taskId);

      // Dans Notion, on archive la page au lieu de la supprimer définitivement
      const response = await this.notion.pages.update({
        page_id: taskId,
        archived: true,
      });

      console.log("✅ Task archived successfully in Notion");
      return response;
    } catch (error) {
      console.error("❌ Error deleting task in Notion:", error);
      throw new Error(`Failed to delete task in Notion: ${error.message}`);
    }
  }

  // Récupérer la liste des utilisateurs/créatifs
  async getUsers() {
    await this.ensureConfigInitialized();
    try {
      const response = await this.notion.databases.query({
        database_id: this.databases.users,
        sorts: [
          {
            property: "Nom",
            direction: "ascending",
          },
        ],
      });

      return response.results.map(this.formatUser);
    } catch (error) {
      console.error("Error fetching users from Notion:", error);
      throw new Error("Failed to fetch users from Notion");
    }
  }

  // Récupérer la liste des équipes
  async getTeams() {
    await this.ensureConfigInitialized();
    try {
      if (!this.databases.teams) {
        throw new Error(
          "L'ID de la base de données Équipes n'est pas configuré"
        );
      }
      const response = await this.notion.databases.query({
        database_id: this.databases.teams,
        sorts: [
          {
            property: "Nom",
            direction: "ascending",
          },
        ],
      });

      return response.results.map(this.formatTeam);
    } catch (error) {
      console.error("Error fetching teams from Notion:", error);
      throw new Error("Failed to fetch teams from Notion");
    }
  }

  // Formater une équipe
  formatTeam = (page) => {
    const properties = page.properties;
    return {
      id: page.id,
      name: this.getPropertyValue(properties["Nom"], "title"),
      // Ajouter d'autres propriétés si besoin
    };
  };

  // Récupérer la liste des clients
  async getClients() {
    await this.ensureConfigInitialized();
    try {
      const response = await this.notion.databases.query({
        database_id: this.databases.clients,
        sorts: [
          {
            property: "Nom du client",
            direction: "ascending",
          },
        ],
      });

      return response.results.map(this.formatClient);
    } catch (error) {
      console.error("Error fetching clients from Notion:", error);
      throw new Error("Failed to fetch clients from Notion");
    }
  }

  // Récupérer la liste des projets
  async getProjects() {
    await this.ensureConfigInitialized();
    try {
      const response = await this.notion.databases.query({
        database_id: this.databases.projects,
        sorts: [
          {
            property: "Nom",
            direction: "ascending",
          },
        ],
      });

      return response.results.map(this.formatProject);
    } catch (error) {
      console.error("Error fetching projects from Notion:", error);
      throw new Error("Failed to fetch projects from Notion");
    }
  }

  // Récupérer les options de statut depuis la base Notion
  async getStatusOptions() {
    await this.ensureConfigInitialized();
    try {
      const response = await this.notion.databases.retrieve({
        database_id: this.databases.trafic,
      });

      const statusProperty = response.properties["État"];
      if (statusProperty && statusProperty.type === "status") {
        return statusProperty.status.options.map((option) => ({
          id: option.id,
          name: option.name,
          color: option.color,
        }));
      }

      // Fallback si pas de propriété status trouvée
      return [
        { id: "1", name: "Pas commencé", color: "gray" },
        { id: "2", name: "En cours", color: "blue" },
        { id: "3", name: "Terminé", color: "green" },
      ];
    } catch (error) {
      console.error("Error fetching status options from Notion:", error);
      // Fallback en cas d'erreur
      return [
        { id: "1", name: "Pas commencé", color: "gray" },
        { id: "2", name: "En cours", color: "blue" },
        { id: "3", name: "Terminé", color: "green" },
      ];
    }
  }

  // Formatage des données
  formatTask = (page) => {
    const properties = page.properties;

    return {
      id: page.id,
      name:
        this.getPropertyValue(properties["Nom de tâche"], "title") ||
        this.getPropertyValue(properties["Nom de la tache"], "formula") ||
        "Tâche sans nom",
      project: this.getPropertyValue(properties["📁 Projets"], "relation"),
      projectName: this.getPropertyValue(
        properties["📁 Projets"],
        "relation",
        "title"
      ),
      client: this.getPropertyValue(properties["Client"], "rollup"),
      clientGroup: this.getPropertyValue(
        properties["Client (Group)"],
        "formula"
      ),
      assignedUsers: this.getPropertyValue(
        properties["Utilisateurs"],
        "relation"
      ),
      assignedUsersNames: this.getPropertyValue(
        properties["Profil Notion"],
        "rollup"
      ),
      team: this.getPropertyValue(properties["Équipe"], "rollup"),
      status: this.getPropertyValue(properties["État"], "status"),
      workPeriod: this.getPropertyValue(
        properties["Période de travail"],
        "date"
      ),
      billedDays: this.getPropertyValue(
        properties["Nombre de jours facturés"],
        "number"
      ),
      spentDays: this.getPropertyValue(
        properties["Nombre de jours passés"],
        "number"
      ),
      addToCalendar: this.getPropertyValue(
        properties["Ajouter au Calendrier"],
        "checkbox"
      ),
      addToRetroPlanning: this.getPropertyValue(
        properties["Ajouter au rétroplanning client"],
        "checkbox"
      ),
      googleEventId: this.getPropertyValue(
        properties["Google Event ID"],
        "rich_text"
      ),
      projectLead: this.getPropertyValue(properties["Project Lead"], "rollup"),
      projectStatus: this.getPropertyValue(
        properties["Statut du projet"],
        "rollup"
      ),
      commentaire: this.getPropertyValue(
        properties["Commentaire"],
        "rich_text"
      ),
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
    };
  };

  formatUser = (page) => {
    const properties = page.properties;

    return {
      id: page.id,
      name: this.getPropertyValue(properties["Nom"], "title"),
      profilePhoto: this.getPropertyValue(
        properties["Photo de profil"],
        "files"
      ),
      notionProfile: this.getPropertyValue(
        properties["Profil Notion"],
        "people"
      ),
      team: this.getPropertyValue(properties["Équipe"], "relation"),
      role: this.getPropertyValue(properties["Rôle"], "multi_select"),
      manager: this.getPropertyValue(properties["Manager"], "people"),
      email: this.getPropertyValue(properties["Email"], "email"),
      tasks: this.getPropertyValue(properties["✅ Tâches"], "relation"),
    };
  };

  formatClient = (page) => {
    const properties = page.properties;

    return {
      id: page.id,
      name: this.getPropertyValue(properties["Nom du client"], "title"),
      type: this.getPropertyValue(properties["Type de client"], "multi_select"),
      contactName: this.getPropertyValue(
        properties["Nom contact principal"],
        "rich_text"
      ),
      status: this.getPropertyValue(properties["Client Status"], "select"),
      notes: this.getPropertyValue(properties["Notes"], "rich_text"),
      contactEmail: this.getPropertyValue(properties["Email contact"], "email"),
    };
  };

  formatProject = (page) => {
    const properties = page.properties;

    return {
      id: page.id,
      name: this.getPropertyValue(properties["Nom"], "title"),
      clients: this.getPropertyValue(properties["🫡 Clients"], "relation"),
      client: this.getPropertyValue(properties["🫡 Clients"], "rollup"),
      type: this.getPropertyValue(properties["Type"], "multi_select"),
      status: this.getPropertyValue(properties["Statut du projet"], "select"),
      involvedTeams: this.getPropertyValue(
        properties["👯‍♂️ Équipes Impliquées"],
        "relation"
      ),
      projectLead: this.getPropertyValue(properties["Lead Projet"], "people"),
      startDate: this.getPropertyValue(properties["Date de début"], "date"),
      endDate: this.getPropertyValue(properties["Date de fin"], "date"),
      driveUrl: this.getPropertyValue(properties["Drive"], "url"),
      tasks: this.getPropertyValue(properties["Tâches"], "relation"),
      involvedUsers: this.getPropertyValue(
        properties["Utilisateurs Impliqués"],
        "relation"
      ),
      folderNumber: this.getPropertyValue(
        properties["Simone - N° de dossier"],
        "rich_text"
      ),
      emoji: this.getPropertyValue(properties["Emoji"], "rich_text"),
    };
  };

  // Utilitaire pour extraire les valeurs des propriétés Notion
  getPropertyValue(property, type, subType = null) {
    if (!property) return null;

    switch (type) {
      case "title":
        return property.title?.[0]?.plain_text || null;
      case "rich_text":
        return property.rich_text?.[0]?.plain_text || null;
      case "number":
        return property.number;
      case "select":
        return property.select?.name || null;
      case "multi_select":
        return property.multi_select?.map((item) => item.name) || [];
      case "date":
        return property.date
          ? {
              start: property.date.start,
              end: property.date.end,
            }
          : null;
      case "checkbox":
        return property.checkbox;
      case "url":
        return property.url;
      case "email":
        return property.email;
      case "phone_number":
        return property.phone_number;
      case "files":
        return (
          property.files?.map((file) => ({
            name: file.name,
            url: file.type === "external" ? file.external.url : file.file.url,
          })) || []
        );
      case "people":
        return (
          property.people?.map((person) => ({
            id: person.id,
            name: person.name,
            avatar_url: person.avatar_url,
            type: person.type,
            person: person.person,
          })) || []
        );
      case "relation":
        if (subType === "title") {
          // Pour les rollups qui contiennent des titres
          return property.relation?.[0]?.title?.[0]?.plain_text || null;
        }
        return property.relation?.map((rel) => rel.id) || [];
      case "rollup":
        if (property.rollup?.type === "array") {
          return (
            property.rollup.array
              ?.map((item) => {
                if (item.type === "title") {
                  return item.title?.[0]?.plain_text;
                } else if (item.type === "rich_text") {
                  return item.rich_text?.[0]?.plain_text;
                } else if (item.type === "people") {
                  return item.people?.map((person) => person.name);
                } else if (item.type === "relation") {
                  // Gestion des relations dans les rollups
                  return item.relation?.map((rel) => rel.id);
                }
                return item;
              })
              .filter(Boolean)
              .flat() || []
          );
        } else if (property.rollup?.type === "string") {
          return property.rollup.string;
        } else if (property.rollup?.type === "relation") {
          // Rollup direct d'une relation
          return property.rollup.relation?.map((rel) => rel.id) || [];
        }
        return (
          property.rollup?.array ||
          property.rollup?.string ||
          property.rollup?.relation ||
          null
        );
      case "formula":
        if (property.formula?.type === "string") {
          return property.formula.string;
        } else if (property.formula?.type === "number") {
          return property.formula.number;
        }
        return property.formula?.string || property.formula?.number || null;
      case "status":
        return property.status?.name || null;
      default:
        return property;
    }
  }
}

module.exports = new NotionService();
