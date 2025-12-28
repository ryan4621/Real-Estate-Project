// admin-routes.js

import express from 'express';
import dotenv from 'dotenv';
// import PDFDocument from 'pdfkit';
import pool from '../../database.js';
import { body, param } from 'express-validator';
import { requireAdmin } from '../../middleware/authentication.js'
import { applyPagination, applySearch, applyFilters } from "../../utils/query-helpers.js";
import { validatePagination, handleValidationErrors } from '../../middleware/validation.js'

const router = express.Router()
dotenv.config()


// Add these routes to your admin-routes.js file

// Validation for open houses
const validateOpenHouseId = [
    param('id').isInt().withMessage('Invalid open house ID')
];

const validateOpenHouse = [
    body('property_id').isInt().withMessage('Property ID must be a number'),
    body('start_datetime').isISO8601().withMessage('Invalid start datetime'),
    body('end_datetime').isISO8601().withMessage('Invalid end datetime'),
    body('host_name').optional().isString().trim(),
    body('host_phone').optional().isString().trim(),
    body('host_email').optional().isEmail().withMessage('Invalid email'),
    body('description').optional().isString().trim(),
    body('status').isIn(['Scheduled', 'Completed', 'Cancelled']).withMessage('Invalid status'),
    body('max_attendees').optional().isInt({ min: 0 }).withMessage('Max attendees must be a positive number'),
    body('requires_rsvp').optional().isBoolean()
];

// Get all open houses with pagination and filters
router.get("/open-houses", requireAdmin, validatePagination, async (req, res) => {
    try {
        const { page, limit, offset } = req.pagination;
        const { q, status, requires_rsvp } = req.query;

        // Base query
        let baseQuery = `
            SELECT * FROM open_houses
        `;
        let params = [];

        // 1️⃣ Apply search (optional)
        if (q) {
            const searchResult = applySearch(baseQuery, q, [
                "id", "property_id", "host_name"
            ]);
            baseQuery = searchResult.query;
            params = [...searchResult.params];
        }

        // 2️⃣ Apply filters (optional)
        const filterResult = applyFilters(baseQuery, { status, requires_rsvp });
        baseQuery = filterResult.query;
        params = [...params, ...filterResult.params];

        // Add ORDER BY
        baseQuery += ` ORDER BY start_datetime DESC`;

        // 3️⃣ Get total count for pagination
        const [countRows] = await pool.execute(
            `SELECT COUNT(*) AS total FROM (${baseQuery}) AS total_open_houses`,
            params
        );
        const total = countRows[0].total;

        // 4️⃣ Apply pagination
        const paginatedQuery = applyPagination(baseQuery, page, limit);

        // 5️⃣ Fetch paginated data
        const [rows] = await pool.execute(paginatedQuery, params);

        res.json({
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            data: rows,
        });
    } catch (error) {
        console.error("Error getting open houses:", error);
        res.status(500).json({ message: "Error getting open houses" });
    }
});

// Get single open house
router.get("/open-houses/:id", validateOpenHouseId, handleValidationErrors, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.execute(
            "SELECT * FROM open_houses WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Open house not found" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch open house" });
    }
});

// Create open house
router.post("/open-houses", validateOpenHouse, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
        const {
            property_id, start_datetime, end_datetime, host_name, host_phone,
            host_email, description, status, max_attendees, requires_rsvp
        } = req.body;

        // Check if property exists
        const [property] = await pool.execute(
            "SELECT property_id FROM properties WHERE property_id = ?",
            [property_id]
        );

        if (property.length === 0) {
            return res.status(404).json({ message: "Property not found" });
        }

        // Validate date range
        if (new Date(start_datetime) >= new Date(end_datetime)) {
            return res.status(400).json({ message: "End datetime must be after start datetime" });
        }

        await pool.execute(
            `INSERT INTO open_houses (
                property_id, start_datetime, end_datetime, host_name, host_phone,
                host_email, description, status, max_attendees, requires_rsvp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                property_id, start_datetime, end_datetime, host_name || null,
                host_phone || null, host_email || null, description || null,
                status, max_attendees || null, requires_rsvp || false
            ]
        );

        res.status(201).json({ message: "Open house created successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create open house" });
    }
});

// Update open house
router.put("/open-houses/:id", validateOpenHouseId, validateOpenHouse, handleValidationErrors, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const {
        property_id, start_datetime, end_datetime, host_name, host_phone,
        host_email, description, status, max_attendees, requires_rsvp
    } = req.body;

    try {
        // Validate date range
        if (new Date(start_datetime) >= new Date(end_datetime)) {
            return res.status(400).json({ message: "End datetime must be after start datetime" });
        }

        const [result] = await pool.execute(
            `UPDATE open_houses SET 
                start_datetime = ?, end_datetime = ?, host_name = ?, host_phone = ?,
                host_email = ?, description = ?, status = ?, max_attendees = ?,
                requires_rsvp = ?
            WHERE id = ?`,
            [
                start_datetime, end_datetime, host_name || null, host_phone || null,
                host_email || null, description || null, status, max_attendees || null,
                requires_rsvp || false, id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Open house not found" });
        }

        res.json({ message: "Open house updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update open house" });
    }
});

// Delete open house
router.delete("/open-houses/:id", validateOpenHouseId, handleValidationErrors, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.execute(
            "DELETE FROM open_houses WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Open house not found" });
        }

        res.json({ message: "Open house deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete open house" });
    }
});

export default router