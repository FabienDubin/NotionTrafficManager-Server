// We reuse this import in order to have access to the `body` property in requests
const express = require("express");

// ℹ️ Responsible for the messages you see in the terminal as requests are coming in
// https://www.npmjs.com/package/morgan
const logger = require("morgan");

// ℹ️ Needed when we deal with cookies (we will when dealing with authentication)
// https://www.npmjs.com/package/cookie-parser
const cookieParser = require("cookie-parser");

// ℹ️ Needed to accept requests from 'the outside'. CORS stands for cross origin resource sharing
// unless the request is made from the same domain, by default express wont accept POST requests
const cors = require("cors");

const allowedOrigins = (process.env.ORIGIN || "").split(",").filter(Boolean);

// Ajouter les origines de développement par défaut
const defaultDevOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const allAllowedOrigins = [...allowedOrigins, ...defaultDevOrigins];

// Middleware configuration
module.exports = (app) => {
  // Because this will be hosted on a server that will accept requests from outside and it will be hosted ona server with a `proxy`, express needs to know that it should trust that setting.
  // Services like Fly use something called a proxy and you need to add this to your server
  app.set("trust proxy", 1);

  // controls a very specific header to pass headers from the frontend
  app.use(
    cors({
      origin: (origin, callback) => {
        // Permettre les requêtes sans origine (ex: Postman, curl)
        if (!origin) {
          callback(null, true);
          return;
        }

        // Vérifier si l'origine est autorisée
        if (allAllowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.log(`❌ CORS blocked origin: ${origin}`);
          console.log(`✅ Allowed origins:`, allAllowedOrigins);
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    })
  );

  // In development environment the app logs
  app.use(logger("dev"));

  // To have access to `body` property in the request
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
};
