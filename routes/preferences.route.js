const express = require("express");
const router = express.Router();
const UserPreferences = require("../models/UserPreferences.model");
const ClientColors = require("../models/ClientColors.model");
const { isAuthenticated } = require("../middleware/jwt.middleware");

// Middleware d'authentification pour toutes les routes
// router.use(isAuthenticated);

// GET /api/preferences/client-colors - Récupère toutes les couleurs des clients
router.get("/client-colors", async (req, res, next) => {
  try {
    const clientColors = await ClientColors.find().sort({ clientName: 1 });
    res.json(clientColors);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des couleurs clients:",
      error
    );
    res.status(500).json({
      message: "Erreur lors de la récupération des couleurs clients",
      error: error.message,
    });
  }
});

// PATCH /api/preferences/client-colors - Met à jour les couleurs des clients
router.patch("/client-colors", async (req, res, next) => {
  try {
    const { clientColors } = req.body;

    if (!Array.isArray(clientColors)) {
      return res.status(400).json({
        message: "Un tableau de couleurs clients est requis",
      });
    }

    // Met à jour ou crée chaque couleur client
    const updatePromises = clientColors.map(
      async ({ clientId, clientName, color }) => {
        return await ClientColors.findOneAndUpdate(
          { clientId },
          { clientId, clientName, color },
          { new: true, upsert: true }
        );
      }
    );

    const updatedColors = await Promise.all(updatePromises);
    res.json(updatedColors);
  } catch (error) {
    console.error("Erreur lors de la mise à jour des couleurs clients:", error);
    res.status(500).json({
      message: "Erreur lors de la mise à jour des couleurs clients",
      error: error.message,
    });
  }
});

// POST /api/preferences/client-colors/generate - Génère des couleurs aléatoires pour les nouveaux clients
router.post("/client-colors/generate", async (req, res, next) => {
  try {
    const { clients } = req.body;

    if (!Array.isArray(clients)) {
      return res.status(400).json({
        message: "Un tableau de clients est requis",
      });
    }

    // Couleurs prédéfinies
    const predefinedColors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#F39C12",
      "#E74C3C",
      "#9B59B6",
      "#3498DB",
      "#2ECC71",
      "#F1C40F",
      "#E67E22",
      "#1ABC9C",
      "#34495E",
      "#FF7675",
      "#74B9FF",
      "#00B894",
      "#FDCB6E",
      "#6C5CE7",
    ];

    const generatedColors = [];

    for (const client of clients) {
      // Vérifier si le client a déjà une couleur
      const existingColor = await ClientColors.findOne({ clientId: client.id });

      if (!existingColor) {
        // Générer une couleur aléatoire
        const randomColor =
          predefinedColors[Math.floor(Math.random() * predefinedColors.length)];

        const newClientColor = new ClientColors({
          clientId: client.id,
          clientName: client.name,
          color: randomColor,
        });

        await newClientColor.save();
        generatedColors.push(newClientColor);
      }
    }

    res.json({
      message: `${generatedColors.length} nouvelles couleurs générées`,
      colors: generatedColors,
    });
  } catch (error) {
    console.error("Erreur lors de la génération des couleurs:", error);
    res.status(500).json({
      message: "Erreur lors de la génération des couleurs",
      error: error.message,
    });
  }
});

// GET /api/preferences/:userId - Récupère les préférences d'un utilisateur
router.get("/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;

    let preferences = await UserPreferences.findOne({ userId });

    // Si aucune préférence n'existe, créer avec les valeurs par défaut
    if (!preferences) {
      preferences = new UserPreferences({
        userId,
        visibleTaskProperties: {
          showProjects: false,
          showClient: false,
          showEtat: false,
        },
      });
      await preferences.save();
    }

    res.json(preferences);
  } catch (error) {
    console.error("Erreur lors de la récupération des préférences:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des préférences",
      error: error.message,
    });
  }
});

// PATCH /api/preferences/:userId - Met à jour les préférences d'un utilisateur
router.patch("/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { visibleTaskProperties } = req.body;

    if (!visibleTaskProperties) {
      return res.status(400).json({
        message: "Les propriétés visibles sont requises",
      });
    }

    const preferences = await UserPreferences.findOneAndUpdate(
      { userId },
      { visibleTaskProperties },
      { new: true, upsert: true }
    );

    res.json(preferences);
  } catch (error) {
    console.error("Erreur lors de la mise à jour des préférences:", error);
    res.status(500).json({
      message: "Erreur lors de la mise à jour des préférences",
      error: error.message,
    });
  }
});

module.exports = router;
