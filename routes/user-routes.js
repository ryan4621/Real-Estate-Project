

import express from 'express';
import dotenv from 'dotenv';
import pool from '../database.js';
import jwt from "jsonwebtoken";
import ImageKit from "imagekit";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/authentication.js'
import { applyFilters, applyPagination } from '../utils/query-helpers.js';
import { sendContactConfirmationEmail, sendContactNotificationToAdmin, sendVerificationEmail, sendPasswordResetEmail, sendPasswordResetConfirmation, sendPasswordChangeConfirmation } from '../middleware/email-service.js'
import { validateContact, validateProfile, validateSavedSearch, validateEmail, validateProfilePhoto, validatePasswordReset, validatePagination, handleValidationErrors } from '../middleware/validation.js'

const router = express.Router()
dotenv.config()

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC,
    privateKey: process.env.IMAGEKIT_PRIVATE,
    urlEndpoint: process.env.IMAGEKIT_URL,
});

const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10
});

const determinePriority = (subject, message) => {
	const urgentKeywords = [
		"urgent",
		"emergency",
		"asap",
		"immediately",
		"critical",
		"broken",
		"not working",
	];
	const messageText = message.toLowerCase();

	if ( subject === "listings" || urgentKeywords.some((keyword) => messageText.includes(keyword))) {
		return "high";
	}

	if (subject === "technical" || subject === "account") {
		return "normal";
	}

	return "low";
};

// Submit contact form
router.post("/contact", validateContact, handleValidationErrors, async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        let userId = null;
        
        const token = req.cookies.REauthToken;

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id;
            } catch (jwtError) {
                // Token exists but is invalid - just ignore and treat as guest
                console.warn('Invalid JWT token:', jwtError.message);
            }
        }

        const priority = determinePriority(subject, message);

        // Insert contact submission
        const [result] = await pool.execute(
            `INSERT INTO contact_submissions (user_id, name, email, subject, message, priority)
     VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, name, email, subject, message, priority]
        );

        const submissionId = result.insertId;

        // Get user info if logged in (for better email context)
        let userInfo = null;
        if (userId) {
            const [userRows] = await pool.execute(
                "SELECT first_name, last_name, email as user_email FROM users WHERE id = ?",
                [userId]
            );
            userInfo = userRows[0] || null;
        }

        const [adminRows] = await pool.execute(
            "SELECT email AS admin_email FROM users WHERE role = 'admin'"
        );
          
        const adminEmails = adminRows.map(r => r.admin_email);
          

        // Send emails
        try {
            await sendContactConfirmationEmail(email, name, submissionId, subject, message, priority);
            await sendContactNotificationToAdmin(submissionId, name, email, subject, message, priority, userInfo, adminEmails);
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
        }

        res.status(201).json({
            success: true,
            message:
                "Your message has been sent successfully. We will respond within 24 hours.",
            data: {
                submissionId,
                priority,
                estimatedResponse: priority === "high" ? "4-8 hours" : "12-24 hours",
            },
        });

        // Log activity if user is logged in
        // if (userId) {
        //     try {
        //         await pool.execute(
        //             `INSERT INTO activity_logs (user_id, activity_type, description, ip_address, device_info)
        //  VALUES (?, ?, ?, ?, ?)`,
        //             [
        //                 userId,
        //                 "contact_submission",
        //                 `Contact form submitted: ${subject}`,
        //                 req.ip || req.connection.remoteAddress,
        //                 req.headers["user-agent"] || "Unknown Device",
        //             ]
        //         );
        //     } catch (logError) {
        //         console.error("Failed to log contact activity:", logError);
        //     }
        // }
    } catch (error) {
        console.error("Contact form submission error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to submit your message. Please try again later.",
        });
    }
}
);

// User profile info routes
router.put("/profile", validateProfile, handleValidationErrors, requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const { first_name, last_name, phone, gender, zip, city, state, country } = req.body;
        console.log(first_name, last_name, phone, gender, zip, city, state, country)

        await pool.execute(
            `UPDATE users 
            SET first_name = ?, last_name = ?, phone = ?, gender = ?, zip = ?, city = ?, state = ?, country = ?
            WHERE id = ?`,
            [first_name, last_name, phone || null, gender || null, zip || null, city || null, state || null, country || null, userId]
        );

        res.json({
            message: "Profile updated successfully",
        });

        // Get current user data to check if email changed
        // const [currentUser] = await pool.execute(
        // 	"SELECT email FROM users WHERE id = ?",
        // 	[userId]
        // );

        // const emailChanged = currentUser[0].email !== email;

        // If email changed, set email_verified to FALSE and generate new verification token
        // 	if (emailChanged) {
        // 		const verificationToken = crypto.randomBytes(32).toString("hex");
        // 		const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // 		await pool.execute(
        // 			"UPDATE users SET name = ?, email = ?, phone = ?, gender = ?, country = ?, email_verified = FALSE, verification_token = ?, verification_token_expires = ? WHERE id = ?",
        // 			[
        // 				name,
        // 				email,
        // 				phone,
        // 				gender,
        // 				country,
        // 				verificationToken,
        // 				tokenExpires,
        // 				userId,
        // 			]
        // 		);

        // 		// Send verification email
        // 		const verificationUrl = `${process.env.WEBSITE_URL}/auth/verify-email?token=${verificationToken}`;
        // 		await sendVerificationEmail(email, name, verificationUrl);
        // 	} else {
        // 		// Email didn't change, normal update
        // 		await pool.execute(
        // 			`UPDATE users 
        //    SET name = ?, email = ?, phone = ?, country = ?, gender = ? 
        //    WHERE id = ?`,
        // 			[name, email, phone || null, country || null, gender || null, userId]
        // 		);
        // 	}

        // Fetch updated user data to return
        // const [updatedUser] = await pool.execute(
        // 	"SELECT id, name, email, phone, country, gender, email_verified FROM users WHERE id = ?",
        // 	[userId]
        // );

        // res.json({
        //     message: emailChanged
        //         ? "Profile updated. Please verify your new email address."
        //         : "Profile updated successfully",
        //     user: updatedUser[0],
        //     emailChanged: emailChanged,
        // });

        // After the profile update query, add:
        // await logUserActivity(
        // 	userId,
        // 	"profile_update",
        // 	emailChanged
        // 		? "Profile and email updated, verification required"
        // 		: "Profile information updated",
        // 	req
        // );
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update profile" });
    }
});

router.put("/profile/email", validateEmail, handleValidationErrors, requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const { email } = req.body;

        const [selectUser] = await pool.execute(
            "SELECT first_name from users WHERE id = ?",
            [userId]
        )

        const name = selectUser[0].first_name;
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await pool.execute(
            "UPDATE users SET email = ?, email_verified = FALSE, verification_token = ?, verification_token_expires = ?, last_verification_sent  = NOW() WHERE id = ?",
            [ email, verificationToken, tokenExpires, userId ]
        );

        // Send verification email
        const verificationUrl = `${process.env.WEBSITE_URL}/auth/verify-email?token=${verificationToken}`;
        await sendVerificationEmail(email, name, verificationUrl);

        res.json({
            message: "Email updated successfully. Kindly verify your new email address.",
        });

        // After the profile update query, add:
        // await logUserActivity(
        // 	userId,
        // 	"profile_update",
        // 	emailChanged
        // 		? "Profile and email updated, verification required"
        // 		: "Profile information updated",
        // 	req
        // );
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update profile" });
    }
});

router.get("/profile", requireAuth, async (req, res) => {
	try {
		const userId = req.user.id;

		const [rows] = await pool.execute(
            `SELECT id, first_name, last_name, email, role, phone, gender, zip, city, state, country, created_at, email_verified
            FROM users
            WHERE id = ?`,
			[userId]
		);

		if (rows.length === 0) {
			return res.status(404).json({ message: "User not found" });
		}

		res.json({ user: rows[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to fetch profile" });
	}
});

// User profile picture routes
router.get("/profile/upload-signature", uploadLimiter, (req, res) => {
    try {
  
      const { fileSize, fileType } = req.query;
    
      if (fileSize > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "File too large" });
      }
    
      if (!["image/jpg", "image/jpeg", "image/png"].includes(fileType)) {
        return res.status(400).json({ message: "Invalid file type" });
      }
  
      const authParams = imagekit.getAuthenticationParameters();
      console.log("Auth params:", authParams);
  
      res.json(authParams);
    } catch (error) {
      console.error("ImageKit signature error:", error);
      res.status(500).json({ message: "Failed to generate upload signature" });
    }
});

router.put("/update-profile-photo", validateProfilePhoto, handleValidationErrors, requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get image URL from request body
        const { profile_image } = req.body;
        if (!profile_image) {
            return res
                .status(400)
                .json({ message: "Profile image URL is required" });
        }

        // Update user's profile image in database
        const [result] = await pool.execute(
            "UPDATE users SET profile_image = ? WHERE id = ?",
            [profile_image, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            success: true,
            message: "Profile photo updated successfully",
            profile_image: profile_image,
        });
    } catch (err) {
        console.error("Profile photo update error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to update profile photo",
        });
    }
}
);

router.delete("/delete-profile-photo", requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Remove profile image from database
        const [result] = await pool.execute(
            "UPDATE users SET profile_image = NULL WHERE id = ?",
            [userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            success: true,
            message: "Profile picture deleted successfully",
        });
    } catch (err) {
        console.error("Delete profile photo error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to delete profile picture",
        });
    }
});

//User password reset routes
router.post("/password-reset/request", async (req, res) => {
    try {
        const { userId } = req.body

        const [rows] = await pool.execute(
            'SELECT first_name, email from users where id = ?', 
            [userId]
        )

        const userName = rows[0].first_name
        const userEmail = rows[0].email

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 15 * 60 * 1000);

        await pool.execute(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [resetToken, tokenExpires, userId]
        );
      
        const resetLink = `${process.env.WEBSITE_URL}/api/password-reset/form?token=${resetToken}`;
        await sendPasswordResetEmail(userName, userEmail, resetLink)

        res.json({
            message: "Password reset link has been sent to your registered email"
        });

    }catch(error){
        console.error(error);
        res.status(500).json({ message: "Failed to send password reset link" });
    }
})

async function renderPasswordResetPage(data) {
    try {
      const templatePath = path.join(process.cwd(), 'routes-templates', 'password-reset-status.html');
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

router.get("/password-reset/form", async (req, res) => {
    try{
        const resetToken = req.query.token;

        console.log(resetToken)
        
        if (!resetToken) {
            const html = await renderPasswordResetPage({
                title: 'Invalid Reset Link',
                containerClass: 'error',
                iconClass: 'bi-x-circle-fill',
                iconColor: 'icon-error',
                heading: 'Invalid Reset Link',
                message: 'Invalid or missing reset token.',
                buttonLink: '/frontend/guest/index.html',
                buttonClass: 'btn-primary',
                buttonText: 'Return to Homepage'
            });
            return res.status(400).send(html);
        }
        
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [resetToken]
        );
        
        if (users.length === 0) {
            const html = await renderPasswordResetPage({
                title: 'Link Expired',
                containerClass: 'warning',
                iconClass: 'bi-clock-history',
                iconColor: 'icon-warning',
                heading: 'Link Expired',
                message: 'This password reset link has expired. Please request a new one.',
                buttonLink: '/frontend/guest/index.html',
                buttonClass: 'btn-warning',
                buttonText: 'Return to Homepage'
            });
            return res.status(400).send(html);
        }

        const htmlPath = path.join(process.cwd(), 'routes-templates', 'password-reset.html');

        let htmlTemplate = await fs.readFile(htmlPath, "utf8");

        // const escapeHtml = str =>
        //     String(str).replace(/[&<>"']/g, s => ({
        //       "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        //     }[s]));

        // htmlTemplate = htmlTemplate
        //     .replace(/{{token}}/g, () => escapeHtml(resetToken))

        res.send(htmlTemplate)
    }catch (error) {
        console.error('Error loading password reset form:', error);

        const html = await renderPasswordResetPage({
            title: 'Error',
            containerClass: 'error',
            iconClass: 'bi-exclamation-triangle-fill',
            iconColor: 'icon-error',
            heading: 'Something Went Wrong',
            message: 'Failed to load password reset form. Please try again later.',
            buttonLink: '/frontend/guest/index.html',
            buttonClass: 'btn-danger',
            buttonText: 'Return to Homepage'
        });
        res.status(500).send(html);
    }
})

router.post("/password-reset/submit", validatePasswordReset, handleValidationErrors, async (req, res) => {
    try {
        const { newPasswordValue, confirmPasswordValue, resetToken } = req.body;

        if (!resetToken) {
            return res.status(400).send({message: "Invalid or missing reset token."});
        }

        if (!newPasswordValue || !confirmPasswordValue) {
            return res.status(400).json({ 
                incompleteFields: true, 
                message: "All fields are required"
            });
        }

        if (newPasswordValue !== confirmPasswordValue) {
            return res.status(400).json({ 
                noMatch: true,
                message: 'Passwords do not match'
            });
        }

        // Get user info for email
        const [users] = await pool.execute(
            "SELECT id, email, first_name FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
            [resetToken]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "This password reset link has expired. Please request a new one." });
        }

        const user = users[0];
        const userId = user.id

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPasswordValue, 10);

        // Update password
        await pool.execute(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, userId]
        );

        // Delete ALL sessions to force user to login with new password
        await pool.execute("DELETE FROM user_sessions WHERE user_id = ?", [
            userId,
        ]);

        // Send confirmation email
        await sendPasswordResetConfirmation(user.email, user.first_name);

        // Log activity
        // await logUserActivity(
        // 	userId,
        // 	"password_change",
        // 	"Password reset via forgot password",
        // 	null
        // );

        res.json({ message: "Password reset successfully. Kindly re-login" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to reset password" });
    }
});

router.post("/change-password/submit", validatePasswordReset, handleValidationErrors, requireAuth, async (req, res) => {
    try {
        const userId = req.user.id
        const { newPasswordValue, confirmPasswordValue } = req.body;

        if (!newPasswordValue || !confirmPasswordValue) {
            return res.status(400).json({ 
                incompleteFields: true, 
                message: "All fields are required"
            });
        }

        if (newPasswordValue !== confirmPasswordValue) {
            return res.status(400).json({ 
                noMatch: true,
                message: 'Passwords do not match'
            });
        }

        // Get user info for email
        const [users] = await pool.execute(
            "SELECT email, first_name FROM users WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = users[0];

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPasswordValue, 10);

        // Update password
        await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        // Delete ALL sessions to force user to login with new password
        await pool.execute("DELETE FROM user_sessions WHERE user_id = ?", [
            userId,
        ]);

        // Send confirmation email
        await sendPasswordChangeConfirmation(user.email, user.first_name);

        // Log activity
        // await logUserActivity(
        // 	userId,
        // 	"password_change",
        // 	"Password reset via forgot password",
        // 	null
        // );

        res.json({ message: "Password changed successfully. Kindly re-login" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to change password" });
    }
});

// User notifications routes
router.get("/notifications", requireAuth, async (req, res) => {
	try {
		const userId = req.user.id;

		// Get user preferences or create default if doesn't exist
		let [notifications] = await pool.execute(
			`SELECT * FROM notification_settings WHERE user_id = ?`,
			[userId]
		);

		if (notifications.length === 0) {
			await pool.execute(`INSERT INTO notification_settings (user_id) VALUES (?)`, [
				userId,
			]);

			// Fetch the newly created preferences
			[notifications] = await pool.execute(
				`SELECT * FROM notification_settings WHERE user_id = ?`,
				[userId]
			);
		}

		res.json({ notification_settings: notifications[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to fetch notification settings" });
	}
});

router.put("/notifications", requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const { savedListings, marketingEmails } = req.body;

        // Update or insert notification settings
        await pool.execute(
            `INSERT INTO notification_settings (user_id, saved_listings, marketing_emails, updated_at)
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE 
             saved_listings = VALUES(saved_listings),
             marketing_emails = VALUES(marketing_emails),
             updated_at = NOW()`,
            [userId, savedListings, marketingEmails]
        );

        res.json({ 
            success: true,
            message: "Notification settings updated successfully" 
        });

        // await logUserActivity(
        //     userId,
        //     "profile_update",
        //     "Account preferences updated",
        //     req
        // );
    } catch (error) {
        console.error("Error updating notification settings:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to update notification settings" 
        });
    }
});

//User favorites routes
export function applySorting(sortBy) {
    const sortOptions = {
      'newest': 'ORDER BY added_at DESC',
      'price_low': 'ORDER BY price ASC',
      'price_high': 'ORDER BY price DESC',
    };
  
    return sortOptions[sortBy] || 'ORDER BY added_at DESC';
}

router.get("/favorites", validatePagination, requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit, offset } = req.pagination;
        const { status, sort } = req.query;

        // 1️⃣ Start with base query
        let baseQuery = `SELECT * FROM favorites`;
        
        // 2️⃣ Apply ALL filters at once (including user_id)
        const filterResult = applyFilters(baseQuery, { 
            user_id: userId,
            status 
        });
        let finalQuery = filterResult.query;
        let params = filterResult.params;

        // 3️⃣ Get total count
        const countQuery = finalQuery.replace('SELECT *', 'SELECT COUNT(*) AS total');
        const [countRows] = await pool.execute(countQuery, params);
        const total = countRows[0].total;

        // 4️⃣ Apply sorting and pagination
        const sortClause = applySorting(sort);
        finalQuery = `${finalQuery} ${sortClause} LIMIT ? OFFSET ?`;
        params = [...params, limit, offset];

        // 5️⃣ Fetch data
        const [rows] = await pool.execute(finalQuery, params);

        res.json({
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch saved favorites" });
    }
});

router.get("/favorites/:propertyId", validatePagination, requireAuth, async (req, res) => {
    try {
        const userId = req.user.id
        const propertyId = req.params.propertyId

        const [favorite] = await pool.execute(
            `SELECT * FROM favorites WHERE user_id = ? AND property_id = ?`,
            [userId, propertyId]
        )

        if(favorite.length === 0){
            return res.status(404).json({Message: "Favorite not found"})
        }

        res.json({
            data: favorite
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch favorite" });
    }
});

router.post('/favorites/:id', requireAuth, async (req, res) => {
    try{
        const userId = req.user.id
        const propertyId = req.params.id
        const {property_type, status, price, bedrooms, bathrooms, area, primaryImage, address, location, agent_name, broker} = req.body

        await pool.execute(
            `INSERT INTO favorites (user_id, property_id, property_type, status, price, bedrooms, bathrooms, area, address, location, primary_image, agent_name, broker, added_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [userId, propertyId, property_type, status, price, bedrooms, bathrooms, area, address, location, primaryImage, agent_name, broker]
        )

        res.status(200).json({
            success: true,
            message: "Property successfully added to favorites"
        })

    }catch(error){
        console.error("Error creating favorites", error)
        res.status(500).json({message: "Failed to add property to favorites"})
    }
})

router.delete("/favorites/:id", requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const propertyId = req.params.id

        const [result] = await pool.execute(
            "DELETE FROM favorites WHERE user_id = ? AND property_id = ?",
            [userId, propertyId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Favorite not found" });
        }

        res.json({
            success: true,
            message: "Favorite removed successfully",
        });
    } catch (err) {
        console.error("Error deleting property from favorites:", err);
        res.status(500).json({
            success: false,
            message: "Failed to remove property from favorites",
        });
    }
});

//User saved searches routes
router.get("/saved-searches", requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.execute(
            `SELECT * FROM saved_searches WHERE user_id = ?`,
            [userId]
        );

        if(rows.length === 0) {
            res.status(404).json({ message: "Saved searches not found" })
            return
        }

        res.json({ data: rows });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch saved searches" });
    }
});

router.post('/saved-searches', requireAuth, validateSavedSearch, async (req, res) => {
    try {
  
      const { category, filters } = req.body;
      const userId = req.user.id;
  
      const [result] = await pool.execute(
        `INSERT INTO saved_searches (user_id, category, filters) 
         VALUES (?, ?, ?)`,
        [userId, category, JSON.stringify(filters)]
      );

      const searchId = result.insertId
  
      res.status(201).json({
        success: true,
        message: 'Search saved successfully',
        id: searchId
      });
  
    } catch (error) {
      console.error('Error saving search:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save search'
      });
    }
});

router.delete("/saved-searches/:id", requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const searchId = req.params.id

        const [result] = await pool.execute(
            "DELETE FROM saved_searches WHERE user_id = ? AND id = ?",
            [userId, searchId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Favorite not found" });
        }

        res.json({
            success: true,
            message: "Search removed successfully",
        });
    } catch (err) {
        console.error("Error deleting saved search:", err);
        res.status(500).json({
            success: false,
            message: "Failed to remove saved search",
        });
    }
});

router.patch('/saved-searches/:id/alerts', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { alerts } = req.body;
        const userId = req.user.id;
        
        await pool.execute(
            'UPDATE saved_searches SET alerts = ? WHERE id = ? AND user_id = ?',
            [alerts, id, userId]
        );
        
        res.json({ success: true, message: 'Alerts updated' });
    } catch (error) {
        console.error('Error updating alerts:', error);
        res.status(500).json({ success: false, message: 'Failed to update alerts' });
    }
});

//Buyer profile routes
router.get('/buyer-profile', requireAuth, async (req, res) => {
    const userId = req.user.id

    try {
        const [rows] = await pool.execute(`
            SELECT * FROM buyer_profile WHERE user_id = ?`,
            [userId]
        )

        if(rows.length === 0){
            res.status(404).json({message: "Buyer profile info not found"})
            return
        }

        const data = rows[0]

        res.status(200).json(data)

    }catch(error){
        console.error(error)
        res.status(500).json({message: "Failed to get buyer profile info"})
    }
})

router.post('/buyer-profile', requireAuth, async (req, res) => {
    const userId = req.user.id
    const formData = req.body

    console.log(formData)

    try {
        await pool.execute(`
            INSERT INTO buyer_profile (user_id, annual_household_income, monthly_debt, available_funds, veteran_status)
            VALUES (?, ?, ?, ?, ?)`,
            [userId, formData.annualIncome, formData.monthlyDebt, formData.availableFunds, formData.militaryService]
        )

        res.status(201).json({
            success: true,
            message: "Buyer profile info saved successfully"
        })

    }catch(error){
        console.error(error)
        res.status(500).json({
            success: false,
            message: "Faled to save buyer profile info"
        })
    }
});

router.patch('/buyer-profile', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id

        const allowedFields = [
            'annual_household_income',
            'monthly_debt',
            'available_funds',
            'veteran_status'
        ];

        // Filter only allowed fields from request body
        const updates = {};
        for (const field of allowedFields) {
            if (req.body.hasOwnProperty(field)) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No valid fields to update' });
        }

        // Check if profile exists
        const [existing] = await pool.execute(
            'SELECT id FROM buyer_profile WHERE user_id = ?',
            [userId]
        );

        if (existing.length === 0) {
            return res.status(400).json({ message: 'No buyer profile to edit' });
        } 
        
        // Update existing profile
        const setClause = Object.keys(updates).map(field => `${field} = ?`).join(', ');
        const values = [...Object.values(updates), userId];

        await pool.execute(
            `UPDATE buyer_profile SET ${setClause} WHERE user_id = ?`,
            values
        );

        // Fetch updated profile
        const [updated] = await pool.execute(
            'SELECT * FROM buyer_profile WHERE user_id = ?',
            [userId]
        );

        res.status(200).json({
            message: 'Profile updated successfully',
            data: updated[0]
        });

    } catch (error) {
        console.error('Error updating buyer profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;