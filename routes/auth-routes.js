// auth-routes.js

import express from 'express';
import pool from '../database.js';
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from "fs/promises";
import path from "path";
import { authRateLimit, verificationResendRateLimit } from '../middleware/security.js';
import { query, validationResult } from 'express-validator';
import { sendVerificationEmail } from '../middleware/email-service.js';
import { validateEmail, validateRegister, validateLogin, validateResendVerification, handleValidationErrors  } from '../middleware/validation.js';
import { checkVerificationCooldown, updateVerificationTimestamp } from '../middleware/email-cooldown.js';
import { requireAuth } from '../middleware/authentication.js';

const router = express.Router();

dotenv.config();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      "SELECT id, first_name, last_name, email, role, phone, gender, country, profile_image, email_verified FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];
    res.json(user);

  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Failed to get user data" });
  }
});

router.post("/check-email", validateEmail, handleValidationErrors, async (req, res) => {
    try {
        const { email } = req.body;

        const [rows] = await pool.execute(
            "SELECT email FROM users WHERE email = ?",
            [email]
        );

        if(rows.length === 0){
            return res.status(401).json({
                exists: false
            })
        } else {
            return res.status(200).json({
                exists: true
            })
        }
    }catch(error){
        console.error("Error:", error);
        res.status(500).json({message: "Request failed. Please try again later."})
    }
})

router.post('/register', authRateLimit, validateRegister, handleValidationErrors, async (req, res) => {
  try {
    const { email, firstName, lastName, password, gender, country } = req.body;
    
    const [existingUser] = await pool.execute(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );

    if(existingUser > 0){
      return res.status(409).json({message: "Email already registered"})
    }

    await pool.execute(
      'DELETE FROM pending_registrations WHERE email = ?',
      [email]
    );

    const hashedPassword = await bcrypt.hash(password, 10)

    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await pool.execute(
      `INSERT INTO pending_registrations
      (first_name, last_name, email, password, country, gender, verification_token, verification_token_expires)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, email, hashedPassword, country, gender, verificationToken, tokenExpires]
    )

    const verificationUrl = `${process.env.WEBSITE_URL}/auth/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(email, lastName, verificationUrl);

    res.status(201).json({
      message: "Registration successful! Please check your email to verify your account.",
      email: email
    })
  }catch(error){
    console.error("Error:", error)
    res.status(500).json({message: "Registration failed. Please try again later."})
  }
});

// Helper function to render verification template
async function renderVerificationPage(data) {
  try {
    const templatePath = path.join(process.cwd(), 'routes-templates', 'verify-email.html');
    let template = await fs.readFile(templatePath, 'utf-8');
    
    template = template.replace(/{{TITLE}}/g, data.title);
    template = template.replace(/{{CONTAINER_CLASS}}/g, data.containerClass);
    template = template.replace(/{{ICON_CLASS}}/g, data.iconClass);
    template = template.replace(/{{ICON_COLOR}}/g, data.iconColor);
    template = template.replace(/{{HEADING}}/g, data.heading);
    template = template.replace(/{{MESSAGE}}/g, data.message);
    template = template.replace(/{{BUTTON_LINK}}/g, data.buttonLink);
    template = template.replace(/{{BUTTON_CLASS}}/g, data.buttonClass);
    template = template.replace(/{{BUTTON_TEXT}}/g, data.buttonText);
    
    return template;
  } catch (error) {
    console.error('Template rendering error:', error);
    throw error;
  }
}

router.get("/verify-email", authRateLimit,
  [
    query('token')
      .trim()
      .isLength({ min: 64, max: 64 })
      .withMessage('Invalid token format')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty() || !req.query.token) {
      const html = await renderVerificationPage({
        title: 'Invalid Verification Link',
        containerClass: 'error',
        iconClass: 'bi-x-circle-fill',
        iconColor: 'icon-error',
        heading: 'Invalid Verification Link',
        message: 'The verification link is invalid or incomplete.',
        buttonLink: '/frontend/guest/index.html',
        buttonClass: 'btn-primary',
        buttonText: 'Return to Homepage'
      });
      return res.status(400).send(html);
    }

    try {
      const { token } = req.query;

      // FIRST: Check if this token is for a pending registration
      const [pendingUsers] = await pool.execute(
        "SELECT id, first_name, last_name, email, password, country, gender, verification_token_expires FROM pending_registrations WHERE verification_token = ?",
        [token]
      );
      
      if (pendingUsers.length > 0) {
        const pendingUser = pendingUsers[0];
        
        // Check if token expired
        if (new Date() > new Date(pendingUser.verification_token_expires)) {
          await pool.execute(
            "DELETE FROM pending_registrations WHERE id = ?",
            [pendingUser.id]
          );
          
          const html = await renderVerificationPage({
            title: 'Link Expired',
            containerClass: 'warning',
            iconClass: 'bi-clock-history',
            iconColor: 'icon-warning',
            heading: 'Link Expired',
            message: 'This verification link has expired. Please register again.',
            buttonLink: '/frontend/guest/index.html',
            buttonClass: 'btn-warning',
            buttonText: 'Return to Homepage'
          });
          return res.status(400).send(html);
        }
        
        // Insert into users table
        await pool.execute(
          "INSERT INTO users (first_name, last_name, email, password, country, gender, email_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())",
          [pendingUser.first_name, pendingUser.last_name, pendingUser.email, pendingUser.password, pendingUser.country, pendingUser.gender]
        );
        
        // Delete from pending registrations
        await pool.execute(
          "DELETE FROM pending_registrations WHERE id = ?",
          [pendingUser.id]
        );
        
        const html = await renderVerificationPage({
          title: 'Email Verified',
          containerClass: 'success',
          iconClass: 'bi-check-circle-fill',
          iconColor: 'icon-success',
          heading: 'Email Verified!',
          message: 'Your email has been successfully verified. You can now sign in to your account.',
          buttonLink: '/frontend/guest/index.html?verified=true',
          buttonClass: 'btn-dark',
          buttonText: 'Sign In Now'
        });
        return res.send(html);
      }
      
      // SECOND: Check if this token is for an email change in users table
      const [unverifiedUsers] = await pool.execute(
        "SELECT id, email, email_verified, verification_token_expires FROM users WHERE verification_token = ? AND email_verified = FALSE",
        [token]
      );
      
      if (unverifiedUsers.length === 0) {
        const html = await renderVerificationPage({
          title: 'Invalid Verification Link',
          containerClass: 'error',
          iconClass: 'bi-x-circle-fill',
          iconColor: 'icon-error',
          heading: 'Invalid Verification Link',
          message: 'This verification link is invalid or has already been used.',
          buttonLink: '/frontend/guest/index.html',
          buttonClass: 'btn-primary',
          buttonText: 'Return to Homepage'
        });
        return res.status(400).send(html);
      }
      
      const user = unverifiedUsers[0];
      
      // Check if token expired
      if (new Date() > new Date(user.verification_token_expires)) {
        // Don't delete from users, just clear the verification token
        await pool.execute(
          "UPDATE users SET verification_token = NULL, verification_token_expires = NULL WHERE id = ?",
          [user.id]
        );
        
        const html = await renderVerificationPage({
          title: 'Link Expired',
          containerClass: 'warning',
          iconClass: 'bi-clock-history',
          iconColor: 'icon-warning',
          heading: 'Link Expired',
          message: 'This verification link has expired. Please request a new verification email.',
          buttonLink: '/frontend/guest/index.html',
          buttonClass: 'btn-warning',
          buttonText: 'Return to Homepage'
        });
        return res.status(400).send(html);
      }
      
      // Mark email as verified
      await pool.execute(
        "UPDATE users SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = ?",
        [user.id]
      );
      
      const html = await renderVerificationPage({
        title: 'Email Verified',
        containerClass: 'success',
        iconClass: 'bi-check-circle-fill',
        iconColor: 'icon-success',
        heading: 'Email Verified!',
        message: 'Your email has been successfully verified. You can now sign in to your account.',
        buttonLink: '/frontend/guest/index.html',
        buttonClass: 'btn-dark',
        buttonText: 'Sign In Now'
      });
      res.send(html);
      
    } catch (err) {
      console.error(err);
      const html = await renderVerificationPage({
        title: 'Verification Failed',
        containerClass: 'error',
        iconClass: 'bi-exclamation-triangle-fill',
        iconColor: 'icon-error',
        heading: 'Verification Failed',
        message: 'An error occurred during verification. Please try again later.',
        buttonLink: '/frontend/guest/index.html',
        buttonClass: 'btn-danger',
        buttonText: 'Return to Homepage'
      });
      res.status(500).send(html);
    }
  }
);

// Resend verification email route
router.post("/resend-verification", validateResendVerification, handleValidationErrors, checkVerificationCooldown, async (req, res) => {
  try {
    const { email } = req.body;

    // ✅ Add debug logging
    console.log('Resend verification request for email:', email);

    // Check if email exists in users table and is VERIFIED
    const [verifiedUser] = await pool.execute(
      "SELECT id, email_verified FROM users WHERE email = ?",
      [email]
    );

    // ✅ Add debug logging
    console.log('Verified user check:', verifiedUser);
    
    if (verifiedUser.length > 0 && verifiedUser[0].email_verified === 1) {
      return res.status(400).json({ 
        message: "Email already verified. Please log in to your account.",
        alreadyVerified: true
      });
    }
    
    // Check if email exists in users table but is NOT verified (email change case)
    if (verifiedUser.length > 0 && verifiedUser[0].email_verified === 0) {

      console.log('Unverified user found, fetching name...');
      
      // Generate new token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await pool.execute(
        "UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE email = ?",
        [verificationToken, tokenExpires, email]
      );
      
      // Send verification email
      const verificationUrl = `${process.env.WEBSITE_URL}/auth/verify-email?token=${verificationToken}`;
      await sendVerificationEmail(email, verifiedUser[0].last_name || 'User', verificationUrl);
      
      // Update the timestamp for cooldown tracking
      await updateVerificationTimestamp(email);
      
      return res.json({ 
        message: "Verification email sent",
        cooldownSeconds: 60
      });
    }
    
    // Check in pending registrations (new signup case)
    const [pending] = await pool.execute(
      "SELECT id, first_name, last_name, email FROM pending_registrations WHERE email = ?",
      [email]
    );

    console.log('Pending registration check:', pending);
    
    if (pending.length === 0) {
      return res.status(404).json({ message: "Registration not found. Please sign up first." });
    }
    
    // Generate new token for pending registration
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await pool.execute(
      "UPDATE pending_registrations SET verification_token = ?, verification_token_expires = ? WHERE email = ?",
      [verificationToken, tokenExpires, email]
    );
    
    // Send verification email
    const verificationUrl = `${process.env.WEBSITE_URL}/auth/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(email, pending[0].last_name, verificationUrl);
    
    // Update the timestamp for cooldown tracking
    await updateVerificationTimestamp(email);
    
    res.json({ 
      message: "Verification email sent",
      cooldownSeconds: 60
    });
    
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to resend verification email" });
  }
});

// Check cooldown status without sending email
router.get("/check-cooldown", async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const [userResults] = await pool.execute(
      `SELECT last_verification_sent FROM users WHERE email = ?`,
      [email]
    );

    const [pendingResults] = await pool.execute(
      `SELECT last_verification_sent FROM pending_registrations WHERE email = ?`,
      [email]
    );

    const lastSent = userResults.length > 0
      ? userResults[0].last_verification_sent
      : pendingResults.length > 0
      ? pendingResults[0].last_verification_sent
      : null;

    if (!lastSent) {
      return res.json({ remainingSeconds: 0 });
    }

    const now = new Date();
    const cooldownPeriod = 65 * 1000;
    const timeSinceLastSent = now - new Date(lastSent);
    
    if (timeSinceLastSent < cooldownPeriod) {
      const remainingSeconds = Math.ceil((cooldownPeriod - timeSinceLastSent) / 1000);
      return res.json({ remainingSeconds });
    }

    res.json({ remainingSeconds: 0 });
    
  } catch (error) {
    console.error('Cooldown check error:', error);
    res.status(500).json({ message: 'Failed to check cooldown' });
  }
});

// Check if email is verified (for polling)
router.get("/check-verification", async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }
    
    // Check in users table
    const [users] = await pool.execute(
      "SELECT email_verified FROM users WHERE email = ?",
      [email]
    );
    
    if (users.length > 0) {
      return res.json({ 
        verified: users[0].email_verified === 1 
      });
    }
    
    // Check in pending registrations
    const [pending] = await pool.execute(
      "SELECT id FROM pending_registrations WHERE email = ?",
      [email]
    );
    
    res.json({ 
      verified: false,
      pending: pending.length > 0
    });
  
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Check failed" });
  }
});

function parseUserAgent(userAgent) {
    const ua = userAgent.toLowerCase();
    
    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('opera')) browser = 'Opera';
  
    // Detect OS
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
    return `${browser} on ${os}`;
}

router.post('/login', authRateLimit, validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.execute(
      "SELECT id, email, password, role, deleted_at, suspended_at, deactivated_at FROM users WHERE email = ?",
      [email]
    );

    if(rows.length === 0){
      return res.status(401).json({
        message: "Email not found",
        emailNotFound: true
      })
    }

    const user = rows[0]

    // Check if account is deleted
    if (user.deleted_at) {
      return res.status(403).json({
        message: "Account deleted, contact support for more info",
        accountStatus: "deleted"
      });
    }
    
    // Check if account is deactivated
    if (user.deactivated_at) {
      return res.status(403).json({
        message: "Account deactivated, contact support for more info",
        accountStatus: "deactivated"
      });
    }
    
    // Check if account is suspended
    if (user.suspended_at) {
      return res.status(403).json({
        message: "Account suspended, contact support for more info",
        accountStatus: "suspended"
      });
    }

    const match = await bcrypt.compare(password, user.password)
    if(!match){
      return res.status(401).json({
        incorrectPassword: true,
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7h" }
    );

    // Get device and location info
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const deviceInfo = parseUserAgent(userAgent);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Mark all existing sessions as not current
    await pool.execute(
      "DELETE FROM user_sessions WHERE user_id = ? AND ip_address = ?",
      [user.id, ipAddress]
    );

    // Create new session record
    await pool.execute(
      `INSERT INTO user_sessions (user_id, session_token, device_info, ip_address, is_current, expires_at)
      VALUES (?, ?, ?, ?, TRUE, ?)`,
      [user.id, token.substring(0, 50), deviceInfo, ipAddress, expiresAt]
    );
    
    // Clean up expired sessions
    await pool.execute("DELETE FROM user_sessions WHERE expires_at < NOW()");
    
    let cookieOptions = { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production", 
      sameSite: 'lax',
    };
    
    res.cookie("REauthToken", token, cookieOptions);
    res.json({ message: "Login successful", role: user.role });
  }catch(error){
    console.error('Login error:', error);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies.REauthToken;

    console.log('--- LOGOUT START ---');
    console.log('REauthToken:', token);
    // console.log('authToken:', token, token.length);
    // console.log('Headers x-forwarded-for:', req.headers['x-forwarded-for']);


    if (token) {
      // Mark session as ended
      await pool.execute(
        "DELETE FROM user_sessions WHERE session_token LIKE ? AND is_current = TRUE",
        [token.substring(0, 50) + '%']
      );
    };
    
    res.clearCookie("REauthToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.status(200).json({ message: "Logged out successfully" });
    
  } catch (err) {
    console.error(err);
    res.status(200).json({ message: "Log out failed" });
  }
});

export default router;