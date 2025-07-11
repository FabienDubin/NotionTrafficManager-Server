//This middleware handles acces depending on the defined roles.
//the variable roles is an array of strings that represent the required roles for access.
const hasRole = (roles) => {
  return (req, res, next) => {
    // Utiliser req.payload qui est défini par notre middleware JWT
    const user = req.payload || req.user;
    if (user && roles.includes(user.role)) {
      return next();
    }
    return res.status(401).json({ message: "🧙You shall not pass!" });
  };
};

//Export the middleware so that we can use it in our routes.
module.exports = { hasRole };
