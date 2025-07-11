const settingsService = require("../services/settings.service");
const NotionConfig = require("../models/NotionConfig.model");
const notionService = require("../services/notion.service");

// Récupérer la configuration Notion stockée en DB
const getNotionConfig = async (req, res, next) => {
  try {
    const config = await settingsService.getStoredNotionConfig();

    if (!config) {
      return res.status(200).json({
        message: "Aucune configuration trouvée en base de données",
        config: null,
      });
    }

    // Ne pas renvoyer la clé API complète pour des raisons de sécurité
    const safeConfig = {
      id: config._id,
      notionApiKey: config.notionApiKey
        ? `${config.notionApiKey.substring(0, 10)}...`
        : null,
      databaseIds: config.databaseIds,
      isActive: config.isActive,
      createdBy: config.createdBy,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };

    res.status(200).json({
      message: "Configuration récupérée avec succès",
      config: safeConfig,
    });
  } catch (error) {
    console.error("Error in getNotionConfig:", error);
    next(error);
  }
};

// Sauvegarder une nouvelle configuration Notion
const saveNotionConfig = async (req, res, next) => {
  try {
    const { notionApiKey, databaseIds } = req.body;
    const userId = req.user._id;

    // Validation des données
    if (!notionApiKey || !databaseIds) {
      return res.status(400).json({
        message: "Clé API et IDs de bases de données requis",
      });
    }

    if (
      !databaseIds.users ||
      !databaseIds.clients ||
      !databaseIds.projects ||
      !databaseIds.trafic
    ) {
      return res.status(400).json({
        message: "Tous les IDs de bases de données sont requis",
      });
    }

    const configData = {
      notionApiKey,
      databaseIds,
    };

    const savedConfig = await settingsService.saveNotionConfig(
      configData,
      userId
    );

    res.status(201).json({
      message: "Configuration sauvegardée avec succès",
      config: {
        id: savedConfig._id,
        isActive: savedConfig.isActive,
        createdAt: savedConfig.createdAt,
      },
    });
  } catch (error) {
    console.error("Error in saveNotionConfig:", error);
    next(error);
  }
};

// Mettre à jour la configuration Notion existante
const updateNotionConfig = async (req, res, next) => {
  try {
    const { notionApiKey, databaseIds } = req.body;
    const userId = req.user._id;

    // Validation des données
    if (!notionApiKey || !databaseIds) {
      return res.status(400).json({
        message: "Clé API et IDs de bases de données requis",
      });
    }

    if (
      !databaseIds.users ||
      !databaseIds.clients ||
      !databaseIds.projects ||
      !databaseIds.trafic
    ) {
      return res.status(400).json({
        message: "Tous les IDs de bases de données sont requis",
      });
    }

    const configData = {
      notionApiKey,
      databaseIds,
    };

    const updatedConfig = await settingsService.updateNotionConfig(
      configData,
      userId
    );

    res.status(200).json({
      message: "Configuration mise à jour avec succès",
      config: {
        id: updatedConfig._id,
        isActive: updatedConfig.isActive,
        updatedAt: updatedConfig.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error in updateNotionConfig:", error);
    next(error);
  }
};

// Tester la connexion Notion
const testNotionConnection = async (req, res, next) => {
  try {
    const { name, notionApiKey, databaseIds } = req.body;

    // Validation des données
    if (!name || !notionApiKey || !databaseIds) {
      return res.status(400).json({
        message: "Nom, clé API et IDs de bases de données requis pour le test",
      });
    }

    if (
      !databaseIds.users ||
      !databaseIds.clients ||
      !databaseIds.projects ||
      !databaseIds.trafic ||
      !databaseIds.teams
    ) {
      return res.status(400).json({
        message:
          "Tous les IDs de bases de données sont requis pour le test (users, clients, projects, trafic, teams)",
      });
    }

    const configData = {
      notionApiKey,
      databaseIds,
    };

    const testResult = await settingsService.testNotionConnection(configData);

    if (testResult.success) {
      res.status(200).json({
        message: testResult.message,
        success: true,
        details: testResult.details,
      });
    } else {
      res.status(400).json({
        message: testResult.message,
        success: false,
        details: testResult.details,
      });
    }
  } catch (error) {
    console.error("Error in testNotionConnection:", error);
    next(error);
  }
};

// Récupérer le statut de la configuration (DB vs ENV)
const getConfigStatus = async (req, res, next) => {
  try {
    const status = await settingsService.getConfigStatus();

    res.status(200).json({
      message: "Statut de configuration récupéré",
      status,
    });
  } catch (error) {
    console.error("Error in getConfigStatus:", error);
    next(error);
  }
};

// Récupérer toutes les configurations Notion
const getAllNotionConfigs = async (req, res, next) => {
  try {
    const configs = await NotionConfig.find({}).sort({ updatedAt: -1 });

    res.status(200).json({
      message: "Configurations récupérées avec succès",
      configs: configs.map((config) => ({
        _id: config._id,
        name: config.name,
        databaseIds: config.databaseIds,
        isActive: config.isActive,
        createdBy: config.createdBy,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error in getAllNotionConfigs:", error);
    next(error);
  }
};

// Créer une nouvelle configuration Notion
const createNotionConfig = async (req, res, next) => {
  try {
    const { name, notionApiKey, databaseIds } = req.body;
    const userId = req.user._id;

    // Validation des données
    if (!name || !notionApiKey || !databaseIds) {
      return res.status(400).json({
        message: "Nom, clé API et IDs de bases de données requis",
      });
    }

    if (
      !databaseIds.users ||
      !databaseIds.clients ||
      !databaseIds.projects ||
      !databaseIds.trafic ||
      !databaseIds.teams
    ) {
      return res.status(400).json({
        message:
          "Tous les IDs de bases de données sont requis (users, clients, projects, trafic, teams)",
      });
    }

    const newConfig = new NotionConfig({
      name,
      notionApiKey,
      databaseIds,
      createdBy: userId,
      isActive: false, // Par défaut, pas active
    });

    const savedConfig = await newConfig.save();

    res.status(201).json({
      message: "Configuration créée avec succès",
      config: {
        _id: savedConfig._id,
        name: savedConfig.name,
        isActive: savedConfig.isActive,
        createdAt: savedConfig.createdAt,
      },
    });
  } catch (error) {
    console.error("Error in createNotionConfig:", error);
    next(error);
  }
};

// Mettre à jour une configuration Notion par ID
const updateNotionConfigById = async (req, res, next) => {
  try {
    const { configId } = req.params;
    const { name, notionApiKey, databaseIds } = req.body;
    const userId = req.user._id;

    // Validation des données
    if (!name || !notionApiKey || !databaseIds) {
      return res.status(400).json({
        message: "Nom, clé API et IDs de bases de données requis",
      });
    }

    if (
      !databaseIds.users ||
      !databaseIds.clients ||
      !databaseIds.projects ||
      !databaseIds.trafic ||
      !databaseIds.teams
    ) {
      return res.status(400).json({
        message:
          "Tous les IDs de bases de données sont requis (users, clients, projects, trafic, teams)",
      });
    }

    const updatedConfig = await NotionConfig.findByIdAndUpdate(
      configId,
      {
        name,
        notionApiKey,
        databaseIds,
      },
      { new: true }
    );

    if (!updatedConfig) {
      return res.status(404).json({
        message: "Configuration non trouvée",
      });
    }

    res.status(200).json({
      message: "Configuration mise à jour avec succès",
      config: {
        _id: updatedConfig._id,
        name: updatedConfig.name,
        isActive: updatedConfig.isActive,
        updatedAt: updatedConfig.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error in updateNotionConfigById:", error);
    next(error);
  }
};

// Activer une configuration Notion
const activateNotionConfig = async (req, res, next) => {
  try {
    const { configId } = req.params;

    // Désactiver toutes les autres configurations
    await NotionConfig.updateMany({}, { isActive: false });

    // Activer la configuration sélectionnée
    const activatedConfig = await NotionConfig.findByIdAndUpdate(
      configId,
      { isActive: true },
      { new: true }
    );

    if (!activatedConfig) {
      return res.status(404).json({
        message: "Configuration non trouvée",
      });
    }

    // Forcer la réinitialisation de la configuration Notion
    console.log("🔄 Forcing Notion config reset after activation...");
    notionService.resetConfig();

    res.status(200).json({
      message: "Configuration activée avec succès",
      config: {
        _id: activatedConfig._id,
        name: activatedConfig.name,
        isActive: activatedConfig.isActive,
      },
    });
  } catch (error) {
    console.error("Error in activateNotionConfig:", error);
    next(error);
  }
};

// Réinitialiser la configuration Notion (forcer le rechargement)
const resetNotionConfig = async (req, res, next) => {
  try {
    console.log("🔄 Manual Notion config reset requested...");

    // Forcer la réinitialisation
    notionService.resetConfig();

    // Réinitialiser immédiatement avec la nouvelle config
    await notionService.initializeConfig();

    res.status(200).json({
      message: "Configuration Notion réinitialisée avec succès",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in resetNotionConfig:", error);
    res.status(500).json({
      message: "Erreur lors de la réinitialisation de la configuration",
      error: error.message,
    });
  }
};

// Supprimer une configuration Notion
const deleteNotionConfig = async (req, res, next) => {
  try {
    const { configId } = req.params;

    const deletedConfig = await NotionConfig.findByIdAndDelete(configId);

    if (!deletedConfig) {
      return res.status(404).json({
        message: "Configuration non trouvée",
      });
    }

    res.status(200).json({
      message: "Configuration supprimée avec succès",
    });
  } catch (error) {
    console.error("Error in deleteNotionConfig:", error);
    next(error);
  }
};

module.exports = {
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
};
