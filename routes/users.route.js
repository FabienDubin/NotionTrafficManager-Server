const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  updateUserImage,
  deleteUser,
  searchUsers,
  importUsers,
  updateUser,
  changeUserPassword,
} = require("../controllers/user.controller");

const { profileImageUploader } = require("../middleware/azure.middleware");
const { isAuthenticated } = require("../middleware/jwt.middleware");
const { hasRole } = require("../middleware/role.middleware");

// GET /users/all
// Gets all users depending on a page number and a limit sort by name or email or role or createdAt or updatedAt
router.get("/all", getAllUsers);

// PUT /users/update/:id
// Updates a user by id with name, email, image and role
router.put("/update/:id", updateUser);

// PUT /users/update-image/:userId
// Change Profile Picture via Azure Blob Storage
router.put("/update-image/:userId", profileImageUploader, updateUserImage);

// DELETE /users/delete/:id
// Deletes a user by id
router.delete("/delete/:id", deleteUser);

// GET /users/search
// Searches for users by name, email or role
router.get("/search", searchUsers);

//POST /import
// import a list of user to the
router.post("/import", importUsers);

// PUT /users/change-password/:id
// Changes a user's password (admin only)
router.put(
  "/change-password/:id",
  isAuthenticated,
  hasRole(["admin"]),
  changeUserPassword
);

module.exports = router;
