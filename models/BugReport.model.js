const { Schema, model } = require("mongoose");

const bugReportSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Le titre du bug est requis."],
      trim: true,
      maxlength: [200, "Le titre ne peut pas dépasser 200 caractères."],
    },
    description: {
      type: String,
      required: [true, "La description du bug est requise."],
      trim: true,
      maxlength: [2000, "La description ne peut pas dépasser 2000 caractères."],
    },
    screenshots: [
      {
        type: [String], // URLs Azure Blob Storage
      },
    ],
    userInfo: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      userAgent: {
        type: String,
        default: "",
      },
      currentUrl: {
        type: String,
        default: "",
      },
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    adminNotes: {
      type: String,
      default: "",
      maxlength: [
        1000,
        "Les notes admin ne peuvent pas dépasser 1000 caractères.",
      ],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index pour améliorer les performances des requêtes
bugReportSchema.index({ status: 1, createdAt: -1 });
bugReportSchema.index({ "userInfo.userId": 1 });

// Méthode virtuelle pour obtenir le nom complet du statut
bugReportSchema.virtual("statusLabel").get(function () {
  const statusLabels = {
    open: "Ouvert",
    "in-progress": "En cours",
    resolved: "Résolu",
    closed: "Fermé",
  };
  return statusLabels[this.status] || this.status;
});

// Méthode virtuelle pour obtenir le label de priorité
bugReportSchema.virtual("priorityLabel").get(function () {
  const priorityLabels = {
    low: "Faible",
    medium: "Moyenne",
    high: "Élevée",
    critical: "Critique",
  };
  return priorityLabels[this.priority] || this.priority;
});

// Inclure les virtuels dans la sérialisation JSON
bugReportSchema.set("toJSON", { virtuals: true });
bugReportSchema.set("toObject", { virtuals: true });

const BugReport = model("BugReport", bugReportSchema);

module.exports = BugReport;
