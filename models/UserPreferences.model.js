const { Schema, model } = require("mongoose");

const userPreferencesSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    visibleProperties: {
      type: [String],
      default: ["name", "client", "status", "assignee"],
      enum: [
        "name",
        "client",
        "status",
        "assignee",
        "project",
        "dueDate",
        "priority",
        "tags",
      ],
    },
    defaultView: {
      type: String,
      enum: ["timeGridWeek", "dayGridMonth"],
      default: "timeGridWeek",
    },
    filterPreferences: {
      selectedCreatives: [String],
      selectedClients: [String],
      selectedProjects: [String],
      showCompleted: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

const UserPreferences = model("UserPreferences", userPreferencesSchema);

module.exports = UserPreferences;
