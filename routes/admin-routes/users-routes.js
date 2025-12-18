import express from 'express';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import pool from '../../database.js';
import { requireAdmin } from '../../middleware/authentication.js'
import { applyPagination, applySearch, applyFilters } from "../../utils/query-helpers.js";
import { validateId, validateAdminUsersQuery, validateUsersExport, validateAdminUserUpdate, validatePagination, handleValidationErrors } from '../../middleware/validation.js'

const router = express.Router()
dotenv.config()


function generateCSV(res, rows) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=users-export-${Date.now()}.csv`);

  // CSV Headers
  res.write("ID,First Name,Last Name,Email,Role,Phone,Gender,Country,Email verified,Last verification sent,Verification token,Verification token expires,Created at,Updated at,Deactivated at,Suspended at,Deleted at\n");
  
  // CSV Data
  rows.forEach(row => {
    const safe = val => {
      if (val === null || val === undefined) return "";
      return String(val).replace(/"/g, '""');
    };
    
    res.write(`"${safe(row.id)}","${safe(row.first_name)}","${safe(row.last_name)}","${safe(row.email)}","${safe(row.role)}","${safe(row.phone)}","${safe(row.gender)}","${safe(row.country)}","${safe(row.email_verified)}","${safe(row.last_verification_sent)}","${safe(row.verification_token)}","${safe(row.verification_token_expires)}","${safe(row.created_at)}","${safe(row.updated_at)}","${safe(row.deactivated_at)}","${safe(row.suspended_at)}","${safe(row.deleted_at)}"\n`);
  });
  
  res.end();
}

function generatePDF(res, rows, filters = {}) {
  // Set response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=users-export-${Date.now()}.pdf`
  );

  // Create a PDF document
  const doc = new PDFDocument({ size: [2000, 842], margin: 40, layout: 'landscape' });

  // Pipe PDF directly to response
  doc.pipe(res);

  // Document title
  doc.fontSize(16).text("Users Export Report", { align: 'center' });
  doc.moveDown();

  // Generated info
  doc.fontSize(10)
     .text(`Generated: ${new Date().toLocaleString()}`)
     .text(`Total Users: ${rows.length}`)
     .text(`Filters Applied: ${Object.keys(filters).length > 0 ? 'Yes' : 'None'}`)
     .moveDown();

  // Table headers
  const tableHeaders = [
    "ID", "First Name", "Last Name", "Email", "Role", "Phone", "Gender", "Country", "Email verified", "Last verification sent", "Verification token", "Verification token expires", "Created at", "Updated at", "Deactivated at", "Suspended at", "Deleted at"
  ];

  // Column widths (adjust as needed)
  const colWidths = [40, 90, 90, 150, 60, 90, 60, 90, 40, 90, 150, 90, 90, 90, 90, 90, 90];

  // Start table
  const startX = doc.x;
  let startY = doc.y;

  // Draw headers
  tableHeaders.forEach((header, i) => {
    doc.font('Helvetica-Bold').fontSize(8)
       .text(header, startX + colWidths.slice(0, i).reduce((a,b) => a+b,0), startY, { width: colWidths[i], continued: i !== tableHeaders.length-1 });
  });
  doc.moveDown();

  // Draw rows
  rows.forEach(row => {
    startY = doc.y;
    const rowValues = [
      row.id, row.first_name, row.last_name, row.email, row.role, row.phone, row.gender, row.country, row.email_verified, row.last_verification_sent, row.verification_token,  row.verification_token_expires, row.created_at, row.updated_at, row.deactivated_at, row.suspended_at, row.deleted_at
    ];

    rowValues.forEach((val, i) => {
      const text = val === null || val === undefined ? 'N/A' : String(val);
      doc.font('Helvetica').fontSize(8)
         .text(text, startX + colWidths.slice(0, i).reduce((a,b) => a+b,0), startY, { width: colWidths[i], continued: i !== rowValues.length-1 });
    });
    doc.moveDown();

    // Add new page if near bottom
    if (doc.y > doc.page.height - 50) {
      doc.addPage({ size: [2000, 842], layout: 'landscape', margin: 40 });
      startY = doc.y;
    }
    
  });

  // Finalize PDF
  doc.end();
}

router.get("/users", validateAdminUsersQuery, handleValidationErrors, validatePagination, requireAdmin, async (req, res) => {
  try {
    const { page, limit, offset } = req.pagination;
    const { q, role, gender } = req.query;

    // Base query
    let baseQuery = `
      SELECT id, first_name, last_name, email, role, phone, gender, country, email_verified, last_verification_sent, verification_token, verification_token_expires, created_at, updated_at, deactivated_at, suspended_at, deleted_at 
      FROM users
    `;
    let params = [];

    // 1️⃣ Apply search (optional)
    if (q) {
      const searchResult = applySearch(baseQuery, q, [
        "first_name", "last_name", "email", "role", "phone", "gender", "country"
      ]);
      baseQuery = searchResult.query;
      params = [...searchResult.params];
    }

    // 2️⃣ Apply filters (optional)
    const filterResult = applyFilters(baseQuery, { role, gender });
    baseQuery = filterResult.query;
    params = [...params, ...filterResult.params];

    // 3️⃣ Get total count for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM (${baseQuery}) AS total_users`,
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
    console.error("Error getting users:", error);
    res.status(500).json({ message: "Error getting users" });
  }
});

router.get("/users/export", validateUsersExport, handleValidationErrors, requireAdmin, async (req, res) => {
  try {
    const { format = 'csv', q, role, gender } = req.query;

    // Base query - same as your GET /properties but without pagination
    let baseQuery = `
      SELECT id, first_name, last_name, email, role, phone, gender, country, email_verified, last_verification_sent, verification_token, verification_token_expires, created_at, updated_at, deactivated_at, suspended_at, deleted_at 
      FROM users
    `;
    let params = [];

    // Apply search (same logic as main route)
    if (q) {
      const searchResult = applySearch(baseQuery, q, [
        "first_name", "last_name", "email", "role", "phone", "gender", "country"
      ]);
      baseQuery = searchResult.query;
      params = [...searchResult.params];
    }

    // Apply filters
    if (q && (role || gender)) {
      const filterKeys = [];
      const filterValues = [];
      if (role) {
        filterKeys.push('role = ?');
        filterValues.push(role);
      }
      if (gender) {
        filterKeys.push('gender = ?');
        filterValues.push(gender);
      }
      baseQuery += ` AND ${filterKeys.join(' AND ')}`;
      params = [...params, ...filterValues];
    } else if (!q && (role || gender)) {
      const filterResult = applyFilters(baseQuery, { role, gender });
      baseQuery = filterResult.query;
      params = [...params, ...filterResult.params];
    }

    baseQuery += ' ORDER BY created_at DESC';

    // Fetch all filtered data (no pagination)
    const [rows] = await pool.execute(baseQuery, params);

    if (format === 'pdf') {
      generatePDF(res, rows, {q, role, gender});
    } else {
      generateCSV(res, rows);
    }
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to export data" 
    });
  }
});

router.get("/users/:id", validateId, handleValidationErrors, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await pool.execute(
      "SELECT first_name, last_name, email, role, phone, gender, country FROM users WHERE id = ?",
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

router.put("/users/:id", validateId, validateAdminUserUpdate, handleValidationErrors, requireAdmin, async (req, res) => {

  const { id } = req.params;
  const { firstName, lastName, email, role, phone, gender, country } = req.body || {};

  try {
    const [result] = await pool.execute(
      `UPDATE users SET first_name = ?, last_name = ?, email = ?, role = ?, phone = ?, gender = ?, country = ?, updated_at = NOW() WHERE id = ?`,
      [firstName, lastName, email, role, phone, gender, country, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User updated successfully:", id);
    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update user" });
  }
});
  
router.delete("/users/:id", validateId, handleValidationErrors, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute(
      "DELETE FROM users WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;