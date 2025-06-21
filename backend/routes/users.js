const express = require("express")
const { pool } = require("../server")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT user_id, email, first_name, last_name, profile_picture_url, 
              cooking_for_type, is_new_user, email_verified, created_at, last_login
       FROM users WHERE user_id = ?`,
      [req.user.userId],
    )

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    const user = users[0]
    res.json({
      id: user.user_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      profilePicture: user.profile_picture_url,
      cookingForType: user.cooking_for_type,
      isNewUser: user.is_new_user,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      lastLogin: user.last_login,
    })
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

// Update user profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, cookingForType } = req.body

    await pool.execute(
      `UPDATE users 
       SET first_name = ?, last_name = ?, cooking_for_type = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [firstName, lastName, cookingForType, req.user.userId],
    )

    res.json({ message: "Profile updated successfully" })
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

module.exports = router
