const pool = require("../db");
const express = require("express");

const jobRoutes = (io) => {
  const router = express.Router();

  // Define the route to get job listings
  router.get("/Joblistings", async (req, res) => {
    try {
      const joblistings = await pool.query("SELECT * FROM jobs");
      res.json(joblistings.rows);

      // Emit job listings update to all connected clients
      // io.emit("joblistings", joblistings.rows);
    } catch (error) {
      // console.error("Error fetching job listings:", error);
      res.status(500).send("Server Error");
    }
  });

  return router;
};

module.exports = jobRoutes;
