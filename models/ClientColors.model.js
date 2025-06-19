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
      match: /^#[0-9A-F]{6}$/i, // Validation format hex
    },
  },
  {
    timestamps: true,
  }
);

const ClientColors = model("ClientColors", clientColorsSchema);

module.exports = ClientColors;
