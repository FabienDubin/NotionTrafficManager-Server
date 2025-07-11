const express = require("express");
const router = express.Router();

const {
  getNotionConfig,
  saveNotionConfig,
  updateNotionConfig,
  testNotionConnection,
  getConfigStatus,
  getAllNotionConfigs,
  createNotionConfig,
  updateNotionConfigById,
  activateNotionConfig,
  deleteNotionConfig,
  resetNotionConfig,
} = require("../controllers/settings.controller");

const { isAuthenticated } = require("../middleware/jwt.middleware");
const { hasRole } = require("../middleware/role.middleware");

// Routes protégées par authentification et rôle admin
router.get(
  "/notion-config",
  isAuthenticated,
  hasRole(["admin"]),
  getNotionConfig
);

// Routes pour l'ancienne API (rétrocompatibilité)
router.post(
  "/notion-config-legacy",
  isAuthenticated,
  hasRole(["admin"]),
  saveNotionConfig
);

router.put(
  "/notion-config-legacy",
  isAuthenticated,
  hasRole(["admin"]),
  updateNotionConfig
);

router.post(
  "/test-connection",
  isAuthenticated,
  hasRole(["admin"]),
  testNotionConnection
);

router.get(
  "/config-status",
  isAuthenticated,
  hasRole(["admin"]),
  getConfigStatus
);

// Nouvelles routes pour la gestion multi-config
router.get(
  "/notion-configs",
  isAuthenticated,
  hasRole(["admin"]),
  getAllNotionConfigs
);

router.post(
  "/notion-config",
  isAuthenticated,
  hasRole(["admin"]),
  createNotionConfig
);

router.put(
  "/notion-config/:configId",
  isAuthenticated,
  hasRole(["admin"]),
  updateNotionConfigById
);

router.patch(
  "/notion-config/:configId/activate",
  isAuthenticated,
  hasRole(["admin"]),
  activateNotionConfig
);

router.delete(
  "/notion-config/:configId",
  isAuthenticated,
  hasRole(["admin"]),
  deleteNotionConfig
);

// Route pour réinitialiser la configuration Notion
router.post(
  "/reset-notion-config",
  isAuthenticated,
  hasRole(["admin"]),
  resetNotionConfig
);

module.exports = router;
