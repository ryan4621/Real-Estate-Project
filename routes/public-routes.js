import express from 'express';
import pool from '../database.js';
import jwt from "jsonwebtoken";
import { countries } from "countries-list";
import { sendInquiryConfirmationEmail, sendInquiryNotificationToAdmin, sendInquiryToAgent, sendPreApprovalVerificationEmail } from '../middleware/email-service.js';
import { validatePagination, validatePropertiesId, handleValidationErrors } from '../middleware/validation.js';
import { applySearch, applyFilters, applyPagination, applySorting } from '../utils/query-helpers.js';

const router = express.Router()

router.get("/countries", (req, res) => {
	const countryList = Object.values(countries).map((c) => c.name);
	res.json(countryList);
});

router.get('/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

router.post('/inquiries/:id', async (req, res) =>  {
	try {
    const { id } = req.params
		const { userId, name, email, phone, message, isChecked, agentEmail } = req.body || {};

    if (!name ||!email || !phone || !message){
      return res.status(400).json({message: "Fill in all fields"})
    }

    console.log("property ID:", id)

    // Insert inquiry submission
    const [result] = await pool.execute(
      `INSERT INTO inquiries (property_id, user_id, name, email, phone, message, request_tour)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId || null, name, email, phone, message, isChecked]
    );

    const inquiryId = result.insertId;

    // Get user info if logged in (for better email context)
    let userInfo = null;
    if (userId) {
      const [userRows] = await pool.execute(
        "SELECT first_name, last_name, email as user_email FROM users WHERE id = ?",
        [userId]
      );
      userInfo = userRows[0] || null;
    }

    let adminEmail = [];
    const [rows] = await pool.execute(
      "SELECT role, email FROM users"
    );

    // Filter only admins and super admins
    const filtered = rows.filter(
      (u) => u.role === "Admin" || u.role === "Super_Admin"
    );

    // Extract emails
    adminEmail = filtered.map((u) => u.email);

    // Send emails
    try {
      await sendInquiryConfirmationEmail(name, email, inquiryId, message, isChecked);
      await sendInquiryNotificationToAdmin(name, email, inquiryId, message, isChecked, userInfo, adminEmail);
      await sendInquiryToAgent(name, email, inquiryId, message, isChecked, agentEmail, id);
    } catch (emailError) {
      console.error("Failed to send emails:", emailError);
      // Don't fail the request if emails fail
    }

    res.status(201).json({
      success: true,
      message: "Your inquiry has been sent successfully. You will receive a response within 24 hours.",
      data: {
        inquiryId,
        isChecked,
        estimatedResponse: isChecked ? "5-8 hours" : "12-24 hours",
      },
    });

    // // Log activity if user is logged in
    // if (userId) {
    //   try {
    //     await pool.execute(
    //       `INSERT INTO activity_logs (user_id, activity_type, description, ip_address, device_info)
    //         VALUES (?, ?, ?, ?, ?)`,
    //       [
    //         userId,
    //         "contact_submission",
    //         `Contact form submitted: ${subject}`,
    //         req.ip || req.connection.remoteAddress,
    //         req.headers["user-agent"] || "Unknown Device",
    //       ]
    //     );
    //   } catch (logError) {
    //     console.error("Failed to log contact activity:", logError);
    //   }
    // }
	} catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send inquiry" });
  }
});

router.get('/properties/for-sale', validatePagination, async (req, res) =>{
  try {

    const { page, limit, offset } = req.pagination;
    const { q, property_type, min_price, max_price, min_bedrooms, max_bedrooms, min_bathrooms, max_bathrooms, sort } = req.query;

    // Base query
    let baseQuery = `
      SELECT property_id, property_type, status, price, price_per_sqft, garage_space, year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, city, state, zip, country, agent_name, broker
      FROM properties WHERE status = 'Sale'
    `;
    let params = [];

    // 1️⃣ Apply search (optional)
    if (q) {
      const searchResult = applySearch(baseQuery, q, [
        "CONCAT(street_number, ' ', street_name, ' ', city, ', ', state, ' ', zip)", "status", "price", "city", "state", "zip", "country", "street_number", "street_name", "area", "bedrooms", "bathrooms", "year_built", "garage_space", "property_type", "agent_name", "agent_email", "broker"
      ]);
      baseQuery = searchResult.query;
      params = [...searchResult.params];
    }

    // 2️⃣ Apply filters (optional)
    const filterResult = applyFilters(baseQuery, { property_type, min_price, max_price, min_bedrooms, max_bedrooms, min_bathrooms, max_bathrooms });
    baseQuery = filterResult.query;
    params = [...params, ...filterResult.params];

    const sortClause = applySorting(baseQuery, sort);

    // 3️⃣ Get total count for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM (${baseQuery}) AS total_properties`,
      params
    );
    const total = countRows[0].total;

    // 4️⃣ Apply pagination
    // const paginatedQuery = applyPagination(baseQuery, page, limit);
    const paginatedQuery = `${baseQuery} ${sortClause} ${applyPagination('', page, limit).replace('SELECT * FROM', '').trim()}`;

    // 5️⃣ Fetch paginated data
    const [rows] = await pool.execute(paginatedQuery, params);

    res.json({
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get('/properties/for-rent', validatePagination, async (req, res) =>{
  try {

    const { page, limit, offset } = req.pagination;
    const { q, property_type, min_price, max_price, min_bedrooms, max_bedrooms, min_bathrooms, max_bathrooms, sort } = req.query;

    // Base query
    let baseQuery = `
      SELECT property_id, property_type, status, price, price_per_sqft, garage_space, year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, city, state, zip, country, agent_name, broker
      FROM properties WHERE status = 'Rent'
    `;
    let params = [];

    // 1️⃣ Apply search (optional)
    if (q) {
      const searchResult = applySearch(baseQuery, q, [
        "CONCAT(street_number, ' ', street_name, ' ', city, ', ', state, ' ', zip)", "status", "price", "city", "state", "zip", "country", "street_number", "street_name", "area", "bedrooms", "bathrooms", "year_built", "garage_space", "property_type", "agent_name", "agent_email", "broker"
      ]);
      baseQuery = searchResult.query;
      params = [...searchResult.params];
    }

    // 2️⃣ Apply filters (optional)
    const filterResult = applyFilters(baseQuery, { property_type, min_price, max_price, min_bedrooms, max_bedrooms, min_bathrooms, max_bathrooms });
    baseQuery = filterResult.query;
    params = [...params, ...filterResult.params];

    const sortClause = applySorting(baseQuery, sort);

    // 3️⃣ Get total count for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM (${baseQuery}) AS total_properties`,
      params
    );
    const total = countRows[0].total;

    // 4️⃣ Apply pagination
    // const paginatedQuery = applyPagination(baseQuery, page, limit);
    const paginatedQuery = `${baseQuery} ${sortClause} ${applyPagination('', page, limit).replace('SELECT * FROM', '').trim()}`;

    // 5️⃣ Fetch paginated data
    const [rows] = await pool.execute(paginatedQuery, params);

    res.json({
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get('/properties/sold', validatePagination, async (req, res) =>{
  try {

    const { page, limit, offset } = req.pagination;
    const { q, property_type, min_price, max_price, min_bedrooms, max_bedrooms, min_bathrooms, max_bathrooms, sort } = req.query;

    // Base query
    let baseQuery = `
      SELECT property_id, property_type, status, price, price_per_sqft, garage_space, year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, city, state, zip, country, agent_name, broker
      FROM properties WHERE status = 'Sold'
    `;
    let params = [];

    // 1️⃣ Apply search (optional)
    if (q) {
      const searchResult = applySearch(baseQuery, q, [
        "CONCAT(street_number, ' ', street_name, ' ', city, ', ', state, ' ', zip)", "status", "price", "city", "state", "zip", "country", "street_number", "street_name", "area", "bedrooms", "bathrooms", "year_built", "garage_space", "property_type", "agent_name", "agent_email", "broker"
      ]);
      baseQuery = searchResult.query;
      params = [...searchResult.params];
    }

    // 2️⃣ Apply filters (optional)
    const filterResult = applyFilters(baseQuery, { property_type, min_price, max_price, min_bedrooms, max_bedrooms, min_bathrooms, max_bathrooms });
    baseQuery = filterResult.query;
    params = [...params, ...filterResult.params];

    const sortClause = applySorting(baseQuery, sort);

    // 3️⃣ Get total count for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM (${baseQuery}) AS total_properties`,
      params
    );
    const total = countRows[0].total;

    // 4️⃣ Apply pagination
    // const paginatedQuery = applyPagination(baseQuery, page, limit);
    const paginatedQuery = `${baseQuery} ${sortClause} ${applyPagination('', page, limit).replace('SELECT * FROM', '').trim()}`;

    // 5️⃣ Fetch paginated data
    const [rows] = await pool.execute(paginatedQuery, params);

    res.json({
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/properties/:id", validatePropertiesId, handleValidationErrors, async (req, res) => {
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

router.get("/properties/:id/images", validatePropertiesId, handleValidationErrors, async (req, res) => {
  const id = req.params.id;

  if (!/^\d{8}$/.test(id)) {
    return res.status(400).json({ message: "Invalid property ID" });
  }
  
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM properties_images WHERE property_id = ? AND image_url NOT LIKE '%.mp4' AND image_url NOT LIKE '%.mov' AND image_url NOT LIKE '%.avi'",
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

router.get('/home/properties', async (req, res) => {
  try {

    const property_type = req.query.key

    if(property_type === "featured"){
      const [featured] = await pool.execute(`
        SELECT property_id, property_type, status, price, price_per_sqft, garage_space, year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, city, state, zip, country, agent_name, broker
        FROM properties WHERE status = 'Sale' AND state = 'California' AND city = 'Los Angeles'
      `)
  
      if (featured.length === 0){
        console.log('Featured properties not found.')
        return res.status(404).json({message: "Featured properties not found"})
      }

      return res.status(201).json({
        success: true,
        data: featured
      })

    }else {
      const [latest] = await pool.execute(`
        SELECT property_id, property_type, status, price, price_per_sqft, garage_space, year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, city, state, zip, country, agent_name, broker
        FROM properties WHERE status = 'Sale' AND created_at >= NOW() - INTERVAL 45 DAY
      `)

      if(latest.length === 0){
        return res.status(404).json({message: "Latest properties not found"})
      }

      return res.status(201).json({
        success: true,
        data: latest
      })
    }

  }catch(error){
    console.error("Error getting properties:", error)
    res.status(500).json({message: "Failed to get properties"})
  }
})

router.get('/buy/properties', async (req, res) => {
  try {

    const property_type = req.query.key

    if(property_type === "expensive"){
      const [expensive] = await pool.execute(`
        SELECT property_id, property_type, status, price, price_per_sqft, garage_space, year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, city, state, zip, country, agent_name, broker
        FROM properties WHERE price >= '1300000' AND status = 'Sale'
      `)
  
      if (expensive.length === 0){
        console.log('Expensive properties not found.')
        return res.status(404).json({message: "Expensive properties not found"})
      }

      return res.status(201).json({
        success: true,
        data: expensive
      })

    }else if(property_type === "latest"){
      const [latest] = await pool.execute(`
        SELECT property_id, property_type, status, price, price_per_sqft, garage_space, year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, city, state, zip, country, agent_name, broker
        FROM properties WHERE status = 'Sale' AND created_at >= NOW() - INTERVAL 45 DAY
      `)

      if(latest.length === 0){
        return res.status(404).json({message: "Latest properties not found"})
      }

      return res.status(201).json({
        success: true,
        data: latest
      })

    }else if(property_type === "affordable"){
      const [affordable] = await pool.execute(`
        SELECT property_id, property_type, status, price, price_per_sqft, garage_space, year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, city, state, zip, country, agent_name, broker
        FROM properties WHERE status = 'Sale' AND price <= '900000'
      `)

      if(affordable.length === 0){
        return res.status(404).json({message: "Affordable properties not found"})
      }

      return res.status(201).json({
        success: true,
        data: affordable
      })

    }else {
      const [openHouses] = await pool.execute(`
        SELECT p.property_id, p.property_type, p.status, p.price, p.price_per_sqft, p.garage_space, 
          p.year_built, p.bedrooms, p.bathrooms, p.area, p.acre_lot, 
          p.street_number, p.street_name, p.city, p.state, p.zip, 
          p.country, p.agent_name, p.broker
        FROM properties p
        INNER JOIN open_houses o ON p.property_id = o.property_id
      `)

      if(openHouses.length === 0){
        return res.status(404).json({message: "Open houses properties not found"})
      }

      return res.status(201).json({
        success: true,
        data: openHouses
      })
    }

  }catch(error){
    console.error("Error getting properties:", error)
    res.status(500).json({message: "Failed to get properties"})
  }
})

router.get('/rent/properties', async (req, res) => {
  try {
    const property_type = req.query.key
    
    if(property_type === "pet-friendly"){
      const [petFriendlyRentals] = await pool.execute(`
        SELECT p.property_id, p.property_type, p.status, p.price, p.price_per_sqft, p.garage_space, 
          p.year_built, p.bedrooms, p.bathrooms, p.area, p.acre_lot, 
          p.street_number, p.street_name, p.city, p.state, p.zip, 
          p.country, p.agent_name, p.broker
        FROM properties p
        INNER JOIN amenities a ON p.property_id = a.property_id
        WHERE p.status = 'Rent' AND a.pets_allowed = TRUE
      `)
      
      if (petFriendlyRentals.length === 0){
        console.log('Pet-friendly rentals not found.')
        return res.status(404).json({message: "Pet-friendly rentals not found"})
      }
      
      return res.status(200).json({
        success: true,
        data: petFriendlyRentals
      })
    } else if(property_type === "latest"){
      const [latest] = await pool.execute(`
        SELECT property_id, property_type, status, price, price_per_sqft, garage_space, 
          year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, 
          city, state, zip, country, agent_name, broker
        FROM properties WHERE status = 'Rent' AND created_at >= NOW() - INTERVAL 45 DAY
      `)
      
      if(latest.length === 0){
        return res.status(404).json({message: "Latest rentals not found"})
      }
      
      return res.status(200).json({
        success: true,
        data: latest
      })
      
    } else if(property_type === "single-family"){
      const [singleFamily] = await pool.execute(`
        SELECT property_id, property_type, status, price, price_per_sqft, garage_space, 
          year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, 
          city, state, zip, country, agent_name, broker
        FROM properties WHERE status = 'Rent' AND property_type = 'Single Family Home'
      `)
      
      if(singleFamily.length === 0){
        return res.status(404).json({message: "Single family rentals not found"})
      }
      
      return res.status(200).json({
        success: true,
        data: singleFamily
      })
      
    } else if(property_type === "pools") {
      const [poolsRentals] = await pool.execute(`
        SELECT p.property_id, p.property_type, p.status, p.price, p.price_per_sqft, p.garage_space, 
          p.year_built, p.bedrooms, p.bathrooms, p.area, p.acre_lot, 
          p.street_number, p.street_name, p.city, p.state, p.zip, 
          p.country, p.agent_name, p.broker
        FROM properties p
        INNER JOIN amenities a ON p.property_id = a.property_id
        WHERE p.status = 'Rent' AND a.swimming_pool = TRUE
      `)
      
      if(poolsRentals.length === 0){
        return res.status(404).json({message: "Rentals with pools not found"})
      }
      
      return res.status(200).json({
        success: true,
        data: poolsRentals
      })
    } else {
      return res.status(400).json({message: "Invalid property type"})
    }
    
  } catch(error){
    console.error("Error getting properties:", error)
    res.status(500).json({message: "Failed to get properties"})
  }
})

router.get('/sell/properties', async (req, res) => {
  try {

    const [sold] = await pool.execute(`
      SELECT property_id, property_type, status, price, price_per_sqft, garage_space, year_built, bedrooms, bathrooms, area, acre_lot, street_number, street_name, city, state, zip, country, agent_name, broker, updated_at
      FROM properties WHERE status = 'Sold' AND created_at >= NOW() - INTERVAL 45 DAY
    `)

    if (sold.length === 0){
      return res.status(404).json({message: "Sold properties not found"})
    }

    return res.status(201).json({
      success: true,
      data: sold
    })

  }catch(error){
    console.error("Error getting sold properties:", error)
    res.status(500).json({message: "Failed to get sold properties"})
  }
})

router.get("/properties/:id/amenities", async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM amenities WHERE property_id = ?",
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "No amenities found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch amenities" });
  }
});


const FIXED_RATE = 0.065;
const LOAN_TERM_YEARS = 30;
const MONTHLY_RATE = FIXED_RATE / 12;
const TOTAL_PAYMENTS = LOAN_TERM_YEARS * 12;

const ANNUAL_TI_PERCENTAGE = 0.017; 

// Conventional lending ratios
const FRONT_END_RATIO = 0.28;
const BACK_END_RATIO = 0.36;

// Down Payment Requirements
const DOWN_PAYMENT_MIN_PERCENT = 0.05;

/**
 * @param {number} loanAmount - The principal amount of the loan.
 * @returns {number} The monthly PI payment.
 */

function calculateRequiredPI(loanAmount) {
  if (loanAmount <= 0) return 0;
  const powerTerm = Math.pow(1 + MONTHLY_RATE, TOTAL_PAYMENTS);
  return loanAmount * (MONTHLY_RATE * powerTerm) / (powerTerm - 1);
}

function findMaxAffordablePrice(maxPITI, availableFunds, isVA) {
  const MAX_SEARCH_PRICE = 5000000;
  const dpMinPercent = isVA ? 0 : DOWN_PAYMENT_MIN_PERCENT;
  let maxAffordablePrice = 0;

  for (let loanAmount = 100000; loanAmount <= MAX_SEARCH_PRICE; loanAmount += 1000) {
    const estimatedDownPayment = availableFunds;
    const currentHomePrice = loanAmount + estimatedDownPayment;

    if (estimatedDownPayment < (currentHomePrice * dpMinPercent)) {
      continue; 
    }

    const annualTI = currentHomePrice * ANNUAL_TI_PERCENTAGE;
    const monthlyTI = annualTI / 12;

    let monthlyMI = 0;
    const loanToValue = loanAmount / currentHomePrice;
    const isMIPRequired = (loanToValue > 0.8) && !isVA; 
    
    if (isMIPRequired) {
      monthlyMI = (loanAmount * 0.005) / 12;
    }

    const maxPI = maxPITI - monthlyTI - monthlyMI;
    const requiredPI = calculateRequiredPI(loanAmount);

    if (requiredPI <= maxPI) {
      maxAffordablePrice = currentHomePrice;
    } else {
      break; 
    }
  }
  
  return Math.round(maxAffordablePrice / 1000) * 1000; 
}

router.post('/affordability-calculator', (req, res) => {
    
  const { 
    annualIncome, 
    monthlyDebt, 
    availableFunds,
    militaryService
  } = req.body;

  // Use a fallback for militaryService if it wasn't sent (to prevent crash)
  const isVA = militaryService === true; 

  // Input Cleaning (safely remove commas)
  const income = parseFloat(annualIncome?.toString().replace(/,/g, '') || 0);
  const debt = parseFloat(monthlyDebt?.toString().replace(/,/g, '') || 0);
  const funds = parseFloat(availableFunds?.toString().replace(/,/g, '') || 0);

  if (isNaN(income) || isNaN(debt) || isNaN(funds) || income <= 0) {
    return res.status(400).json({ error: 'Invalid or missing numerical inputs.' });
  }

  const grossMonthlyIncome = income / 12;

  // 2. Define Max PITI Budgets
  const maxPITI_Affordable = grossMonthlyIncome * FRONT_END_RATIO;
  const maxPITI_Difficult = (grossMonthlyIncome * BACK_END_RATIO) - debt;

  if (maxPITI_Difficult <= 0) {
    return res.status(200).json({
      location: req.body.location || "Location",
      result_ranges: [],
      message: "Your debt-to-income ratio is too high for a mortgage."
    });
  }

  // 3. Calculate Max Home Prices
  const difficultMaxPrice = findMaxAffordablePrice(maxPITI_Difficult, funds, isVA);
  const affordableMaxPrice = findMaxAffordablePrice(maxPITI_Affordable, funds, isVA);

  // 4. Define the Tiers (using a conservative approach)

  const floorPrice = Math.round((funds) / 1000) * 1000; // Minimum based on available funds

  const stretchMaxPrice = affordableMaxPrice;

  // Define the Affordable max as 85% of the Stretch max, or the Stretch max, whichever is lower
  const affordableMaxRange = Math.min(stretchMaxPrice, Math.round(stretchMaxPrice * 0.85 / 1000) * 1000); 

  // --- Final Tiers Structure ---
  const result_ranges = [
    {
      label: "Affordable",
      min_price: floorPrice,
      max_price: Math.max(floorPrice, affordableMaxRange), // Ensure max is not below min
      budget_status: "Within your budget"
    },
    {
      label: "Stretch",
      min_price: affordableMaxRange + 1,
      max_price: stretchMaxPrice,
      budget_status: "Stretches your budget"
    },
    {
      label: "Difficult",
      min_price: stretchMaxPrice + 1,
      max_price: difficultMaxPrice,
      budget_status: "Likely beyond your budget"
    }
  ];

  // 5. Send the structured response
  res.json({
    location: req.body.location || "Unknown Location",
    result_ranges: result_ranges.filter(r => r.max_price > r.min_price), // Filter out non-existent ranges
  });

});

function generateEmailCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post('/pre-approval-email', async (req, res) => {
  try {
    const { name, email } = req.body

    // const verificationToken = crypto.randomBytes(32).toString('hex')
    // const codeExpires = new Date(Date.now() * 15 * 60 * 1000)
    // const verificationUrl = `${process.env.WEBSITE_URL}/auth/verify-email?token=${verificationToken}`;
    const verificationCode = generateEmailCode();
    const token = jwt.sign({ verificationCode }, process.env.JWT_SECRET, { expiresIn: "15m" });
    await sendPreApprovalVerificationEmail(email, name, verificationCode);

    res.status(201).json({
      message: "Verification code sent. Kindly check your email",
      email: email,
      token: token,
      // codeExpires: codeExpires
    })
  }catch(error){
    console.error("Error:", error)
    res.status(500).json({message: "Failed to send verification code. Please try again later."})
  }
});

router.post('/pre-approval', async (req, res) => {
  try {
    const { homeType, propertyUsage, location, buyingTimeline, workingWithAgent, currentlyOwnHome, planningToSellHome, firstTimeBuyer, militaryService, priceRangeMin, priceRangeMax, downPaymentAmount, downPaymentPercentage, employmentStatus, annualIncome, creditScore, bankruptcyForeclosure, firstName, lastName, email, token, code } = req.body;

    if (!code){
      return res.status(400).json({message: "Enter verification code"})
    }

    const [user] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);

    const userId = user[0].id

    const { verificationCode } = jwt.verify(token, process.env.JWT_SECRET);

    if (verificationCode !== code) {
      return res.status(401).json({ 
        invalidCode: true,
        message: "Invalid verification code" 
      });
    }

    // --- 3. DATA CONVERSION LAYER (MAPPING UI STRINGS TO NUMBERS) ---
    
    // 3a. Conversion Helper Functions (Must be defined outside this route function)
    const convertedData = {
      // Convert income and score ranges to conservative numeric values
      grossAnnualIncome: convertRangeToValue('income', annualIncome),
      creditScore: convertRangeToValue('credit', creditScore),
      downPaymentPercentage: parseInt(downPaymentPercentage) || 20 // Ensure it's a number
    };
  
    // 3b. Boolean Conversion (Converting 'Yes'/'No' strings to Booleans)
    const buyerQualifications = {
      isMilitaryVeteran: militaryService === 'Yes',
      currentHomeOwner: currentlyOwnHome.includes('Yes'),
      plansToSellCurrentHome: planningToSellHome === 'Yes'
    };


    // --- 4. EXECUTE CALCULATION ENGINE ---

    // Define the CONFIG object based on converted data
    const config = {
      loanTermYears: 30,
      baseAnnualTaxRate: 0.012,
      baseAnnualInsuranceRate: 0.005,
      frontEndRatio: 0.28,
      backEndRatio: (convertedData.grossAnnualIncome >= 100000) ? 0.43 : 0.36, 
      EST_CONSUMER_DEBT: 500, // Hardcoded consumer debt assumption
      EST_CURRENT_MORTGAGE: 1500 // Used ONLY if plansToSellCurrentHome is FALSE
    };
    
    // Create the final buyer object for the calculation function
    const calculationBuyerData = {
      grossAnnualIncome: convertedData.grossAnnualIncome,
      creditScore: convertedData.creditScore,
      downPaymentPercentage: convertedData.downPaymentPercentage,
      
      isMilitaryVeteran: buyerQualifications.isMilitaryVeteran,
      currentHomeOwner: buyerQualifications.currentHomeOwner,
      plansToSellCurrentHome: buyerQualifications.plansToSellCurrentHome, 
      propertyType: homeType,
      propertyUsage: propertyUsage
    };

    // Run the main calculation function
    const calculationResult = calculatePreApproval(calculationBuyerData, config, convertedData);

    // --- 5. DATABASE INSERTION (STORING THE LEAD AND THE RESULT) ---

    const { status, maxPurchasePrice, loanAmount, interestRate } = calculationResult;

    console.log(userId, homeType, propertyUsage, location, buyingTimeline, workingWithAgent, currentlyOwnHome, planningToSellHome, firstTimeBuyer, militaryService, priceRangeMin, priceRangeMax, downPaymentAmount, downPaymentPercentage, employmentStatus, annualIncome, creditScore, bankruptcyForeclosure, firstName, lastName, email, status, maxPurchasePrice, loanAmount,  interestRate)

    await pool.execute(`
      INSERT INTO pre_approvals (user_id, home_type, property_usage, location, buying_timeline,
      working_with_agent, currently_own_home, sell_current_home, first_time_buyer, military_service,
      price_range_min, price_range_max, down_payment_amount, down_payment_percentage,
      employment_status, annual_income, credit_score, bankruptcy_foreclosure,
      first_name, last_name, email, is_verified, result_status, max_purchase_price, max_loan_amount, estimated_interest_rate) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?, ?, ?)`,
      [userId || null, homeType, propertyUsage, location, buyingTimeline, workingWithAgent, currentlyOwnHome, planningToSellHome || null, firstTimeBuyer, militaryService, priceRangeMin, priceRangeMax, downPaymentAmount, downPaymentPercentage, employmentStatus, annualIncome, creditScore, bankruptcyForeclosure, firstName, lastName, email, status, maxPurchasePrice || null, loanAmount || null,  interestRate || null]
    );

    // --- 6. RETURN RESULT TO FRONTEND ---
    // If the calculation passed the DTI test, return the financial result.
    if (calculationResult.status === "APPROVED") {
      return res.status(200).json({ 
        success: true,
        message: "Pre-Approval Estimate Generated Successfully.",
        result: calculationResult
      });
    } else {
      // Handle DEFERRED or DECLINED status
      return res.status(200).json({
        success: false,
        message: "Your application requires a manual review.",
        result: calculationResult
      });
    }
  }catch (err) {
    console.error(err);
    if(err.name === "TokenExpiredError"){
      res.status(500).json({message: "Verification code has expired"})
    }else {
      res.status(500).json({ message: "Failed to submit pre-approval" });
    }
  }
});

function convertRangeToValue(key, selection) {
  if (key === 'income') {
    if (selection === "Greater than $100,000") return 100001;
    if (selection === "$75,000 - $100,000") return 75000;
    if (selection === "$50,000 - $75,000") return 50000;
    if (selection === "$30,000 - $50,000") return 30000;
    return 0; // Less than $30,000 or unselected
  } else if (key === 'credit') {
    if (selection === "Excellent (720+)") return 720;
    if (selection === "Good (680 to 719)") return 680;
    if (selection === "Fair (620 to 679)") return 620;
    return 580; // Poor (619 and below), using 580 as a typical loan floor
  }
  return 0;
}

// Helper function to get an assumed initial interest rate based on score
function getInterestRate(score, usage, propertyType) {
  let rate;
  if (score >= 720) rate = 0.065; // Excellent (using 720 floor)
  else if (score >= 680) rate = 0.070; // Good
  else if (score >= 620) rate = 0.080; // Fair
  else rate = 0.085; // Poor

  // Apply adjustments based on qualification
  if (usage === "Investment Property") {
    rate += 0.005; // +0.5% for investment risk
  }
  if (propertyType === "Condominium") {
    rate += 0.0025; // +0.25% for condo complexity
  }
  return rate;
}

// Calculate Monthly Mortgage Factor (P&I cost per dollar borrowed)
function getMortgageFactor(annualRate, years) {
  const r = annualRate / 12;
  const n = years * 12;
  return (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calculatePreApproval(buyer, cfg, converted) {
  // A. CALCULATE TOTAL DEBT (Dynamic Logic)
  let totalMonthlyDebt = cfg.EST_CONSUMER_DEBT;
  
  // Check if the current mortgage needs to be added to the debt load
  if (buyer.currentHomeOwner && !buyer.plansToSellCurrentHome) {
    totalMonthlyDebt += cfg.EST_CURRENT_MORTGAGE;
  }

  // B. APPLY LOAN WAIVERS & ADJUSTMENTS
  let downPaymentRequired = converted.downPaymentPercentage / 100;
  let pmiRate = (downPaymentRequired < 0.20) ? 0.005 : 0;

  if (buyer.isMilitaryVeteran) {
    // VA Loan: 0% Down, No PMI
    downPaymentRequired = 0;
    pmiRate = 0;
  }
  
  // C. DETERMINE MAX MONTHLY PAYMENT (THE BUDGET)
  const monthlyIncome = converted.grossAnnualIncome / 12;
  const annualRate = getInterestRate(converted.creditScore, buyer.propertyUsage, buyer.propertyType);

  // 1. Front-End Cap
  const maxHousingBudget = monthlyIncome * cfg.frontEndRatio;
  
  // 2. Back-End Cap (Uses the dynamically set 36% or 43%)
  const maxTotalBudget = (monthlyIncome * cfg.backEndRatio) - totalMonthlyDebt;
  
  // The Lender picks the LOWER of the two budgets
  const maxMonthlyPayment = Math.min(maxHousingBudget, maxTotalBudget);

  if (maxMonthlyPayment <= 0) {
    return { status: "DECLINED", reason: "DTI too high or debt exceeds income." };
  }

  // D. SOLVE FOR MAX PURCHASE PRICE (Algebraic Formula)
  const mortgageFactor = getMortgageFactor(annualRate, cfg.loanTermYears);
  const totalExpenseFactor = (cfg.baseAnnualTaxRate + cfg.baseAnnualInsuranceRate + pmiRate) / 12;

  // Price = MaxPayment / (MortgageFactor * (1 - DP_Ratio) + TotalExpenseFactor)
  const numerator = maxMonthlyPayment;
  const denominator = (mortgageFactor * (1 - downPaymentRequired)) + totalExpenseFactor;
  
  const maxPrice = numerator / denominator;
  const loanAmount = maxPrice * (1 - downPaymentRequired);

  // E. RETURN STRUCTURED RESULT
  return {
    status: "APPROVED",
    maxPurchasePrice: Math.floor(maxPrice),
    loanAmount: Math.floor(loanAmount),
    minDownPaymentNeeded: Math.floor(maxPrice * downPaymentRequired),
    interestRate: (annualRate * 100).toFixed(2) + "%",
    monthlyDebtIncluded: totalMonthlyDebt, 
    monthlyPaymentDetails: {
      total: Math.floor(maxMonthlyPayment),
      principalAndInterest: Math.floor(loanAmount * mortgageFactor),
      taxesInsurancePMI: Math.floor(maxPrice * totalExpenseFactor)
    }
  };
}

export default router;