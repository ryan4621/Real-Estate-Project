import express from 'express';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import pool from '../../database.js';
import { requireAdmin } from '../../middleware/authentication.js'
import { applyPagination, applySearch, applyFilters } from "../../utils/query-helpers.js";
import { validateId, validateInquiryQuery, validateInquiriesExport, validateInquiryStatusUpdate, validatePagination, handleValidationErrors } from '../../middleware/validation.js'

const router = express.Router()
dotenv.config()


function generateCSV(res, rows) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=inquiries-export-${Date.now()}.csv`);

  // CSV Headers
  res.write("ID,Property ID,User ID,Name,Email,Phone,Message,Request Tour,Status,Created at,Updated at\n");
  
  // CSV Data
  rows.forEach(row => {
    const safe = val => {
      if (val === null || val === undefined) return "";
      return String(val).replace(/"/g, '""');
    };

    const createdAt = row.created_at ? row.created_at.toLocaleString() : "N/A";
    const updatedAt = row.updated_at ? row.updated_at.toLocaleString() : "N/A";
    
    res.write(`"${safe(row.id)}","${safe(row.property_id)}","${safe(row.user_id)}","${safe(row.name)}","${safe(row.email)}","${safe(row.phone)}","${safe(row.message)}","${safe(row.request_tour)}","${safe(row.status)}","${safe(createdAt)}","${safe(updatedAt)}"\n`);
  });
  
  res.end();
}

function generatePDF(res, rows, filters = {}) {
  // Set response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=inquiries-export-${Date.now()}.pdf`
  );

  // Create a PDF document
  const doc = new PDFDocument({ size: [2000, 842], margin: 40, layout: 'landscape' });

  // Pipe PDF directly to response
  doc.pipe(res);

  // Document title
  doc.fontSize(16).text("Inquiries Export Report", { align: 'center' });
  doc.moveDown();

  // Generated info
  doc.fontSize(10)
    .text(`Generated: ${new Date().toLocaleString()}`)
    .text(`Total Inquiries: ${rows.length}`)
    .text(`Filters Applied: ${Object.keys(filters).length > 0 ? 'Yes' : 'None'}`)
    .moveDown();

  // Table headers
  const tableHeaders = [
    "ID", "Property ID", "User ID", "Name", "Email", "Phone", "Message", "Request Tour", "Status", "Created at", "Updated at"
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
      row.id, row.property_id, row.user_id, row.name, row.email, row.phone, row.message, row.request_tour, row.status, row.created_at, row.updated_at
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

router.get("/inquiries", validateInquiryQuery, handleValidationErrors, validatePagination, requireAdmin, async (req, res) => {
  try {
    const { page, limit, offset } = req.pagination;
    const { q, request_tour, status } = req.query;

    // Base query
    let baseQuery = `
      SELECT id, property_id, user_id, name, email, phone, message, request_tour, status, created_at, updated_at
      FROM inquiries
    `;
    let params = [];

    // 1️⃣ Apply search (optional)
    if (q) {
      const searchResult = applySearch(baseQuery, q, [
        "id", "property_id", "user_id", "name", "email", "phone", "message",
      ]);
      baseQuery = searchResult.query;
      params = [...searchResult.params];
    }

    // 2️⃣ Apply filters (optional)
    const filterResult = applyFilters(baseQuery, { request_tour, status });
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
  } catch (error) {
    console.error("Error getting inquiries:", error);
    res.status(500).json({ message: "Error getting inquiries" });
  }
});

router.get("/inquiries/export", validateInquiriesExport, handleValidationErrors, requireAdmin, async (req, res) => {
  try {
    const { format = 'csv', q, request_tour, status } = req.query;

    let baseQuery = `
      SELECT id, property_id, user_id, name, email, phone, message, request_tour, status, created_at, updated_at
      FROM inquiries
    `;
    let params = [];

    if (q) {
      const searchResult = applySearch(baseQuery, q, [
        "id", "property_id", "user_id", "name", "email", "phone", "message",
      ]);
      baseQuery = searchResult.query;
      params = [...searchResult.params];
    }

    // Apply filters
    if (q && (request_tour || status)) {
      const filterKeys = [];
      const filterValues = [];
      if (request_tour) {
        filterKeys.push('request_tour = ?');
        filterValues.push(request_tour);
      }
      if (status) {
        filterKeys.push('status = ?');
        filterValues.push(status);
      }
      baseQuery += ` AND ${filterKeys.join(' AND ')}`;
      params = [...params, ...filterValues];
    } else if (!q && (request_tour || status)) {
      const filterResult = applyFilters(baseQuery, { request_tour, status });
      baseQuery = filterResult.query;
      params = [...params, ...filterResult.params];
    }

    baseQuery += ' ORDER BY created_at ASC';

    // Fetch all filtered data (no pagination)
    const [rows] = await pool.execute(baseQuery, params);

    if (format === 'pdf') {
      generatePDF(res, rows, {q, request_tour, status});
    } else {
      generateCSV(res, rows);
    }
  } catch (error) {
    console.error('Error exporting inquiries:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to export data" 
    });
  }
});

router.put("/inquiries/:id", validateId, validateInquiryStatusUpdate, handleValidationErrors, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  try {
    const [result] = await pool.execute(
      `UPDATE inquiries SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    console.log("Inquiry status updated successfully:", id);
    res.json({ message: "Inquiry status updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update inquiry status" });
  }
});
  
router.delete("/inquiries/:id", validateId, handleValidationErrors, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute(
      "DELETE FROM inquiries WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: " Inquiry not found" });
    res.json({ message: "Inquiry deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;