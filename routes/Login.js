const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const loginauth = express.Router();

loginauth.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = null;
    let role = null;

    // Check if the user exists in the users table (Job Seekers)
    const jobSeekerQuery = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (jobSeekerQuery.rowCount > 0) {
      user = jobSeekerQuery.rows[0];
      role = "jobseeker";
    } else {
      // Check if the user exists in the employers table
      const employerQuery = await pool.query(
        "SELECT * FROM employers WHERE email = $1",
        [email]
      );

      if (employerQuery.rowCount > 0) {
        user = employerQuery.rows[0];
        role = "employer";
      }
    }

    // If user does not exist in either table
    if (!user) {
      return res.status(404).json({ error: "User does not exist" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Tokens
    const tokenPayload = {
      user_id: user.user_id || user.employer_id, // Handle different ID names
      email: user.email,
      name: user.name,
      role,
    };

    const token = jwt.sign(tokenPayload, "abcdefghijklmnopqrstuvwxyz", {
      expiresIn: "1h", // Set expiration as needed
    });

    res.cookie("role", role, {
      httpOnly: false, // so frontend can read
      secure: true, // required when using sameSite: 'none'
      sameSite: "None", // allow cross-site cookies
    });

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Server Error");
  }
});

module.exports = loginauth;
