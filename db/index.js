// ℹ️ package responsible to make the connection with mongodb
// https://www.npmjs.com/package/mongoose
const mongoose = require("mongoose");

const connectDB = async (uri) => {
  const dbName = process.env.APP_NAME;

  if (!dbName) {
    console.error(
      "❌ ERREUR : la variable APP_NAME est absente du fichier .env"
    );
    throw new Error("La variable d'environnement APP_NAME est obligatoire.");
  }

  try {
    const conn = await mongoose.connect(uri, { dbName });
    console.log(
      `✅ Connected to Mongo! Database name: "${conn.connections[0].name}"`
    );
  } catch (err) {
    console.error("❌ Error connecting to mongo:", err);
    throw err;
  }
};

module.exports = connectDB;
