// const pool = require("../db");
// const express = require("express");
// const authroute = express.Router();
// const jwt = require("jsonwebtoken");

// authroute.post("/auth", async (req, res) => {
//   const { email, name } = req.body;
//   try {
//     const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", [
//       email,
//     ]);

//     if (checkUser.rowCount > 0) {
//       const user = checkUser.rows[0];

//       res.cookie("role", user.role, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "Lax",
//       });
//       const tokenPayload = {
//         user_id: user.user_id, // Handle different ID names
//         email: user.email,
//         name: user.name,
//         role: "jobseeker",
//       };

//       const token = jwt.sign(tokenPayload, "abcdefghijklmnopqrstuvwxyz", {
//         expiresIn: "1h", // Set expiration as needed
//       });
//       return res.status(200).json({ token });
//     } else {
//       const newUser = await pool.query(
//         "INSERT INTO users (name, email, role) VALUES ($1, $2, $3)",
//         [name, email, "seeker"]
//       );

//       if (newUser.rowCount > 0) {
//         const user = newUser.rows[0];

//         res.cookie("role", user.role, {
//           httpOnly: true,
//           secure: process.env.NODE_ENV === "production",
//           sameSite: "Lax",
//         });
//         const tokenPayload = {
//           user_id: user.user_id, // Handle different ID names
//           email: user.email,
//           name: user.name,
//           role: "jobseeker",
//         };

//         const token = jwt.sign(tokenPayload, "abcdefghijklmnopqrstuvwxyz", {
//           expiresIn: "1h", // Set expiration as needed
//         });

//         return res.status(200).json({
//           token,
//         });
//       }
//     }
//   } catch (error) {
//     // console.error("Error during authentication:", error);
//     return res.status(500).json({ error: "Server Error" });
//   }
// });

// module.exports = authroute;

const pool = require("../db");
const express = require("express");
const authroute = express.Router();
const jwt = require("jsonwebtoken");

authroute.post("/auth", async (req, res) => {
  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: "Email and name are required." });
  }

  try {
    const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    console.log("selecting dfrom user:", email, name);
    let user;

    if (checkUser.rowCount > 0) {
      user = checkUser.rows[0];
      console.log("user exits", user);
    } else {
      const newUser = await pool.query(
        "INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING *",
        [name, email, "seeker"]
      );
      console.log("creatig new user");

      if (newUser.rowCount === 0) {
        return res.status(500).json({ error: "User creation failed" });
      }

      user = newUser.rows[0];
      console.log("NEw user", user);
    }

    res.cookie("role", "jobseeker", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
    });

    const tokenPayload = {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      role: "jobseeker",
    };

    const token = jwt.sign(tokenPayload, "abcdefghijklmnopqrstuvwxyz", {
      expiresIn: "1h",
    });

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Error during authentication:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

module.exports = authroute;
