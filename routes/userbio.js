const pool = require("../db");
const express = require("express");
const jwt = require("jsonwebtoken");
const userbio = express.Router();

const SECRET_KEY = "abcdefghijklmnopqrstuvwxyz"; // Use a strong secret key

userbio.post("/biodata", async (req, res) => {
  const {
    bio,
    skills,
    education,
    experience, // Ensure this is an array of objects
    number,
    address,
    email,
    language,
  } = req.body;

  try {
    // Check if user exists
    const checkUser = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );

    if (checkUser.rowCount === 0) {
      console.log("User does not exist");
      return res.status(404).json({ error: "User does not exist" });
    }

    const user = checkUser.rows[0];

    // Ensure `experience` is properly formatted before storing
    const experienceString = Array.isArray(experience)
      ? JSON.stringify(experience) // Convert array of objects to string
      : "[]"; // Default to an empty array

    // Formating Education array before storing in dv
    const EducationString = Array.isArray(education)
      ? JSON.stringify(education) // Convert array of objects to string
      : "[]";

    // Check if biodata already exists
    const ifUserBioExists = await pool.query(
      "SELECT * FROM user_bio WHERE user_id = $1",
      [user.user_id]
    );

    if (ifUserBioExists.rowCount > 0) {
      // Update existing biodata
      await pool.query(
        `UPDATE user_bio 
         SET bio = $1, skills = $2, education = $3, experience = $4, language = $5, number = $6, address = $7
         WHERE user_id = $8`,
        [
          bio,
          skills,
          EducationString,
          experienceString, // Store as JSON string
          language,
          number,
          address,
          user.user_id,
        ]
      );
    } else {
      // Insert new biodata
      await pool.query(
        `INSERT INTO user_bio (user_id, bio, skills, education, experience, language, number, address) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.user_id,
          bio,
          skills,
          education,
          experienceString, // Store as JSON string
          language,
          number,
          address,
        ]
      );
    }

    // Fetch the updated biodata
    const updatedBiodata = await pool.query(
      "SELECT * FROM user_bio WHERE user_id = $1",
      [user.user_id]
    );
    const userBio = updatedBiodata.rows[0];

    // Parse experience before returning
    userBio.experience = JSON.parse(userBio.experience || "[]");
    console.log(userBio.experience);
    // Generate JWT token with biodata
    const token = jwt.sign(userBio, SECRET_KEY, {
      expiresIn: "1h", // Set expiration as needed
    });

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Error during biodata update/insert:", error);
    res.status(500).send("Server Error");
  }
});

module.exports = userbio;
