const settingsService = require("../services/settings.service");

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
    const { notionApiKey, databaseIds } = req.body;

    // Validation des données
    if (!notionApiKey || !databaseIds) {
      return res.status(400).json({
        message: "Clé API et IDs de bases de données requis pour le test",
      });
    }

    if (
      !databaseIds.users ||
      !databaseIds.clients ||
      !databaseIds.projects ||
      !databaseIds.trafic
    ) {
      return res.status(400).json({
        message: "Tous les IDs de bases de données sont requis pour le test",
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

module.exports = {
  getNotionConfig,
  saveNotionConfig,
  updateNotionConfig,
  testNotionConnection,
  getConfigStatus,
};
