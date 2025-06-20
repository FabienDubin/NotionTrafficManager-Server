const { Schema, model } = require("mongoose");

const clientColorsSchema = new Schema(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
    },
    clientName: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
      default: "#6366f1",
      validate: {
        validator: function (v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: "Color must be a valid hex color code",
      },
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

const ClientColors = model("ClientColors", clientColorsSchema);

module.exports = ClientColors;
