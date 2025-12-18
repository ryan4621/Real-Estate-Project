import express from 'express';
import dotenv from 'dotenv';
import pool from '../../database.js';
import ImageKit from "imagekit";
import PDFDocument from 'pdfkit';
import { requireAdmin } from '../../middleware/authentication.js';
import { applyPagination, applySearch, applyFilters } from "../../utils/query-helpers.js";
import { validateProperties, validatePropertiesExport, validatePropertiesId, validatePropertyIdParam, validatePropertyImageId, validatePropertyImages, validatePagination, handleValidationErrors } from '../../middleware/validation.js'

const router = express.Router()
dotenv.config()

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC,
  privateKey: process.env.IMAGEKIT_PRIVATE,
  urlEndpoint: process.env.IMAGEKIT_URL,
});

function generatePropertyId() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function generateCSV(res, rows) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=properties-export-${Date.now()}.csv`);

  // CSV Headers
  res.write("Property ID,Property Type,Description,Status,Price,Price Per Sqft,Garage Space,Year Built,Bedrooms,Bathrooms,Area,Acre Lot,Street  Number,Street Name,City,State,Zip,Country,Latitude,Longitude,Agent Name,Agent Email,Broker,Created At,Updated At\n");
  
  // CSV Data
  rows.forEach(row => {
    const safe = val => {
      if (val === null || val === undefined) return "";
      return String(val).replace(/"/g, '""');
    };
    
    res.write(`"${safe(row.property_id)}","${safe(row.property_type)}","${safe(row.description)}","${safe(row.status)}","${safe(row.price)}","${safe(row.price_per_sqft)}","${safe(row.garage_space)}","${safe(row.year_built)}","${safe(row.bedrooms)}","${safe(row.bathrooms)}","${safe(row.area)}","${safe(row.acre_lot)}","${safe(row.street_number)}","${safe(row.street_name)}","${safe(row.city)}","${safe(row.state)}","${safe(row.zip)}","${safe(row.country)}","${safe(row.latitude)}","${safe(row.longitude)}","${safe(row.agent_name)}","${safe(row.agent_email)}","${safe(row.broker)}","${safe(row.created_at)}","${safe(row.updated_at)}"\n`);
  });
  
  res.end();
}

export function generatePDF(res, rows, filters = {}) {
  // Set response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=properties-export-${Date.now()}.pdf`
  );

  // Create a PDF document
  const doc = new PDFDocument({ size: [2000, 842], margin: 40, layout: 'landscape' });

  // Pipe PDF directly to response
  doc.pipe(res);

  // Document title
  doc.fontSize(16).text("Properties Export Report", { align: 'center' });
  doc.moveDown();

  // Generated info
  doc.fontSize(10)
    .text(`Generated: ${new Date().toLocaleString()}`)
    .text(`Total Properties: ${rows.length}`)
    .text(`Filters Applied: ${Object.keys(filters).length > 0 ? 'Yes' : 'None'}`)
    .moveDown();

  // Table headers
  const tableHeaders = [
    "ID", "Type", "Description", "Status", "Price", "Price/sqft", "Garage", "Year", "Bathrooms", "Bedrooms",
    "Area", "Acre Lot", "Street Number", "Street Name", "City", "State", "Zip", "Country", "Latitude", "Longitude",
    "Agent Name", "Agent Email", "Broker", "Created at", "Updated at"
  ];

  // Column widths (adjust as needed)
  const colWidths = [90, 90, 150, 50, 90, 90, 40, 40, 40, 40, 90, 70, 130, 60, 60, 90, 90, 90, 90, 120, 120, 150, 150];

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
      row.property_id, row.property_type, row.description, row.status, `$${row.price}`, `$${row.price_per_sqft}`, row.garage_space, row.year_built, row.bathrooms, row.bedrooms, `${row.area} sqft`,  row.acre_lot, row.street_number, row.street_name, row.city, row.state, row.zip, row.country, row.latitude, row.longitude, row.agent_name, row.agent_email, row.broker, row.created_at, row.updated_at
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

// --- Endpoint: Get signed upload token ---
router.get("/properties/upload-signature", (req, res) => {
	try{
		const { fileSize, fileType } = req.query;
  
		if (fileSize > 10 * 1024 * 1024) {
			return res.status(400).json({ message: "File too large" });
		}
	
		if (!["image/jpg", "image/jpeg", "image/png", "video/mp4", "video/mov"].includes(fileType)) {
			return res.status(400).json({ message: "Invalid file type" });
		}
	
		const authParams = imagekit.getAuthenticationParameters();
    console.log("Auth params:", authParams);

		res.json(authParams);

	}catch (error) {
    console.error("ImageKit signature error:", error);
    res.status(500).json({ message: "Failed to generate upload signature" });
  }
});

router.get("/properties", requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page, limit, offset } = req.pagination;
    const { q, status, property_type } = req.query;

    // Base query
    let baseQuery = `
      SELECT property_id, property_type, description, status, price, price_per_sqft, 
        garage_space, year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, 
        city, state, zip, country, latitude, longitude, agent_name, agent_email, 
        broker, created_at, updated_at
      FROM properties
    `;
    let params = [];

    // 1️⃣ Apply search (optional)
    if (q) {
      const searchResult = applySearch(baseQuery, q, [
        "property_id","description", "status", "price", "city", "state", "zip", "country", "street_number", "street_name", "area", "bedrooms", "bathrooms", "year_built", "garage_space", "property_type", "agent_name", "agent_email", "broker"
      ]);
      baseQuery = searchResult.query;
      params = [...searchResult.params];
    }

    // 2️⃣ Apply filters (optional)
    const filterResult = applyFilters(baseQuery, { status, property_type });
    baseQuery = filterResult.query;
    params = [...params, ...filterResult.params];

    // 3️⃣ Get total count for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM (${baseQuery}) AS total_properties`,
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
    console.error("Error getting properties:", error);
    res.status(500).json({ message: "Error getting properties" });
  }
});

router.get("/properties/export", validatePropertiesExport, handleValidationErrors, requireAdmin, async (req, res) => {
  try {
    const { format = 'csv', q, status, property_type } = req.query;

    // Base query - same as your GET /properties but without pagination
    let baseQuery = `
      SELECT property_id, property_type, description, status, price, price_per_sqft, 
        garage_space, year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, 
        city, state, zip, country, latitude, longitude, agent_name, agent_email, 
        broker, created_at, updated_at
      FROM properties
    `;
    let params = [];

    // Apply search (same logic as main route)
    if (q) {
      const searchResult = applySearch(baseQuery, q, [
        "description", "status", "price", "city", "state", "zip", "country", "street_number", "street_name", 
        "area", "bedrooms", "bathrooms", "year_built", "garage_space", 
        "property_type", "agent_name", "agent_email", "broker"
      ]);
      baseQuery = searchResult.query;
      params = [...searchResult.params];
    }

    // Apply filters
    if (q && (status || property_type)) {
      const filterKeys = [];
      const filterValues = [];
      if (status) {
        filterKeys.push('status = ?');
        filterValues.push(status);
      }
      if (property_type) {
        filterKeys.push('property_type = ?');
        filterValues.push(property_type);
      }
      baseQuery += ` AND ${filterKeys.join(' AND ')}`;
      params = [...params, ...filterValues];
    } else if (!q && (status || property_type)) {
      const filterResult = applyFilters(baseQuery, { status, property_type });
      baseQuery = filterResult.query;
      params = [...params, ...filterResult.params];
    }

    baseQuery += ' ORDER BY created_at DESC';

    // Fetch all filtered data (no pagination)
    const [rows] = await pool.execute(baseQuery, params);

    if (format === 'pdf') {
      generatePDF(res, rows, {q, status, property_type});
    } else {
      generateCSV(res, rows);
    }
  } catch (error) {
    console.error('Error exporting properties:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to export data" 
    });
  }
});

router.get("/properties/:id", validatePropertiesId, handleValidationErrors, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!/^\d{8}$/.test(id)) {
    return res.status(400).json({ message: "Invalid property ID" });
  }
  
  try {
    const [rows] = await pool.execute(
      "SELECT property_id, property_type, description, status, price, price_per_sqft, garage_space, year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, city, state, zip, country, latitude, longitude, agent_name, agent_email, broker, created_at, updated_at FROM properties WHERE property_id = ?",
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Property not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch property" });
  }
});
  
router.post("/properties", validateProperties, handleValidationErrors, requireAdmin, async (req, res) => {
  try {
    const { propertyType, description, status, price, pricePerSqft, garageSpace, yearBuilt, bedrooms, bathrooms, area, acreLot, streetNumber, streetName, city, state, zip, country, latitude, longitude, agentName, agentEmail, broker } = req.body || {};

    const normalizedAcreLot = acreLot === '' ? null : acreLot;
    const normalizedLatitude = latitude === '' ? null : latitude;
    const normalizedLongitude = longitude === '' ? null : longitude;
    const normalizedBroker = broker === '' ? null : broker;

    if (!propertyType || typeof price === "undefined") {
      return res.status(400).json({ message: "Property type and price required" });
    }

    let propertyId;
    let inserted = false;

    while (!inserted) {
      propertyId = generatePropertyId();
      try {
        await pool.execute(
          "INSERT INTO properties (property_id, property_type, description, status, price, price_per_sqft, garage_space, year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, city, state, zip, country, latitude, longitude, agent_name, agent_email, broker, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [propertyId, propertyType, description, status, price, pricePerSqft, garageSpace, yearBuilt, bedrooms, bathrooms, area, normalizedAcreLot, streetNumber, streetName, city, state, zip, country, normalizedLatitude, normalizedLongitude, agentName, agentEmail, normalizedBroker ]
        );
        inserted = true;
      } catch (err) {
        if (err && err.code === "ER_DUP_ENTRY") continue; // collision, retry
        else throw err;
      }
    }

    res.status(201).json({ message: "Property created", id: propertyId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create property" });
  }
});

router.put("/properties/:id", validatePropertiesId, validateProperties, handleValidationErrors, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { propertyType, description, status, price, pricePerSqft, garageSpace, yearBuilt, bedrooms, bathrooms, area, acreLot, streetNumber, streetName, city, state, zip, country, latitude, longitude, agentName, agentEmail, broker } = req.body || {};

  if (!/^\d{8}$/.test(id)) {
    return res.status(400).json({ message: "Invalid property ID" });
  }

  try {
    const [result] = await pool.execute(

      `UPDATE properties SET property_type = ?, description = ?, status = ?, price = ?, price_per_sqft = ?, garage_space = ?, year_built = ?, bedrooms = ?, bathrooms = ?, area = ?, acre_lot = ?, street_number = ?, street_name = ?, city = ?, state = ?, zip = ?, country = ?, latitude = ?, longitude = ?, agent_name = ?, agent_email = ?, broker = ?, updated_at = NOW() WHERE property_id = ?`,
      [propertyType, description, status, price, pricePerSqft, garageSpace, yearBuilt, bedrooms, bathrooms, area, acreLot, streetNumber, streetName, city, state, zip, country, latitude, longitude, agentName, agentEmail, broker, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Property not found" });
    }

    console.log("Property updated successfully:", id);
    res.json({ message: "Property updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update property" });
  }
});
  
router.delete("/properties/:id", validatePropertiesId, handleValidationErrors, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute(
      "DELETE FROM properties WHERE property_id = ?",
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Properties not found" });
    res.json({ message: "Property deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/properties/:id/images", validatePropertiesId, validatePropertyImages, handleValidationErrors, requireAdmin,
  async (req, res) => {
    try {
      const propertyId = req.params.id;
      const { image_urls, primary_index, property_section } = req.body;

      // Verify property exists
      const [property] = await pool.execute(
        "SELECT property_id FROM properties WHERE property_id = ?",
        [propertyId]
      );

      if (property.length === 0) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Check if property already has a primary image
      const [existingPrimary] = await pool.execute(
        "SELECT id FROM properties_images WHERE property_id = ? AND is_primary = TRUE LIMIT 1",
        [propertyId]
      );
      
      const hasPrimary = existingPrimary.length > 0;
      
      // Insert all images
      const insertPromises = image_urls.map((url, index) => {
        // Only set is_primary if there's no existing primary image
        const isPrimary = !hasPrimary && index === (primary_index || 0);
        return pool.execute(
          "INSERT INTO properties_images (property_id, image_url, is_primary, property_section) VALUES (?, ?, ?, ?)",
          [propertyId, url, isPrimary, property_section]
        );
      });
      
      await Promise.all(insertPromises);

      res.status(201).json({
        success: true,
        message: hasPrimary 
          ? `${image_urls.length} image(s) uploaded successfully` 
          : `${image_urls.length} image(s) uploaded successfully (first image set as primary)`,
        count: image_urls.length,
        primary_set: !hasPrimary,
      });
    } catch (err) {
      console.error("Property images upload error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to upload property images"
      });
    }
  }
);

router.get("/properties/:id/images", validatePropertiesId, handleValidationErrors, requireAdmin, async (req, res) => {
  const id = req.params.id;
  if (!/^\d{8}$/.test(id)) {
    return res.status(400).json({ message: "Invalid property ID" });
  }
  
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM properties_images WHERE property_id = ?",
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json([]);
    }
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch property images" });
  }
});

router.patch("/properties/:propertyId/images/:imageId/primary", validatePropertyIdParam, validatePropertyImageId, handleValidationErrors, requireAdmin,
  async (req, res) => {
    try {
      const { propertyId, imageId } = req.params;

      // Verify image belongs to property
      const [image] = await pool.execute(
        "SELECT id, property_id FROM properties_images WHERE id = ? AND property_id = ?",
        [imageId, propertyId]
      );

      if (image.length === 0) {
        return res.status(404).json({ message: "Image not found for this property" });
      }

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Remove primary from all images of this property
        await connection.execute(
          "UPDATE properties_images SET is_primary = FALSE WHERE property_id = ?",
          [propertyId]
        );

        // Set new primary
        await connection.execute(
          "UPDATE properties_images SET is_primary = TRUE WHERE id = ?",
          [imageId]
        );

        await connection.commit();
        connection.release();

        res.json({ 
          success: true, 
          message: "Primary image updated successfully" 
        });
        
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (err) {
      console.error("Error updating primary image:", err);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update primary image" 
      });
    }
  }
);

router.delete("/properties/:propertyId/images/:imageId", validatePropertyIdParam, validatePropertyImageId, handleValidationErrors, requireAdmin,
  async (req, res) => {
    try {
      const { propertyId, imageId } = req.params;

      // Check if image exists and belongs to property
      const [image] = await pool.execute(
        "SELECT id, is_primary FROM properties_images WHERE id = ? AND property_id = ?",
        [imageId, propertyId]
      );

      if (image.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Image not found" 
        });
      }

      const wasPrimary = image[0].is_primary;

      // Delete the image
      await pool.execute(
        "DELETE FROM properties_images WHERE id = ?",
        [imageId]
      );

      // If deleted image was primary, set first remaining image as primary
      if (wasPrimary) {
        await pool.execute(
          `UPDATE properties_images 
           SET is_primary = TRUE 
           WHERE property_id = ? 
           ORDER BY created_at ASC 
           LIMIT 1`,
          [propertyId]
        );
      }

      res.json({ 
        success: true, 
        message: "Image deleted successfully" 
      });
    } catch (err) {
      console.error("Error deleting image:", err);
      res.status(500).json({ 
        success: false, 
        message: "Failed to delete image" 
      });
    }
  }
);

export default router;