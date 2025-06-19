const { Schema, model } = require("mongoose");

const userPreferencesSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    visibleTaskProperties: {
      showProjects: {
        type: Boolean,
        default: false,
      },
      showClient: {
        type: Boolean,
        default: false,
      },
      showEtat: {
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
