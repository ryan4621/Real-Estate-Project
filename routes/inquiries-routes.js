import express from "express";
import pool from '../database.js'
import dotenv from "dotenv"

const router = express.Router()
dotenv.config();

router.get('/inquiries', async (req, res) => {
  try {
    const { page, limit, offset } = req.pagination;
    const { q, tour } = req.query;

    // Base query
    let baseQuery = `
      SELECT id, property_id, user_id, name, email, phone, message, request_tour, created_at,
      FROM inquiries
    `;
    let params = [];

    // 1️⃣ Apply search (optional)
    if (q) {
      const searchResult = applySearch(baseQuery, q, [
        "id", "property_id", "user_id", "name", "email", "phone", "message", "request_tour", "created_at"
      ]);
      baseQuery = searchResult.query;
      params = [...searchResult.params];
    }

    // 2️⃣ Apply filters (optional)
    const filterResult = applyFilters(baseQuery, { tour });
    baseQuery = filterResult.query;
    params = [...params, ...filterResult.params];

    // 3️⃣ Get total count for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM (${baseQuery}) AS total_inquiries`,
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
  }catch(error){
    console.error("Error fetching inquiries:", error)
    res.status(500).json({message: "Error fetching inquiries"})
  }
});



export default router;