const { Schema, model } = require("mongoose");

const notionConfigSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Configuration name is required."],
    },
    notionApiKey: {
      type: String,
      required: [true, "Notion API Key is required."],
    },
    databaseIds: {
      users: {
        type: String,
        required: [true, "Users database ID is required."],
      },
      clients: {
        type: String,
        required: [true, "Clients database ID is required."],
      },
      projects: {
        type: String,
        required: [true, "Projects database ID is required."],
      },
      trafic: {
        type: String,
        required: [true, "Trafic database ID is required."],
      },
      teams: {
        type: String,
        required: [true, "Teams database ID is required."],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one active configuration at a time
notionConfigSchema.pre("save", async function (next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

const NotionConfig = model("NotionConfig", notionConfigSchema);

module.exports = NotionConfig;
