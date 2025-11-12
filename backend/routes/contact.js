// routes/contact.js - Contact forms (Feedback & Issue Reports)
import express from 'express';
import db from '../db.js';
import nodemailer from 'nodemailer';

const router = express.Router();

// Gmail SMTP transporter for admin notifications (saves SendGrid quota)
const gmailTransporter = process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    })
  : null;

// Get all active admin emails
const getAdminEmails = async () => {
  try {
    const admins = await db.query(
      `SELECT email FROM admin_users 
       WHERE (is_active = 1 OR is_active IS NULL) 
       AND email IS NOT NULL 
       AND email != ''`
    );
    return admins.map(admin => admin.email).filter(Boolean);
  } catch (error) {
    console.error('❌ Error fetching admin emails:', error);
    // Fallback to dishcovery.org@gmail.com if query fails
    return ['dishcovery.org@gmail.com'];
  }
};

// Send admin notification email using Gmail SMTP
const sendAdminNotificationEmail = async (adminEmails, subject, htmlContent) => {
  // TEST MODE: Just log, don't send (saves emails during testing)
  if (process.env.TEST_MODE === 'true') {
    console.log('📧 [TEST MODE] Would send admin notification:');
    console.log('   To:', adminEmails);
    console.log('   Subject:', subject);
    return true;
  }

  if (!gmailTransporter) {
    console.error('❌ Gmail SMTP not configured. Cannot send admin notification.');
    return false;
  }

  try {
    // Send to all admins in parallel
    const emailPromises = adminEmails.map(email => 
      gmailTransporter.sendMail({
        from: `"DishCovery Notifications" <${process.env.EMAIL_USER || 'dishcovery.org@gmail.com'}>`,
        to: email,
        subject: subject,
        html: htmlContent
      })
    );

    await Promise.all(emailPromises);
    console.log(`✅ Admin notification email sent via Gmail SMTP to ${adminEmails.length} admin(s)`);
    return true;
  } catch (error) {
    console.error('❌ Error sending admin notification email:', error);
    // Don't throw - email failure shouldn't break the submission
    return false;
  }
};

// ========================================
// 📝 SUBMIT FEEDBACK (Public - No Auth Required)
// ========================================
router.post('/feedback', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    console.log('📝 New feedback submission from contact form:', { name, email });

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and feedback message are required' 
      });
    }

    if (name.trim().length === 0 || email.trim().length === 0 || message.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields must not be empty' 
      });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Feedback message must be at least 10 characters long' 
      });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Feedback message must not exceed 2000 characters' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Get admin emails
    const adminEmails = await getAdminEmails();
    
    // Always include dishcovery.org@gmail.com as primary recipient
    const primaryEmail = 'dishcovery.org@gmail.com';
    if (!adminEmails.includes(primaryEmail)) {
      adminEmails.unshift(primaryEmail); // Add to beginning of array
    }
    
    if (adminEmails.length === 0) {
      console.warn('⚠️ No admin emails found, using fallback');
      adminEmails.push(primaryEmail);
    }

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="background:#2E7D32;color:white;padding:15px;border-radius:10px 10px 0 0;text-align:center;">
            📝 New Feedback Submission
          </h2>
          <div style="background:#f9f9f9;padding:20px;border-radius:0 0 10px 10px;">
            <p><strong>You have received new feedback from a user:</strong></p>
            <div style="background:white;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #2E7D32;">
              <p><strong>Name:</strong> ${name.trim()}</p>
              <p><strong>Email:</strong> <a href="mailto:${email.trim()}">${email.trim()}</a></p>
              <p><strong>Feedback:</strong></p>
              <p style="white-space:pre-wrap;background:#f5f5f5;padding:10px;border-radius:4px;">${message.trim()}</p>
            </div>
            <p style="font-size:12px;color:#888;margin-top:20px;padding-top:15px;border-top:1px solid #ddd;">
              Submitted: ${new Date().toLocaleString()}
            </p>
            <p style="font-size:12px;color:#888;">© 2025 DishCovery. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to admins (non-blocking)
    sendAdminNotificationEmail(
      adminEmails,
      `📝 New Feedback from ${name.trim()} - DishCovery`,
      emailHtml
    ).catch(err => {
      console.error('⚠️ Failed to send admin notification email (non-critical):', err);
    });

    console.log('✅ Feedback submitted successfully');

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! We will review it soon.'
    });
  } catch (error) {
    console.error('❌ Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// 🐛 SUBMIT ISSUE REPORT (Public - No Auth Required)
// ========================================
router.post('/report', async (req, res) => {
  try {
    const { name, email, issueType, description } = req.body;

    console.log('🐛 New issue report from contact form:', { name, email, issueType });

    // Validation
    if (!name || !email || !issueType || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, issue type, and description are required' 
      });
    }

    if (name.trim().length === 0 || email.trim().length === 0 || description.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields must not be empty' 
      });
    }

    if (description.trim().length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Issue description must be at least 10 characters long' 
      });
    }

    if (description.trim().length > 2000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Issue description must not exceed 2000 characters' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Validate issue type
    const validIssueTypes = ['technical', 'account', 'recipe', 'other'];
    if (!validIssueTypes.includes(issueType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid issue type' 
      });
    }

    // Get admin emails
    const adminEmails = await getAdminEmails();
    
    // Always include dishcovery.org@gmail.com as primary recipient
    const primaryEmail = 'dishcovery.org@gmail.com';
    if (!adminEmails.includes(primaryEmail)) {
      adminEmails.unshift(primaryEmail); // Add to beginning of array
    }
    
    if (adminEmails.length === 0) {
      console.warn('⚠️ No admin emails found, using fallback');
      adminEmails.push(primaryEmail);
    }

    // Format issue type for display
    const issueTypeLabels = {
      technical: 'Technical Issue',
      account: 'Account Issue',
      recipe: 'Recipe Issue',
      other: 'Other Issue'
    };

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="background:#d32f2f;color:white;padding:15px;border-radius:10px 10px 0 0;text-align:center;">
            🐛 New Issue Report
          </h2>
          <div style="background:#f9f9f9;padding:20px;border-radius:0 0 10px 10px;">
            <p><strong>You have received a new issue report from a user:</strong></p>
            <div style="background:white;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #d32f2f;">
              <p><strong>Reporter Name:</strong> ${name.trim()}</p>
              <p><strong>Reporter Email:</strong> <a href="mailto:${email.trim()}">${email.trim()}</a></p>
              <p><strong>Issue Type:</strong> <span style="background:#ffebee;padding:4px 8px;border-radius:4px;font-weight:bold;">${issueTypeLabels[issueType] || issueType}</span></p>
              <p><strong>Description:</strong></p>
              <p style="white-space:pre-wrap;background:#f5f5f5;padding:10px;border-radius:4px;">${description.trim()}</p>
            </div>
            <p style="font-size:12px;color:#888;margin-top:20px;padding-top:15px;border-top:1px solid #ddd;">
              Submitted: ${new Date().toLocaleString()}
            </p>
            <p style="font-size:12px;color:#888;">© 2025 DishCovery. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to admins (non-blocking)
    sendAdminNotificationEmail(
      adminEmails,
      `🐛 New Issue Report: ${issueTypeLabels[issueType]} - DishCovery`,
      emailHtml
    ).catch(err => {
      console.error('⚠️ Failed to send admin notification email (non-critical):', err);
    });

    console.log('✅ Issue report submitted successfully');

    res.status(201).json({
      success: true,
      message: 'Thank you for reporting this issue! We will look into it soon.'
    });
  } catch (error) {
    console.error('❌ Error submitting issue report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit issue report. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

