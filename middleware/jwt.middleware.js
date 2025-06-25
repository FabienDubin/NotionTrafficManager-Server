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
      const user = await User.findById(req.payload._id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      req.user = user; // nécessaire pour hasRole()
      next();
    } catch (error) {
      console.error(
        "Error fetching user in isAuthenticated middleware:",
        error
      );
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

module.exports = {
  isAuthenticated,
};
