const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db");
const { createServer } = require("http");
const { Server } = require("socket.io");

// ngrok http --url=allegedly-related-jay.ngrok-free.app 80
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://192.168.122.198:3000",
      "https://allegedly-related-jay.ngrok-free.app ",
    ],
    credentials: true,
  },
});

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://192.168.122.198:3000",
      "  https://allegedly-related-jay.ngrok-free.app ",
    ],
    credentials: true,
  })
);

// Pass `io` to routes
const jobRoutes = require("./routes/Jobs")(io);
const jobdetails = require("./routes/jobdetails");
const Login = require("./routes/Login");
const Auth = require("./routes/authroute");
const userbio = require("./routes/userbio");
const Signup = require("./routes/signup");
const logout = require("./routes/logout");
const Employersignup = require("./routes/EmployersSignup");
const Jobpost = require("./routes/Jobpost");
app.use("", Signup);
app.use("", jobRoutes);
app.use("", jobdetails);
app.use("", Login);
app.use("", Auth);
app.use("", userbio);
app.use("", logout);
app.use("", Employersignup);
app.use("", Jobpost);
const employerSockets = {}; // Global map to store employer socket IDs

io.on("connection", (socket) => {
  // 🔹 Fetch all jobs
  socket.on("employerConnect", (employerId) => {
    employerSockets[employerId] = socket.id;
  });

  // Fetching all jobs from database
  socket.on("alljobs", async () => {
    try {
      const joblistings = await pool.query("SELECT * FROM jobs ");
      if (joblistings.rowCount > 0) {
        socket.emit("all jobs", joblistings.rows);
      } else {
        socket.emit("no jobs available");
      }
    } catch (error) {
      socket.emit("error", "Failed to fetch jobs");
    }
  });

  // Getting userprofile

  socket.on("Getprofile", async (id) => {
    try {
      const getprofile = await pool.query(
        `SELECT * 
        FROM users 
        LEFT JOIN user_bio ON users.user_id = user_bio.user_id 
        WHERE users.user_id = $1`,
        [id]
      );

      if (getprofile.rowCount > 0) {
        // Profile found, emit the profile data
        socket.emit("Profile", getprofile.rows[0]);
      } else {
        // No profile found, emit an error message
        socket.emit("ProfileError", { message: "User profile not found." });
      }
    } catch (error) {
      // console.error("Error fetching profile:", error);
      // Emit an error if there's an issue with the database query
      socket.emit("ProfileError", { message: "Error fetching user profile." });
    }
  });

  // Handling Searchs
  socket.on("Search", async (query) => {
    try {
      const joblistings = await pool.query(
        `SELECT * FROM jobs 
         WHERE title ILIKE $1 
         OR company ILIKE $1 
         OR location ILIKE $1 
         OR type ILIKE $1 
         OR level ILIKE $1 
         OR imglink ILIKE $1`,
        [`%${query}%`]
      ); // Search query applied to all fields
      if (joblistings.rowCount > 0) {
        socket.emit("searchResults", joblistings.rows);
      } else {
        socket.emit("searchError", "No jobs found");
      }
    } catch (error) {
      socket.emit("searchError", "Failed to search jobs");
    }
  });

  // 🔹 Handle disconnect
  socket.on("disconnect", () => {});

  // Handling Filters
  socket.on("filter", async (filter) => {
    const { jobType, jobExperience, jobfunctions, salaryRange } = filter;
    const sanitizedJobFunctions =
      jobfunctions.flat().length === 0 ? null : jobfunctions;

    // try {
    //   const joblistings = await pool.query(
    //     `SELECT * FROM jobs
    //      WHERE ($1 IS NULL OR type = $1)
    //      AND ($2 IS NULL OR level = $2)`[
    //       //  AND ($3 IS NULL OR description ILIKE $3)
    //       //  AND ($4 IS NULL OR salary BETWEEN $4[0] AND $4[1]),
    //       (jobType, jobExperience)
    //     ]
    //   );

    //   socket.emit("filterResults", joblistings.rows);
    // } catch (error) {
    //   console.error("Filter error:", error);
    //   socket.emit("filterResults", []);
    // }
  });

  // Handling applicant saving jobs
  socket.on("savejob", async (idArray) => {
    try {
      const [jobid, userid] = idArray; // Extract job ID and user ID

      // Check if user activity exists
      const userActivity = await pool.query(
        "SELECT applied_jobs FROM user_activities WHERE user_id = $1",
        [userid]
      );

      if (userActivity.rows.length === 0) {
        // No record exists, create one with the job ID
        await pool.query(
          "INSERT INTO user_activities (user_id, applied_jobs) VALUES ($1, $2)",
          [userid, JSON.stringify([jobid])]
        );
      } else {
        // Record exists, check if the job is already saved
        const existingJobs = JSON.parse(
          userActivity.rows[0].applied_jobs || "[]"
        );

        if (existingJobs.includes(jobid)) {
        } else {
          // Append the new job and update the database
          existingJobs.push(jobid);
          await pool.query(
            "UPDATE user_activities SET applied_jobs = $1 WHERE user_id = $2",
            [JSON.stringify(existingJobs), userid]
          );
        }
      }
    } catch (error) {
      // console.error("Error saving job:", error);
    }
  });

  // Handling applicant applying job
  socket.on("applyingjob", async (idArray) => {
    const [jobid, userid] = idArray;
    try {
      const getapplicantname = await pool.query(
        `SELECT *  
         FROM users WHERE
         user_id = $1`,
        [userid]
      );

      if (getapplicantname.rowCount > 0) {
        const applicant = getapplicantname.rows[0]; // Get the first row
        const jobApplicationQuery = `
          INSERT INTO job_applications (job_id, applicant_name, applicant_email, applicant_phone) 
          VALUES ($1, $2, $3, $4)
        `;

        await pool.query(jobApplicationQuery, [
          jobid,
          applicant.name,
          applicant.email,
          applicant.number,
        ]);

        // Check if user activity exists
        const userActivity = await pool.query(
          "SELECT jobs_applied FROM user_activities WHERE user_id = $1",
          [userid]
        );

        if (userActivity.rows.length === 0) {
          // No record exists, create one with the job ID
          await pool.query(
            "INSERT INTO user_activities (user_id, jobs_applied) VALUES ($1, $2)",
            [userid, JSON.stringify([jobid])]
          );
        } else {
          // Record exists, check if the job is already saved
          const existingJobs = JSON.parse(
            userActivity.rows[0].jobs_applied || "[]"
          );

          if (existingJobs.includes(jobid)) {
          } else {
            // Append the new job and update the database
            existingJobs.push(jobid);
            await pool.query(
              "UPDATE user_activities SET jobs_applied = $1 WHERE user_id = $2",
              [JSON.stringify(existingJobs), userid]
            );
          }
        }

        // Now trigger 'getapplicants' for the employer
        const employerIdResult = await pool.query(
          `SELECT employer_id FROM jobs WHERE id = $1`,
          [jobid]
        );

        if (employerIdResult.rowCount > 0) {
          const employerId = employerIdResult.rows[0].employer_id; // Corrected variable name

          if (employerSockets[employerId]) {
            // Emit to the employer's socket to get updated applicants
            socket
              .to(employerSockets[employerId])
              .emit("getapplicants", employerId);
          } else {
          }
        } else {
        }
      } else {
      }
    } catch (error) {}
  });

  // For an Employer to get applicants
  socket.on("getallapplicants", async (employerId) => {
    // console.log(employerId);
    try {
      const getapplicants = await pool.query(
        `SELECT * 
FROM jobs
LEFT JOIN Job_Applications
  ON jobs.id = Job_Applications.job_id
WHERE employer_id = $1 
  AND Job_Applications.applicant_name IS NOT NULL
  AND Job_Applications.applicant_email IS NOT NULL
ORDER BY applied_at DESC  -- Order by application date (last applied);
`,
        [employerId]
      );

      if (getapplicants.rowCount > 0) {
        // console.log(getapplicants.rows);
        socket.emit("allapplicants", getapplicants.rows);
      } else {
        socket.emit("noapplicants", "No applicants yet");
      }
    } catch (error) {
      // console.error("Error fetching applicants:", error);
    }
  });

  socket.on("getapplicants", async (employerId) => {
    // console.log(employerId);
    try {
      const getapplicants = await pool.query(
        `SELECT * 
FROM jobs
LEFT JOIN Job_Applications
  ON jobs.id = Job_Applications.job_id
WHERE employer_id = $1 
  AND Job_Applications.applicant_name IS NOT NULL
  AND Job_Applications.applicant_email IS NOT NULL
ORDER BY applied_at DESC  -- Order by application date (last applied)
LIMIT 5;
`,
        [employerId]
      );

      if (getapplicants.rowCount > 0) {
        // console.log(getapplicants.rows);
        socket.emit("applicants", getapplicants.rows);
      } else {
        socket.emit("noapplicants", "No applicants yet");
      }
    } catch (error) {
      // console.error("Error fetching applicants:", error);
    }
  });

  // For applicants to get all saved jobs
  socket.on("getSavedJobs", async (userid) => {
    try {
      const useractivities = await pool.query(
        "SELECT * FROM user_activities WHERE user_id = $1",
        [userid]
      );

      let appliedjobs = useractivities.rows[0]?.applied_jobs || [];
      let job_applied = useractivities.rows[0]?.jobs_applied || [];
      // If stored as a string, parse it first
      if (typeof appliedjobs === "string") {
        appliedjobs = JSON.parse(appliedjobs);
      }
      if (typeof job_applied === "string") {
        job_applied = JSON.parse(job_applied);
      }

      const jobDetails = [];
      const applied_jobs = [];

      for (const job of appliedjobs) {
        try {
          const joblistings = await pool.query(
            "SELECT * FROM jobs WHERE id = $1",
            [job]
          );

          if (joblistings.rows.length > 0) {
            // console.log("this is the list", joblistings.rows);
            jobDetails.push(joblistings.rows[0]); // Store job details
          }
        } catch (error) {
          // console.error(`Error fetching job with ID ${job}:`, error);
        }
      }

      for (const job of job_applied) {
        try {
          const joblistings = await pool.query(
            "SELECT * FROM jobs WHERE id = $1",
            [job]
          );

          if (joblistings.rows.length > 0) {
            applied_jobs.push(joblistings.rows[0]); // Store job details
          }
        } catch (error) {
          // console.error(`Error fetching job with ID ${job}:`, error);
        }
      }

      socket.emit("appliedjobs", applied_jobs);
      // Emit the full array once
      socket.emit("savedJobs", jobDetails);
    } catch (error) {
      // console.error("Error fetching saved jobs:", error);
      socket.emit("savedJobsError", { message: "Failed to fetch saved jobs" });
    }
  });

  // For employer to post new job
  socket.on("postnewJob", async (data) => {
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
      imglink,
      employerid,
    } = data;

    try {
      // Insert the job data into the database
      const insertJob = await pool.query(
        `INSERT INTO jobs (
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
 experience,          application_deadline,
          imglink,
          employer_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )`,
        [
          title,
          company,
          location,
          type,
          work_mode,
          job_function,
          salary,
          description,
          level,
          requirements, // Joining array values into a string
          benefits, // Similarly, joining arrays
          qualifications,
          experience,
          application_deadline,
          imglink,
          employerid,
        ]
      );

      // Emit a success message back to the client
      socket.emit("jobPostStatus", {
        status: "success",
        message: "Job posted successfully",
      });

      io.emit("newJobPosted", {
        job: {
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
          imglink,
        },
      });

      // console.log("Emitting new job:", {
      //   title,
      //   company,
      //   location,
      //   type,
      //   work_mode,
      //   job_function,
      //   salary,
      //   description,
      //   level,
      //   requirements,
      //   benefits,
      //   qualifications,
      //   experience,
      //   application_deadline,
      //   imglink,
      // });
    } catch (error) {
      // console.error("Error inserting job:", error);

      // Emit an error message back to the client
      socket.emit("jobPostStatus", {
        status: "error",
        message: "Failed to post job. Please try again.",
      });

      //
    }
  });

  // for employer to get list of all posted job
  socket.on("getemployerpostedjobs", async (data) => {
    try {
      const employerid = data;
      // console.log(employerid);
      const getEmployerJobs = await pool.query(
        "SELECT * FROM jobs WHERE employer_id = $1",
        [employerid]
      );

      if (getEmployerJobs.rowCount > 0) {
        socket.emit("employerjobs", getEmployerJobs.rows);
      } else {
        socket.emit("employerjobs", []); // Emit empty array if no jobs are found
      }
    } catch (error) {
      // console.error("Error fetching jobs:", error);
    }
  });

  socket.on("deletejob", async (id) => {
    let [jobid, employer_id] = id;
    jobid = Number(jobid);

    try {
      const deletejob = await pool.query(
        "DELETE FROM jobs WHERE employer_id = $1 AND id = $2 RETURNING *",
        [employer_id, jobid]
      );

      if (deletejob.rowCount > 0) {
        // console.log("Deleted job:", deletejob.rows[0]);
        socket.emit("jobdeleted", { jobid });
      } else {
        // console.log("Error: Job not found or not deleted.");
      }
    } catch (error) {
      // console.error("Error deleting job:", error);
    }
  });

  socket.on("Editjob", async (data) => {
    const {
      job_id, // Assuming job_id is provided to identify the job to be updated
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
      imglink,
      employerid,
    } = data;

    try {
      // Update the job data in the database
      const updateJob = await pool.query(
        `UPDATE jobs SET
          title = $1,
          company = $2,
          location = $3,
          type = $4,
          work_mode = $5,
          job_function = $6,
          salary = $7,
          description = $8,
          level = $9,
          requirements = $10,
          benefits = $11,
          qualifications = $12,
          experience = $13,
          application_deadline = $14,
          imglink = $15,
          employer_id = $16
        WHERE job_id = $17`, // Make sure to update the job based on the job_id
        [
          title,
          company,
          location,
          type,
          work_mode,
          job_function,
          salary,
          description,
          level,
          requirements, // Join array values into a string if necessary
          benefits, // Join arrays as needed
          qualifications,
          experience,
          application_deadline,
          imglink,
          employerid,
          job_id, // Job identifier to find the record to update
        ]
      );

      // Emit a success message back to the client
      socket.emit("jobPostStatus", {
        status: "success",
        message: "Job updated successfully",
      });

      // Optionally, broadcast the updated job to others (e.g., for real-time UI update)
      io.emit("newJobPosted", {
        job: {
          job_id,
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
          imglink,
        },
      });

      // console.log("Emitting updated job:", {
      //   job_id,
      //   title,
      //   company,
      //   location,
      //   type,
      //   work_mode,
      //   job_function,
      //   salary,
      //   description,
      //   level,
      //   requirements,
      //   benefits,
      //   qualifications,
      //   experience,
      //   application_deadline,
      //   imglink,
      // });
    } catch (error) {
      // console.error("Error updating job:", error);

      // Emit an error message back to the client
      socket.emit("jobPostStatus", {
        status: "error",
        message: "Failed to update job. Please try again.",
      });
    }
  });

  socket.on("Totalofalljobs", async (employerId) => {
    const employer_id = employerId;
    try {
      const getallEmployerJobs = await pool.query(
        "SELECT * FROM jobs WHERE employer_id = $1",
        [employer_id]
      );

      if (getallEmployerJobs.rows) {
        socket.emit("Totalofjobs", getallEmployerJobs.rowCount);
      }
    } catch (error) {}
  });
});

server.listen(9000, () => {
  console.log("Server running on http://localhost:9000");
});

module.exports = app;
