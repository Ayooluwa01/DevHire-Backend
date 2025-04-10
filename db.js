require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase
  },
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL");
    client.release(); // Release the connection back to the pool
  } catch (err) {
    console.error("Connection error", err);
  }
};

// Connect when the server starts
connectDB();

module.exports = pool;
