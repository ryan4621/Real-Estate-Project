import express from "express";
import  pool from "../../database.js";
import bcrypt from 'bcrypt';
import propertiesRoutes from "./properties-routes.js";
import usersRoutes from "./users-routes.js";
import inquiriesRoutes from "./inquiries-routes.js";
import notificationsRoutes from "./notifications-routes.js";
import supportRoutes from "./support-routes.js";
import userOverviewRoutes from "./user-overview-routes.js";
import amenitiesRoutes from "./amenities-routes.js";
import { requireAdmin } from "../../middleware/authentication.js";
import { validatePasswordChange, handleValidationErrors } from "../../middleware/validation.js";

const router = express.Router();

router.use(propertiesRoutes);
router.use(usersRoutes);
router.use(inquiriesRoutes);
router.use(notificationsRoutes);
router.use(supportRoutes);
router.use(userOverviewRoutes);
router.use(amenitiesRoutes);


router.post("/change-password", validatePasswordChange, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
  
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Both old and new password are required" });
        }

        const userId = req.user.id;

        // Fetch current password
        const [rows] = await pool.execute("SELECT password FROM users WHERE id = ?", [userId]);
        if (rows.length === 0) return res.status(404).json({ message: "Admin not found" });

        const admin = rows[0];
        const match = await bcrypt.compare(oldPassword, admin.password);
        if (!match) return res.status(401).json({ message: "Old password is incorrect" });

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.execute("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

        // Delete ALL sessions to force user to login with new password
        await pool.execute(
            "DELETE FROM user_sessions WHERE user_id = ?",
            [userId]
        );

        // Clear cookie immediately
        res.clearCookie("REauthToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });
  
        res.json({ message: "Password updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update password" });
    }
});

router.get("/dashboard/stats", requireAdmin, async (req, res) => {
    try{
        const [usersCount] = await pool.execute(
            'SELECT COUNT (*) as total from users WHERE role != "admin"'
        )

        const [propertiesCount] = await pool.execute(
            'SELECT COUNT(*) as total FROM properties'
        );
    
        const [newInquiries] = await pool.execute(
            'SELECT COUNT(*) as total FROM inquiries WHERE status = "new"'
        );
    
        res.json({
            total_users: usersCount[0].total,
            total_properties: propertiesCount[0].total,
            new_inquiries: newInquiries[0].total,
        });
    }catch(error){
        console.log('Error fetching stats', error)
        res.status(500).json({message: 'Failed to fetch statistics'})
    }
})

export default router;