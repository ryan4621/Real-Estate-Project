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

// Validation
const validateAmenityId = [
    param('id').isInt().withMessage('Invalid amenity ID')
];

const validateAmenities = [
    body('property_id').isInt().withMessage('Property ID must be a number'),
    body('swimming_pool').optional().isBoolean(),
    body('elevator').optional().isBoolean(),
    body('high_ceiling').optional().isBoolean(),
    body('hardwood_floors').optional().isBoolean(),
    body('game_room').optional().isBoolean(),
    body('gourmet_kitchen').optional().isBoolean(),
    body('ensuite').optional().isBoolean(),
    body('water_view').optional().isBoolean(),
    body('city_view').optional().isBoolean(),
    body('pets_allowed').optional().isBoolean(),
    body('guest_house').optional().isBoolean(),
    body('single_story').optional().isBoolean(),
    body('security_features').optional().isBoolean(),
    body('water_front').optional().isBoolean(),
    body('gym').optional().isBoolean(),
    body('community_gym').optional().isBoolean(),
    body('library').optional().isBoolean(),
    body('fitness_centre').optional().isBoolean(),
    body('club_house').optional().isBoolean(),
    body('garage').optional().isBoolean(),
    body('recreational_amenities').optional().isBoolean(),
    body('tennis_court').optional().isBoolean(),
    body('fireplace').optional().isBoolean(),
    body('multi_stories').optional().isBoolean(),
    body('courtyard_style').optional().isBoolean(),
    body('rv_parking').optional().isBoolean()
];

// Get all amenities with pagination
router.get("/amenities", requireAdmin, validatePagination, async (req, res) => {
    try {
        const { page, limit, offset } = req.pagination;
        const { q } = req.query;

        let baseQuery = `SELECT * FROM amenities`;
        let params = [];

        // Apply search
        if (q) {
            const searchResult = applySearch(baseQuery, q, ["id", "property_id"]);
            baseQuery = searchResult.query;
            params = [...searchResult.params];
        }

        // Get total count
        const [countRows] = await pool.execute(
            `SELECT COUNT(*) AS total FROM (${baseQuery}) AS total_amenities`,
            params
        );
        const total = countRows[0].total;

        // Apply pagination
        const paginatedQuery = applyPagination(baseQuery, page, limit);
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
        console.error("Error getting amenities:", error);
        res.status(500).json({ message: "Error getting amenities" });
    }
});

// Get single amenity
router.get("/amenities/:id", validateAmenityId, handleValidationErrors, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.execute(
            "SELECT * FROM amenities WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Amenity not found" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch amenity" });
    }
});

// Create amenities
router.post("/amenities", validateAmenities, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
        const {
            property_id, swimming_pool, elevator, high_ceiling, hardwood_floors,
            game_room, gourmet_kitchen, ensuite, water_view, city_view, pets_allowed,
            guest_house, single_story, security_features, water_front, gym,
            community_gym, library, fitness_centre, club_house, garage,
            recreational_amenities, tennis_court, fireplace, multi_stories,
            courtyard_style, rv_parking
        } = req.body;

        // Check if property exists
        const [property] = await pool.execute(
            "SELECT property_id FROM properties WHERE property_id = ?",
            [property_id]
        );

        if (property.length === 0) {
            return res.status(404).json({ message: "Property not found" });
        }

        // Check if amenities already exist for this property
        const [existing] = await pool.execute(
            "SELECT id FROM amenities WHERE property_id = ?",
            [property_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: "Amenities already exist for this property" });
        }

        await pool.execute(
            `INSERT INTO amenities (
                property_id, swimming_pool, elevator, high_ceiling, hardwood_floors,
                game_room, gourmet_kitchen, ensuite, water_view, city_view, pets_allowed,
                guest_house, single_story, security_features, water_front, gym,
                community_gym, library, fitness_centre, club_house, garage,
                recreational_amenities, tennis_court, fireplace, multi_stories,
                courtyard_style, rv_parking
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                property_id, swimming_pool || false, elevator || false, high_ceiling || false,
                hardwood_floors || false, game_room || false, gourmet_kitchen || false,
                ensuite || false, water_view || false, city_view || false, pets_allowed || false,
                guest_house || false, single_story || false, security_features || false,
                water_front || false, gym || false, community_gym || false, library || false,
                fitness_centre || false, club_house || false, garage || false,
                recreational_amenities || false, tennis_court || false, fireplace || false,
                multi_stories || false, courtyard_style || false, rv_parking || false
            ]
        );

        res.status(201).json({ message: "Amenities created successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create amenities" });
    }
});

// Update amenities
router.put("/amenities/:id", validateAmenityId, validateAmenities, handleValidationErrors, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const {
        property_id, swimming_pool, elevator, high_ceiling, hardwood_floors,
        game_room, gourmet_kitchen, ensuite, water_view, city_view, pets_allowed,
        guest_house, single_story, security_features, water_front, gym,
        community_gym, library, fitness_centre, club_house, garage,
        recreational_amenities, tennis_court, fireplace, multi_stories,
        courtyard_style, rv_parking
    } = req.body;

    try {
        const [result] = await pool.execute(
            `UPDATE amenities SET 
                swimming_pool = ?, elevator = ?, high_ceiling = ?, hardwood_floors = ?,
                game_room = ?, gourmet_kitchen = ?, ensuite = ?, water_view = ?, 
                city_view = ?, pets_allowed = ?, guest_house = ?, single_story = ?,
                security_features = ?, water_front = ?, gym = ?, community_gym = ?,
                library = ?, fitness_centre = ?, club_house = ?, garage = ?,
                recreational_amenities = ?, tennis_court = ?, fireplace = ?, multi_stories = ?,
                courtyard_style = ?, rv_parking = ?
            WHERE id = ?`,
            [
                swimming_pool || false, elevator || false, high_ceiling || false,
                hardwood_floors || false, game_room || false, gourmet_kitchen || false,
                ensuite || false, water_view || false, city_view || false, pets_allowed || false,
                guest_house || false, single_story || false, security_features || false,
                water_front || false, gym || false, community_gym || false, library || false,
                fitness_centre || false, club_house || false, garage || false,
                recreational_amenities || false, tennis_court || false, fireplace || false,
                multi_stories || false, courtyard_style || false, rv_parking || false, id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Amenity not found" });
        }

        res.json({ message: "Amenities updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update amenities" });
    }
});

// Delete amenities
router.delete("/amenities/:id", validateAmenityId, handleValidationErrors, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.execute(
            "DELETE FROM amenities WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Amenity not found" });
        }

        res.json({ message: "Amenities deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete amenities" });
    }
});

export default router