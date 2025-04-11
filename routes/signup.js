const pool = require("../db");
const express = require("express");
const bcrypt = require("bcryptjs"); // Fixed import
const signupauth = express.Router();

signupauth.post("/signup", async (req, res) => {
  res.json({ welcome: "wesignup" });
  const { name, email, password, confirmpassword } = req.body;
  // console.log(req.body);
  const role = "seeker";

  // const [name, email, password, role] = [
  //   "Olusegun stephen",
  //   "stephenolusegun478@gmail.com",
  //   "Olusegunstephen01",
  //   "jobseeker",
  // ];

  try {
    const checkuser = await pool.query("SELECT * FROM users WHERE email= $1", [
      email,
    ]);
    if (checkuser.rowCount > 0) {
      // console.log("already exits");
      return res.status(400).json({ error: "User already exists" });
    } else {
      const hashedPassword = await bcrypt.hash(confirmpassword, 10);
      const createUser = await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        [name, email, hashedPassword, role]
      );
      return res.status(200).json({ success: "created" });
    }
  } catch (error) {
    // console.error("Error Signning Up", error);
    res.status(500).send("Server Error");
  }
});

module.exports = signupauth;
