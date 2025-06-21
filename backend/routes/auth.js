const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { pool } = require("../server")
const { validateEmail, validatePassword } = require("../utils/validation")

const router = express.Router()

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

// Sign Up Route
router.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body

    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" })
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" })
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number",
      })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" })
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute("SELECT user_id FROM users WHERE email = ?", [email])

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "User with this email already exists" })
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Insert new user
    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, is_new_user, email_verified, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [email, hashedPassword, firstName, lastName, 1, 0, 1],
    )

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: result.insertId,
        email: email,
        firstName: firstName,
        lastName: lastName,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    )

    res.status(201).json({
      message: "User created successfully",
      token: token,
      user: {
        id: result.insertId,
        email: email,
        firstName: firstName,
        lastName: lastName,
        isNewUser: true,
      },
    })
  } catch (error) {
    console.error("Signup error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

// Sign In Route
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" })
    }

    // Find user
    const [users] = await pool.execute(
      "SELECT user_id, email, password_hash, first_name, last_name, is_active FROM users WHERE email = ?",
      [email],
    )

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const user = users[0]

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ message: "Account is deactivated. Please contact support." })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Update last login
    await pool.execute("UPDATE users SET last_login = NOW() WHERE user_id = ?", [user.user_id])

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    )

    res.json({
      message: "Login successful",
      token: token,
      user: {
        id: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    })
  } catch (error) {
    console.error("Signin error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

// Verify Token Route
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({ message: "No token provided" })
    }

    const decoded = jwt.verify(token, JWT_SECRET)

    // Check if user still exists and is active
    const [users] = await pool.execute(
      "SELECT user_id, email, first_name, last_name, is_active FROM users WHERE user_id = ?",
      [decoded.userId],
    )

    if (users.length === 0 || !users[0].is_active) {
      return res.status(401).json({ message: "Invalid token" })
    }

    res.json({
      valid: true,
      user: {
        id: users[0].user_id,
        email: users[0].email,
        firstName: users[0].first_name,
        lastName: users[0].last_name,
      },
    })
  } catch (error) {
    console.error("Token verification error:", error)
    res.status(401).json({ message: "Invalid token" })
  }
})

module.exports = router
