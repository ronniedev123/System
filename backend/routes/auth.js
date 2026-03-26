const express = require("express");
const router = require("express").Router();
const {
    registerUser,
    loginUser,
    getUsers,
    createUserByAdmin,
    approveUser,
    setUserBlocked,
    updateUser,
    deleteUser
} = require("../controllers/authController");
const verifyToken = require("../middlewares/verifyToken");

// Use controller implementations for register and login
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/admin/create-user", verifyToken, createUserByAdmin);
router.patch("/admin/users/:id/approve", verifyToken, approveUser);
router.patch("/admin/users/:id/block", verifyToken, setUserBlocked);
router.put("/admin/users/:id", verifyToken, updateUser);
router.delete("/admin/users/:id", verifyToken, deleteUser);

// Protected route to list users
router.get("/users", verifyToken, getUsers);

module.exports = router;
