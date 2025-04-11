const pool = require("../db");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logout = express.Router();

logout.post("/logout", (req, res) => {
  res.cookie("role", "", {
    // httpOnly: true,

    expires: new Date(0), // ✅ Expire the cookie immediately
  });

  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = logout;
