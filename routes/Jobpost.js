const pool = require("../db");
const express = require("express");
const bcrypt = require("bcryptjs"); // Fixed import
const Jobposting = express.Router();

Jobposting.post("/Jobpost", async (req, res) => {
  // console.log(req.body);
  const {
    title,
    company,
    location,
    type,
    work_mode,
    job_function,
    salary,
    description,
    level,
    requirements,
    benefits,
    qualifications,
    experience,
    application_deadline,
    imglinK,
  } = req.body;

  //   try {
  //     const checkemployer = await pool.query(
  //       "SELECT * FROM Employers WHERE email= $1",
  //       [email]
  //     );
  //     if (checkemployer.rowCount > 0) {
  //       return res.status(201).json({ error: "User already exists" });
  //     } else {
  //       const hashedPassword = await bcrypt.hash(confirmpassword, 10);
  //       const role = "employer";
  //       const createEmployer = await pool.query(
  //         "INSERT INTO Employers (name, phone_number, email, company_name, location, website,password ,role) VALUES ($1, $2, $3, $4,$5,$6,$7,$8)",
  //         [
  //           name,
  //           phone,
  //           email,
  //           companyname,
  //           location,
  //           website,
  //           hashedPassword,
  //           role,
  //         ]
  //       );
  //       return res.status(200).json({ success: "created" });
  //     }
  //   } catch (error) {
  //     console.error("Error Signning Up", error);
  //     res.status(500).send("Server Error");
  //   }
});

module.exports = Jobposting;
