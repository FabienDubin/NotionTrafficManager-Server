const express = require("express");
const router = express.Router();

const {
  getNotionConfig,
  saveNotionConfig,
  updateNotionConfig,
  testNotionConnection,
  getConfigStatus,
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

router.post(
  "/notion-config",
  isAuthenticated,
  hasRole(["admin"]),
  saveNotionConfig
);

router.put(
  "/notion-config",
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

module.exports = router;
