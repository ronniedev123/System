const express = require("express");
const router = require("express").Router();
const { registerUser, loginUser, getUsers } = require("../controllers/authController");
const verifyToken = require("../middlewares/verifyToken");

// Use controller implementations for register and login
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected route to list users
router.get("/users", verifyToken, getUsers);

module.exports = router;
