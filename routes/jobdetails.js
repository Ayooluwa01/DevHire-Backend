const pool = require("../db");
const express = require("express");

const details = express.Router();
details.get("/Joblistings/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const jobdetails = await pool.query("SELECT * FROM jobs WHERE id= $1", [
      id,
    ]);
    res.json(jobdetails.rows[0]);
  } catch (error) {
    // console.error("Error fetching job listings:", error);
    res.status(500).send("Server Error");
  }
  // try {
  //     const job = await pool.query("SELECT * FROM job_listings WHERE id = $1", [id]);

  //     if (job.rows.length === 0) {
  //         return res.status(404).json({ message: "Job not found" });
  //     }

  //     res.json(job.rows[0]);
  // } catch (err) {
  //     console.error(err.message);
  //     res.status(500).json({ error: "Server error" });
  // }
});

module.exports = details;
