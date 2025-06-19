const NodeCache = require("node-cache");

class CacheService {
  constructor() {
    // Cache avec TTL de 5 minutes
    this.tasksCache = new NodeCache({ stdTTL: 300 });
    this.unassignedCache = new NodeCache({ stdTTL: 300 });
  }

  // Génère une clé de cache basée sur la période
  getCacheKey(startDate, endDate) {
    return `tasks_${startDate}_${endDate}`;
  }

  // Récupère les tâches depuis le cache
  getTasksFromCache(startDate, endDate) {
    const cacheKey = this.getCacheKey(startDate, endDate);
    return this.tasksCache.get(cacheKey);
  }

  // Met en cache les tâches pour une période
  setTasksInCache(startDate, endDate, tasks) {
    const cacheKey = this.getCacheKey(startDate, endDate);
    this.tasksCache.set(cacheKey, tasks);
  }

  // Récupère les tâches non assignées depuis le cache
  getUnassignedFromCache() {
    return this.unassignedCache.get("unassigned_tasks");
  }

  // Met en cache les tâches non assignées
  setUnassignedInCache(tasks) {
    this.unassignedCache.set("unassigned_tasks", tasks);
  }

  // Invalide tout le cache (après modification de tâche)
  invalidateAllCache() {
    this.tasksCache.flushAll();
    this.unassignedCache.flushAll();
  }

  // Invalide seulement le cache des tâches non assignées
  invalidateUnassignedCache() {
    this.unassignedCache.del("unassigned_tasks");
  }

  // Calcule les périodes adjacentes pour le préchargement
  getAdjacentPeriods(startDate, endDate, viewType = "month") {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const periods = [];

    if (viewType === "month") {
      // Mois précédent
      const prevStart = new Date(start);
      prevStart.setMonth(prevStart.getMonth() - 1);
      const prevEnd = new Date(end);
      prevEnd.setMonth(prevEnd.getMonth() - 1);

      // Mois suivant
      const nextStart = new Date(start);
      nextStart.setMonth(nextStart.getMonth() + 1);
      const nextEnd = new Date(end);
      nextEnd.setMonth(nextEnd.getMonth() + 1);

      periods.push(
        { start: prevStart.toISOString(), end: prevEnd.toISOString() },
        { start: nextStart.toISOString(), end: nextEnd.toISOString() }
      );
    } else if (viewType === "week") {
      // 2 semaines précédentes
      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 14);
      const prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 14);

      // 2 semaines suivantes
      const nextStart = new Date(start);
      nextStart.setDate(nextStart.getDate() + 14);
      const nextEnd = new Date(end);
      nextEnd.setDate(nextEnd.getDate() + 14);

      periods.push(
        { start: prevStart.toISOString(), end: prevEnd.toISOString() },
        { start: nextStart.toISOString(), end: nextEnd.toISOString() }
      );
    }

    return periods;
  }
}

// Instance singleton
const cacheService = new CacheService();

module.exports = cacheService;
