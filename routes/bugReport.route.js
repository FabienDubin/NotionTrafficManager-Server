const express = require("express");
const router = express.Router();

// Middleware
const { isAuthenticated } = require("../middleware/jwt.middleware");
const { hasRole } = require("../middleware/role.middleware");
const { bugReportUploader } = require("../middleware/azure.middleware");

// Controllers
const {
  createBugReport,
  getAllBugReports,
  getBugReportById,
  updateBugReport,
  deleteBugReport,
  getBugReportStats,
  getMyBugReports,
} = require("../controllers/bugReport.controller");

// Routes publiques (nécessitent une authentification)

/**
 * POST /bug-reports
 * Créer un nouveau bug report
 * Authentification requise
 */
router.post("/", isAuthenticated, bugReportUploader, createBugReport);

/**
 * GET /bug-reports/my
 * Récupérer les bug reports de l'utilisateur connecté
 * Authentification requise
 */
router.get("/my", isAuthenticated, getMyBugReports);

/**
 * GET /bug-reports/stats
 * Récupérer les statistiques des bug reports
 * Admin uniquement
 */
router.get("/stats", isAuthenticated, hasRole(["admin"]), getBugReportStats);

// Routes admin (nécessitent une authentification admin)

/**
 * GET /bug-reports
 * Récupérer tous les bug reports avec pagination et filtres
 * Admin uniquement
 */
router.get("/", isAuthenticated, hasRole(["admin"]), getAllBugReports);

/**
 * GET /bug-reports/:id
 * Récupérer un bug report par ID
 * Admin uniquement
 */
router.get("/:id", isAuthenticated, hasRole(["admin"]), getBugReportById);

/**
 * PATCH /bug-reports/:id
 * Mettre à jour un bug report
 * Admin uniquement
 */
router.patch("/:id", isAuthenticated, hasRole(["admin"]), updateBugReport);

/**
 * DELETE /bug-reports/:id
 * Supprimer un bug report
 * Admin uniquement
 */
router.delete("/:id", isAuthenticated, hasRole(["admin"]), deleteBugReport);

module.exports = router;
