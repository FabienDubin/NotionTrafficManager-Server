const { Client } = require("@notionhq/client");
const cacheService = require("./cache.service");

class NotionService {
  constructor() {
    this.notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    this.databases = {
      users: process.env.NOTION_DATABASE_USERS_ID,
      clients: process.env.NOTION_DATABASE_CLIENTS_ID,
      projects: process.env.NOTION_DATABASE_PROJECTS_ID,
      trafic: process.env.NOTION_DATABASE_TRAFIC_ID,
    };

    this.clientMap = new Map();
    this.userMap = new Map();
    this.projectMap = new Map();
  }

  async loadReferenceMaps() {
    const [clients, users, projects] = await Promise.all([
      this.getClients(),
      this.getUsers(),
      this.getProjects(),
    ]);

    this.clientMap = new Map(clients.map((c) => [c.id, c.name]));
    this.userMap = new Map(users.map((u) => [u.id, u.name]));
    this.projectMap = new Map(projects.map((p) => [p.id, p.name]));
  }

  // ------------------------- TÂCHES -------------------------

  async getUnassignedTasks() {
    const cachedTasks = cacheService.getUnassignedFromCache();
    if (cachedTasks) return cachedTasks;

    const response = await this.notion.databases.query({
      database_id: this.databases.trafic,
      filter: {
        or: [
          { property: "Période de travail", date: { is_empty: true } },
          { property: "Utilisateurs", relation: { is_empty: true } },
        ],
      },
      sorts: [{ property: "Nom de tâche", direction: "ascending" }],
    });

    const tasks = this.formatTasks(response.results);
    cacheService.setUnassignedInCache(tasks);
    return tasks;
  }

  async getTasksInPeriod(startDate, endDate) {
    const cachedTasks = cacheService.getTasksFromCache(startDate, endDate);
    if (cachedTasks) return cachedTasks;

    const response = await this.notion.databases.query({
      database_id: this.databases.trafic,
      filter: {
        and: [
          { property: "Période de travail", date: { is_not_empty: true } },
          { property: "Période de travail", date: { on_or_after: startDate } },
          { property: "Période de travail", date: { on_or_before: endDate } },
        ],
      },
      sorts: [{ property: "Période de travail", direction: "ascending" }],
    });

    const tasks = this.formatTasks(response.results);
    cacheService.setTasksInCache(startDate, endDate, tasks);
    return tasks;
  }

  async updateTask(taskId, updates) {
    const properties = {};

    if (updates.period) {
      properties["Période de travail"] = { date: { ...updates.period } };
    }
    if (updates.status) {
      properties["État"] = { status: { name: updates.status } };
    }
    if (updates.users) {
      properties["Utilisateurs"] = {
        relation: updates.users.map((id) => ({ id })),
      };
    }

    const response = await this.notion.pages.update({
      page_id: taskId,
      properties,
    });

    cacheService.invalidateAllCache();
    return this.formatTask(response);
  }

  // ------------------------- FORMATAGE -------------------------

  formatTasks(tasks) {
    return tasks.map((task) => this.formatTask(task));
  }

  formatTask(task) {
    const rawProjects = this.getPropertyValue(
      task.properties["📁 Projets"],
      "relation"
    );
    const rawUsers = this.getPropertyValue(
      task.properties["Utilisateurs"],
      "relation"
    );
    const rawClient = this.getPropertyValue(task.properties.Client, "rollup");

    return {
      id: task.id,
      name: this.getPropertyValue(task.properties["Nom de tâche"], "title"),
      status: this.getPropertyValue(task.properties.État, "status"),
      period: this.getPropertyValue(
        task.properties["Période de travail"],
        "date"
      ),
      projectStatus: this.getPropertyValue(
        task.properties["Statut du projet"],
        "rollup"
      ),
      billedDays: this.getPropertyValue(
        task.properties["Nombre de jours facturés"],
        "number"
      ),
      spentDays: this.getPropertyValue(
        task.properties["Nombre de jours passés"],
        "number"
      ),
      addToCalendar: this.getPropertyValue(
        task.properties["Ajouter au Calendrier"],
        "checkbox"
      ),
      url: task.url,
      // enrichis
      client: this.resolveClientName(rawClient),
      users: this.resolveUserNames(rawUsers),
      projects: this.resolveProjectNames(rawProjects),
    };
  }

  resolveClientName(value) {
    if (!value) return null;
    const ids = Array.isArray(value) ? value : [value];
    return ids
      .map((id) => this.clientMap.get(id))
      .filter(Boolean)
      .join(", ");
  }

  resolveUserNames(ids) {
    return (ids || []).map((id) => this.userMap.get(id)).filter(Boolean);
  }

  resolveProjectNames(ids) {
    return (ids || []).map((id) => this.projectMap.get(id)).filter(Boolean);
  }

  // ------------------------- UTILS -------------------------

  getPropertyValue(property, type) {
    if (!property) return null;

    switch (type) {
      case "title":
        return property.title?.[0]?.plain_text || "";
      case "rich_text":
        return property.rich_text?.[0]?.plain_text || "";
      case "select":
        return property.select?.name || null;
      case "multi_select":
        return property.multi_select?.map((i) => i.name) || [];
      case "date":
        return property.date
          ? { start: property.date.start, end: property.date.end }
          : null;
      case "checkbox":
        return property.checkbox || false;
      case "number":
        return property.number || 0;
      case "email":
        return property.email || "";
      case "relation":
        return property.relation?.map((r) => r.id) || [];
      case "rollup":
        if (property.rollup?.type === "array") {
          return (
            property.rollup.array
              ?.map((item) => {
                if (item.type === "title") return item.title?.[0]?.plain_text;
                if (item.type === "select") return item.select?.name;
                if (item.type === "relation") return item.relation?.[0]?.id;
                return null;
              })
              .filter(Boolean) || []
          );
        }
        return [];
      case "files":
        return (
          property.files?.[0]?.file?.url ||
          property.files?.[0]?.external?.url ||
          null
        );
      case "status":
        return property.status?.name || null;
      default:
        return property;
    }
  }

  // ------------------------- RÉFÉRENCES -------------------------

  async getUsers() {
    const res = await this.notion.databases.query({
      database_id: this.databases.users,
      sorts: [{ property: "Nom", direction: "ascending" }],
    });

    return res.results.map((user) => ({
      id: user.id,
      name: this.getPropertyValue(user.properties.Nom, "title"),
      email: this.getPropertyValue(user.properties.Email, "email"),
      role: this.getPropertyValue(user.properties.Rôle, "multi_select"),
      photo: this.getPropertyValue(user.properties["Photo de profil"], "files"),
    }));
  }

  async getClients() {
    const res = await this.notion.databases.query({
      database_id: this.databases.clients,
      sorts: [{ property: "Nom du client", direction: "ascending" }],
    });

    return res.results.map((client) => ({
      id: client.id,
      name: this.getPropertyValue(client.properties["Nom du client"], "title"),
      type: this.getPropertyValue(
        client.properties["Type de client"],
        "multi_select"
      ),
      status: this.getPropertyValue(
        client.properties["Client Status"],
        "select"
      ),
    }));
  }

  async getProjects() {
    const res = await this.notion.databases.query({
      database_id: this.databases.projects,
      sorts: [{ property: "Nom", direction: "ascending" }],
    });

    return res.results.map((project) => ({
      id: project.id,
      name: this.getPropertyValue(project.properties.Nom, "title"),
      client: this.getPropertyValue(
        project.properties["🫡 Clients"],
        "relation"
      ),
      type: this.getPropertyValue(project.properties.Type, "multi_select"),
      status: this.getPropertyValue(
        project.properties["Statut du projet"],
        "select"
      ),
      startDate: this.getPropertyValue(
        project.properties["Date de début"],
        "date"
      ),
      endDate: this.getPropertyValue(project.properties["Date de fin"], "date"),
    }));
  }

  async preloadAdjacentPeriods(startDate, endDate, viewType = "month") {
    const adjacentPeriods = cacheService.getAdjacentPeriods(
      startDate,
      endDate,
      viewType
    );
    adjacentPeriods.forEach((period) =>
      this.getTasksInPeriod(period.start, period.end).catch(console.warn)
    );
  }
}

// Singleton
const notionService = new NotionService();
module.exports = notionService;
