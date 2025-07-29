// const { expressjwt: jwt } = require("express-jwt");

// // Instantiate the JWT token validation middleware
// const isAuthenticated = jwt({
//   secret: process.env.TOKEN_SECRET || "testsecret",
//   algorithms: ["HS256"],
//   requestProperty: "payload",
//   getToken: getTokenFromHeaders,
// });

// // Function used to extract the JWT token from the request's 'Authorization' Headers
// function getTokenFromHeaders(req) {
//   // Check if the token is available on the request Headers
//   if (
//     req.headers.authorization &&
//     req.headers.authorization.split(" ")[0] === "Bearer"
//   ) {
//     // Get the encoded token string and return it
//     const token = req.headers.authorization.split(" ")[1];
//     return token;
//   }

//   return null;
// }

// // Export the middleware so that we can use it to create protected routes
// module.exports = {
//   isAuthenticated,
// };

const { expressjwt: jwt } = require("express-jwt");
const User = require("../models/User.model");

// Fonction utilisée pour extraire le token depuis les headers
function getTokenFromHeaders(req) {
  if (
    req.headers.authorization &&
    req.headers.authorization.split(" ")[0] === "Bearer"
  ) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
}

// Middleware principal d'authentification
const isAuthenticated = [
  jwt({
    secret: process.env.TOKEN_SECRET || "testsecret",
    algorithms: ["HS256"],
    requestProperty: "payload", // On stocke le payload décodé ici
    getToken: getTokenFromHeaders,
  }),
  async (req, res, next) => {
    try {
      // Vérifier si l'ID utilisateur est valide
      if (!req.payload._id) {
        console.error("JWT middleware: No user ID in token payload");
        return res.status(401).json({ message: "Invalid token payload" });
      }

      const user = await User.findById(req.payload._id);
      if (!user) {
        console.error(`JWT middleware: User not found with ID: ${req.payload._id}`);
        return res.status(401).json({ message: "User not found" });
      }
      
      req.user = user; // nécessaire pour hasRole()
      next();
    } catch (error) {
      console.error("Error fetching user in isAuthenticated middleware:", error);
      
      // Si c'est une erreur de base de données MongoDB
      if (error.name === 'MongooseError' || error.name === 'MongoError') {
        console.error("Database connection error in JWT middleware");
        return res.status(503).json({ message: "Database connection error" });
      }
      
      // Si c'est une erreur de token JWT invalide 
      if (error.name === 'CastError') {
        console.error("Invalid user ID format in token");
        return res.status(401).json({ message: "Invalid token format" });
      }
      
      // Autres erreurs internes
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

module.exports = {
  isAuthenticated,
};
