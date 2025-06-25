const express = require("express")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const mysql = require("mysql2/promise")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Database connection


// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log("Database connected successfully")
    connection.release()
  } catch (error) {
    console.error("Database connection failed:", error.message)
  }
}

// Routes
app.use("/api/auth", require("./routes/auth"))
app.use("/api/users", require("./routes/users"))

// Health check
app.get("/api/health", (req, res) => {
  res.json({ message: "DishCovery Backend API is running!" })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: "Something went wrong!" })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  testConnection()
})