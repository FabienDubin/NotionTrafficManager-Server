const NotionConfig = require("../models/NotionConfig.model");
const { Client } = require("@notionhq/client");

class SettingsService {
  // Récupérer la configuration active (DB en priorité, puis .env)
  async getActiveNotionConfig() {
    try {
      // Chercher une configuration active en DB
      const dbConfig = await NotionConfig.findOne({ isActive: true });

      if (dbConfig) {
        return {
          source: "database",
          config: {
            notionApiKey: dbConfig.notionApiKey,
            databaseIds: dbConfig.databaseIds,
          },
        };
      }

      // Fallback vers les variables d'environnement
      const envConfig = {
        notionApiKey: process.env.NOTION_API_KEY,
        databaseIds: {
          users: process.env.NOTION_DATABASE_USERS_ID,
          clients: process.env.NOTION_DATABASE_CLIENTS_ID,
          projects: process.env.NOTION_DATABASE_PROJECTS_ID,
          trafic: process.env.NOTION_DATABASE_TRAFIC_ID,
        },
      };

      // Vérifier que toutes les variables d'environnement sont présentes
      if (
        !envConfig.notionApiKey ||
        !envConfig.databaseIds.users ||
        !envConfig.databaseIds.clients ||
        !envConfig.databaseIds.projects ||
        !envConfig.databaseIds.trafic
      ) {
        throw new Error("Configuration Notion incomplète");
      }

      return {
        source: "environment",
        config: envConfig,
      };
    } catch (error) {
      console.error("Error getting Notion config:", error);
      throw error;
    }
  }

  // Récupérer la configuration stockée en DB (pour l'interface)
  async getStoredNotionConfig() {
    try {
      const config = await NotionConfig.findOne({ isActive: true }).populate(
        "createdBy",
        "firstName lastName email"
      );
      return config;
    } catch (error) {
      console.error("Error getting stored Notion config:", error);
      throw error;
    }
  }

  // Sauvegarder une nouvelle configuration
  async saveNotionConfig(configData, userId) {
    try {
      const newConfig = new NotionConfig({
        ...configData,
        createdBy: userId,
        isActive: true,
      });

      await newConfig.save();
      return newConfig;
    } catch (error) {
      console.error("Error saving Notion config:", error);
      throw error;
    }
  }

  // Mettre à jour la configuration existante
  async updateNotionConfig(configData, userId) {
    try {
      let config = await NotionConfig.findOne({ isActive: true });

      if (!config) {
        // Si pas de config existante, en créer une nouvelle
        return await this.saveNotionConfig(configData, userId);
      }

      // Mettre à jour la configuration existante
      config.notionApiKey = configData.notionApiKey;
      config.databaseIds = configData.databaseIds;
      config.createdBy = userId;

      await config.save();
      return config;
    } catch (error) {
      console.error("Error updating Notion config:", error);
      throw error;
    }
  }

  // Tester la connexion Notion
  async testNotionConnection(configData) {
    try {
      const notion = new Client({
        auth: configData.notionApiKey,
      });

      // Tester chaque base de données
      const testResults = {
        apiKey: false,
        databases: {
          users: false,
          clients: false,
          projects: false,
          trafic: false,
        },
      };

      // Test de l'API Key en récupérant les infos utilisateur
      try {
        await notion.users.me();
        testResults.apiKey = true;
      } catch (error) {
        console.error("API Key test failed:", error.message);
        return {
          success: false,
          message: "Clé API Notion invalide",
          details: testResults,
        };
      }

      // Test de chaque base de données
      for (const [dbName, dbId] of Object.entries(configData.databaseIds)) {
        try {
          await notion.databases.retrieve({ database_id: dbId });
          testResults.databases[dbName] = true;
        } catch (error) {
          console.error(`Database ${dbName} test failed:`, error.message);
          return {
            success: false,
            message: `Base de données ${dbName} inaccessible`,
            details: testResults,
          };
        }
      }

      return {
        success: true,
        message: "Connexion Notion réussie",
        details: testResults,
      };
    } catch (error) {
      console.error("Error testing Notion connection:", error);
      return {
        success: false,
        message: "Erreur lors du test de connexion",
        details: { error: error.message },
      };
    }
  }

  // Vérifier le statut de la configuration (DB vs ENV)
  async getConfigStatus() {
    try {
      const activeConfig = await this.getActiveNotionConfig();
      return {
        source: activeConfig.source,
        usingFallback: activeConfig.source === "environment",
      };
    } catch (error) {
      return {
        source: "none",
        usingFallback: false,
        error: error.message,
      };
    }
  }
}

module.exports = new SettingsService();
