require("dotenv").config();
const { Pool } = require("pg");

// Set up the pool with the DATABASE_URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase to allow secure connections
  },
});

// Function to connect to the database and perform a simple query
const connectDB = async () => {
  try {
    const client = await pool.connect(); // Get a client from the pool
    console.log("Connected to PostgreSQL");

    // Perform a simple query to test the connection

    // Release the client back to the pool
    client.release();
  } catch (err) {
    console.error("Connection error", err); // Log the error if connection fails
  }
};

// Connect when the server starts
connectDB();

// Export the pool for use in other parts of your application
module.exports = pool;
