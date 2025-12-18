import { body, validationResult, param, query } from 'express-validator';
import { sanitize } from 'express-mongo-sanitize';

// Sanitize input to prevent NoSQL injection
export const sanitizeInput = sanitize();


// ======================
// AUTH VALIDATIONS
// ======================


export const validateEmail = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),
];

export const validateRegister = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces')
    .escape(),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces')
    .escape(),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email is too long'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  body('keepMeSignedIn')
    .optional()
    .isBoolean()
    .withMessage('Keep me signed in must be true or false')
];

export const validateResendVerification = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email is too long')
];


// ======================
// CONTACT VALIDATIONS
// ======================

export const validateContact = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('subject')
    .trim()
    .isIn(['general', 'account', 'listings', 'technical', 'other'])
    .withMessage('Please select a valid subject category'),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters')
];

// ======================
// PROFILE VALIDATIONS
// ======================

export const validateProfile = [
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters')
    .matches(/^[\+]?[0-9\s\-\(\)]+$/)
    .withMessage('Phone number can only contain digits, spaces, hyphens, parentheses, and optional + prefix'),
  
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),
  
  body('gender')
    .optional()
    .trim()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other')
];

export const validateProfilePhoto = [
  body('profile_image')
    .trim()
    .custom(value => {
      try {
        const url = new URL(value);
        if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
          throw new Error('URL must use https in production');
        }
        return true;
      } catch {
        throw new Error('Invalid URL');
      }
    })
    .withMessage('Profile image must be a valid URL')
];


export const validatePasswordReset = [  
  body('newPasswordValue')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-\[\]{};:'",.<>\/\\|`~])[A-Za-z\d@$!%*?&#^()_+=\-\[\]{};:'",.<>\/\\|`~]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];


// ======================
// ID VALIDATIONS
// ======================

export const validateId = [
  param(['id'])
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
];


// ======================
// PROPERTIES VALIDATIONS
// ======================

export const validateSavedSearch = [
  body('category')
    .isIn(['Sale', 'Rent', 'Sold'])
    .withMessage('Listing mode must be Sale, Rent, or Sold'),
  body('filters')
    .isObject()
    .withMessage('Filters must be an object'),
  body('filters.search')
    .optional()
    .isString(),
  body('filters.property_type')
    .optional()
    .isString(),
  body('filters.price_min')
    .optional()
    .isNumeric(),
  body('filters.price_max')
    .optional()
    .isNumeric(),
  body('filters.bedrooms_min')
    .optional()
    .isInt(),
  body('filters.bedrooms_max')
    .optional()
    .isInt(),
  body('filters.bathrooms_min')
    .optional()
    .isNumeric(),
  body('filters.bathrooms_max')
    .optional()
    .isNumeric()
];


// ======================
// INQUIRIES VALIDATIONS
// ======================

export const validateInquiry = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .matches(/^\+?[0-9\s\-]{1,15}$/)
    .withMessage('Please input a valid phone number'),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters')
];



// ======================
// ADMIN USER MANAGEMENT VALIDATIONS
// ======================

export const validateAdminUsersQuery = [
  query('q')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),
  
  query('role')
    .optional({ checkFalsy: true })
    .isIn(['Buyer', 'Admin', 'Super Admin'])
    .withMessage('Role must be Buyer, Admin, or Super Admin'),
  
  query('sort')
    .optional()
    .isIn(['created_asc', 'created_desc'])
    .withMessage('Sort must be created_asc or created_desc')
];

export const validateUsersExport = [
  query('format')
    .optional()
    .isIn(['csv', 'pdf'])
    .withMessage('Format must be either csv or pdf'),

  query('q')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query too long'),

  query('role')
    .optional()
    .isIn(['Buyer', 'Admin', 'Super Admin'])
    .withMessage('Invalid role filter'),

  query('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Invalid gender filter'),
];

export const validateAdminUserUpdate = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'), 
  
  body('role')
    .isIn(['Buyer', 'Admin', 'Super Admin'])
    .withMessage('Role must be user, admin, or super_admin')
];

export const validateUserStatus = [
  body('action')
    .isIn(['activate', 'deactivate', 'suspend'])
    .withMessage('Action must be activate, deactivate, or suspend')
];

export const validateAdminSendEmail = [
  body('subject')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Subject must be between 3 and 200 characters'),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Message must be between 10 and 5000 characters')
];


// ======================
// ADMIN PROPERTIES VALIDATIONS
// ======================

export const validatePropertiesId = [
  param(['id'])
    .matches(/^\d{8}$/)
    .withMessage('Properties ID must be 8 digits')
];

export const validatePropertyIdParam = [
  param('propertyId')
    .matches(/^\d{8}$/)
    .withMessage('Property ID must be 8 digits')
];

export const validatePropertiesExport = [
  query('format')
    .optional()
    .isIn(['csv', 'pdf'])
    .withMessage('Format must be csv or pdf'),
  query('q')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search term too long'),
  query('status')
    .optional()
    .isIn(['Available', 'Sold', 'Rented', ''])
    .withMessage('Invalid status'),
  query('property_type')
    .optional()
    .isIn(['Single Family', 'Town House', 'Multi Family', 'Modular Home', 'Bungalow', 'Ranch Home', 'Condominium', ''])
    .withMessage('Invalid property type')
];

export const validateProperties = [
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must not exceed 5000 characters'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  
  body('image_url')
    .optional()
    .trim()
    .custom(value => {
      try {
        const url = new URL(value);
        if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
          throw new Error('URL must use https in production');
        }
        return true;
      } catch {
        throw new Error('Invalid URL');
      }
    })
    .withMessage('Image URL must be a valid URL')
];

export const validatePropertyImages = [
  body('property_id')
    .isInt()
    .withMessage('Property ID must be a valid integer'),
  body('image_urls')
    .isArray({ min: 1 })
    .withMessage('At least one image URL is required'),
  body('image_urls.*')
    .trim()
    .custom(value => {
      try {
        const url = new URL(value);
        if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
          throw new Error('URL must use https in production');
        }
        return true;
      } catch {
        throw new Error('Invalid URL');
      }
    })
    .withMessage('Each image must be a valid URL'),
  body('primary_index')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Primary index must be a valid integer')
];

export const validatePropertyImageId = [
  param('imageId')
    .isInt()
    .withMessage('Image ID must be valid')
];


// ======================
// ADMIN INQUIRY MANAGEMENT VALIDATIONS
// ======================

export const validateInquiryQuery = [
  query('q')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),
  
  query('request_tour')
    .optional({ checkFalsy: true })
    .isIn(['1', '0'])
    .withMessage('Request tour must be 1, or 0'),
  
  query('inquiry_status')
    .optional({ checkFalsy: true })
    .isIn(['new', 'pending', 'handled'])
    .withMessage('Status must be new, pending, or handled'),
  
  query('sort')
    .optional()
    .isIn(['created_asc', 'created_desc'])
    .withMessage('Sort must be created_asc or created_desc')
];

export const validateInquiriesExport = [
  query('format')
    .optional()
    .isIn(['csv', 'pdf'])
    .withMessage('Format must be either csv or pdf'),

  query('q')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),

  query('request_tour')
    .optional({ checkFalsy: true })
    .isIn(['1', '0'])
    .withMessage('Request tour must be 1, or 0'),
  
  query('inquiry_status')
    .optional({ checkFalsy: true })
    .isIn(['new', 'pending', 'handled'])
    .withMessage('Status must be new, pending, or handled'),
];

export const validateInquiryStatusUpdate = [
  body('status')
    .isIn(['new', 'pending', 'handled'])
    .withMessage('Invalid inquiry status'),
];


// ======================
// ADMIN NOTIFICATION VALIDATIONS
// ======================


export const validateAdminNotificationsQuery = [
  query('q')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),
  
  query('status')
    .optional()
    .isIn(['all', 'draft', 'sent', 'scheduled', 'cancelled'])
    .withMessage('Invalid status. Must be: all, draft, sent, or scheduled'),
  
  query('category')
    .optional()
    .isIn(['all', 'general', 'saved_listings', 'marketing_emails'])
    .withMessage('Invalid category. Must be: all, general, saved_listings, or marketing_emails'),
  
  query('sortBy')
    .optional()
    .isIn(['created_at', 'sent_at', 'status', 'category', 'total_recipients'])
    .withMessage('Invalid sortBy field. Must be: created_at, sent_at, status, category, or total_recipients'),
  
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Invalid sortOrder. Must be: ASC or DESC')
    .customSanitizer(value => value ? value.toUpperCase() : 'DESC')
];

export const validateAdminNotification = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
  
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['general', 'saved_listings', 'marketing_emails'])
    .withMessage('Invalid category. Must be: general, saved_listings, or marketing_emails'),
  
  body('target_all_users')
    .optional()
    .isBoolean().withMessage('target_all_users must be a boolean'),
  
  body('target_user_roles')
    .optional()
    .isArray()
    .withMessage('target_user_roles must be an array'),
    
  body('target_user_roles.*')
    .optional()
    .isIn(['buyer', 'admin', 'super_admin'])
    .withMessage('Each role must be buyer, admin, or super_admin'),
];

export const validateNotificationExport = [
  query('format')
    .optional()
    .isIn(['csv', 'pdf'])
    .withMessage('Format must be either csv or pdf'),

  query('q')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),

  query('status')
    .optional()
    .isIn(['all', 'draft', 'sent', 'scheduled', 'cancelled'])
    .withMessage('Invalid status. Must be: all, draft, sent, or scheduled'),
  
  query('category')
    .optional()
    .isIn(['all', 'general', 'saved_listings', 'marketing_emails'])
    .withMessage('Invalid category. Must be: all, general, saved_listings, or marketing_emails'),
];


// ======================
// ADMIN CONTACT/SUPPORT VALIDATIONS
// ======================

export const validateAdminContactQuery = [
  query('status')
    .optional()
    .isIn(['all', 'pending', 'in_progress', 'resolved', 'closed'])
    .withMessage('Status must be all, pending, in_progress, resolved, or closed'),
  
  query('subject')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Subject must not exceed 100 characters'),
  
  query('priority')
    .optional()
    .isIn(['all', 'low', 'normal', 'high', 'urgent'])
    .withMessage('Priority must be all, low, normal, high, or urgent'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),
  
  query('sortBy')
    .optional()
    .isIn(['created_at', 'updated_at', 'priority', 'status', 'subject'])
    .withMessage('sortBy must be created_at, updated_at, priority, status, or subject'),
  
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('sortOrder must be ASC or DESC')
];

export const validateAdminContactExport = [
    query('status')
      .optional()
      .isIn(['all', 'pending', 'in_progress', 'resolved', 'closed'])
      .withMessage('Status must be all, pending, in_progress, resolved, or closed'),
    
    query('subject')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Subject must not exceed 100 characters'),
    
    query('priority')
      .optional()
      .isIn(['all', 'low', 'normal', 'high', 'urgent'])
      .withMessage('Priority must be all, low, normal, high, or urgent'),
    
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search query must not exceed 100 characters'),
];

export const validateContactSubmissionUpdate = [
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'resolved', 'closed'])
    .withMessage('Status must be pending, in_progress, resolved, or closed'),
  
  body('admin_notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Admin notes must not exceed 1000 characters'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Priority must be low, normal, high, or urgent')
];


// ======================
// ADMIN PASSWORD VALIDATIONS
// ======================

export const validatePasswordChange = [
  body('oldPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-\[\]{};:'",.<>\/\\|`~])[A-Za-z\d@$!%*?&#^()_+=\-\[\]{};:'",.<>\/\\|`~]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];



// ======================
// VALIDATION ERROR HANDLER
// ======================

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};


export const validatePagination = (req, res, next) => {
  let { page, limit } = req.query;

  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 10;
  if (limit > 100) limit = 100;

  req.pagination = {
    page,
    limit,
    offset: (page - 1) * limit
  };

  next();
};