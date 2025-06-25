const BugReport = require("../models/BugReport.model");
const emailService = require("../services/email.service");

/**
 * Crée un nouveau bug report
 */
const createBugReport = async (req, res) => {
  try {
    const { title, description, screenshots, priority, currentUrl, userAgent } =
      req.body;
    const user = req.payload; // Utilisateur authentifié depuis le middleware JWT

    // Validation des données requises
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Le titre et la description sont requis",
      });
    }

    // Création du bug report
    const bugReport = new BugReport({
      title: title.trim(),
      description: description.trim(),
      screenshots: screenshots || [],
      priority: priority || "medium",
      userInfo: {
        userId: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userAgent: userAgent || "",
        currentUrl: currentUrl || "",
      },
    });

    // Sauvegarde en base
    const savedBugReport = await bugReport.save();

    // Envoi de l'email de notification à l'admin
    try {
      const adminEmail =
        process.env.BUG_REPORT_ADMIN_EMAIL || process.env.MAILJET_SENDER;
      await emailService.sendBugReportNotification(savedBugReport, adminEmail);
      console.log("Email de notification envoyé avec succès");
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email:", emailError);
      // On continue même si l'email échoue
    }

    res.status(201).json({
      success: true,
      message: "Bug report créé avec succès",
      data: savedBugReport,
    });
  } catch (error) {
    console.error("Erreur lors de la création du bug report:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Récupère tous les bug reports (admin uniquement)
 */
const getAllBugReports = async (req, res) => {
  try {
    const {
      status,
      priority,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Construction du filtre
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Calcul de la pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Récupération des données avec pagination
    const [bugReports, totalCount] = await Promise.all([
      BugReport.find(filter)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limitNum)
        .populate("userInfo.userId", "firstName lastName email")
        .populate("assignedTo", "firstName lastName email"),
      BugReport.countDocuments(filter),
    ]);

    // Calcul des métadonnées de pagination
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      data: bugReports,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount,
        hasNextPage,
        hasPrevPage,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des bug reports:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Récupère un bug report par ID
 */
const getBugReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const bugReport = await BugReport.findById(id)
      .populate("userInfo.userId", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email");

    if (!bugReport) {
      return res.status(404).json({
        success: false,
        message: "Bug report non trouvé",
      });
    }

    res.json({
      success: true,
      data: bugReport,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du bug report:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Met à jour un bug report (admin uniquement)
 */
const updateBugReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, adminNotes, assignedTo } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;

    const bugReport = await BugReport.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("userInfo.userId", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email");

    if (!bugReport) {
      return res.status(404).json({
        success: false,
        message: "Bug report non trouvé",
      });
    }

    res.json({
      success: true,
      message: "Bug report mis à jour avec succès",
      data: bugReport,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du bug report:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Supprime un bug report (admin uniquement)
 */
const deleteBugReport = async (req, res) => {
  try {
    const { id } = req.params;

    const bugReport = await BugReport.findByIdAndDelete(id);

    if (!bugReport) {
      return res.status(404).json({
        success: false,
        message: "Bug report non trouvé",
      });
    }

    res.json({
      success: true,
      message: "Bug report supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du bug report:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Récupère les statistiques des bug reports (admin uniquement)
 */
const getBugReportStats = async (req, res) => {
  try {
    // Vérifier d'abord si la collection existe et contient des documents
    const totalBugReports = await BugReport.countDocuments();

    if (totalBugReports === 0) {
      // Retourner des statistiques vides si aucun bug report
      return res.json({
        success: true,
        data: {
          total: 0,
          recent: 0,
          byStatus: {},
          byPriority: {},
        },
      });
    }

    // Exécuter les agrégations seulement s'il y a des documents
    const [stats, priorityStats, recentBugReports] = await Promise.all([
      BugReport.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      BugReport.aggregate([
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
      ]),
      BugReport.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 derniers jours
      }),
    ]);

    res.json({
      success: true,
      data: {
        total: totalBugReports,
        recent: recentBugReports,
        byStatus: stats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byPriority: priorityStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Récupère les bug reports de l'utilisateur connecté
 */
const getMyBugReports = async (req, res) => {
  try {
    const user = req.payload;
    const { page = 1, limit = 10, status } = req.query;

    const filter = { "userInfo.userId": user._id };
    if (status) filter.status = status;

    // Calcul de la pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Récupération des données avec pagination
    const [bugReports, totalCount] = await Promise.all([
      BugReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      BugReport.countDocuments(filter),
    ]);

    // Calcul des métadonnées de pagination
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      data: bugReports,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount,
        hasNextPage,
        hasPrevPage,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des bug reports utilisateur:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  createBugReport,
  getAllBugReports,
  getBugReportById,
  updateBugReport,
  deleteBugReport,
  getBugReportStats,
  getMyBugReports,
};
