// authentication.js
import jwt from "jsonwebtoken";
import pool from "../database.js"
// import { logError, determineSeverity } from '../utils/error-logger.js';

export async function requireAuth (req, res, next) {
  const token = req.cookies.REauthToken;
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if session still exists in database
    const [sessions] = await pool.execute(
      "SELECT id, session_token, expires_at, is_current FROM user_sessions WHERE user_id = ? AND session_token LIKE ? AND is_current = TRUE AND expires_at > NOW()",
      [decoded.id, token.substring(0, 50) + '%']
    );
    
    if (sessions.length === 0) {
      // Session was deleted or expired
      res.clearCookie('REauthToken');
      return res.status(401).json({ message: 'Session invalid or expired' });
    }

    req.user = decoded;
    
    next();
  } catch (err) {
    console.error('❌ requireAuth error:', err);
    return res.status(401).json({ message: 'Invalid authentication token' });
  }
};

export async function requireAdmin(req, res, next) {
  const token = req.cookies.REauthToken;
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session still exists in database
    const [sessions] = await pool.execute(
      "SELECT id FROM user_sessions WHERE user_id = ? AND session_token LIKE ? AND is_current = TRUE AND expires_at > NOW()",
      [decoded.id, token.substring(0, 50) + '%']
    );
    
    if (sessions.length === 0) {
      res.clearCookie('REauthToken');
      return res.status(401).json({ message: 'Session invalid or expired' });
    }
    
    req.user = decoded;
    
    // Role-based access check
    if (decoded.role === "Super_Admin" || decoded.role === "Admin") {
      return next();
    }
    
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired authentication token" });
  }
}

export async function requireSuperAdmin(req, res, next) {
  const token = req.cookies.REauthToken;
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session still exists in database
    const [sessions] = await pool.execute(
      "SELECT id FROM user_sessions WHERE user_id = ? AND session_token LIKE ? AND is_current = TRUE AND expires_at > NOW()",
      [decoded.id, token.substring(0, 50) + '%']
    );
    
    if (sessions.length === 0) {
      res.clearCookie('REauthToken');
      return res.status(401).json({ message: 'Session invalid or expired' });
    }
    
    req.user = decoded;
    
    // Check if user is a super admin
    if (decoded.role !== "Super_Admin") {
      return res.status(403).json({ message: "Forbidden: Super Admin access required" });
    }
    
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired authentication token" });
  }
}

// Export both for use in routes
export function checkAdminLevel(req) {
  const token = req.cookies.authToken;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return {
      id: payload.id,
      role: payload.role,
      isSuperAdmin: payload.role === 'super_admin',
      isAdmin: payload.role === 'admin' || payload.role === 'super_admin'
    };
  } catch (err) {
    return null;
  }
}

// Add this middleware to check user status on each authenticated request
export function checkUserStatus(req, res, next) {
  // Skip for login and public routes
  if (req.path === '/login' || 
    req.path === '/register' || 
    req.path.startsWith('/admin/')) {
    return next();
  }

  const token = req.cookies.authToken;
  if (!token) {
    return next(); // Let other auth middleware handle
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check user status in database
    pool.execute(
      "SELECT deactivated_at, deleted_at, suspended_at FROM users WHERE id = ?",
      [payload.id]
    ).then(([users]) => {
      if (users.length === 0) {
        res.clearCookie('authToken');
        return res.status(401).json({ message: "User not found" });
      }

      const user = users[0];
      
      // If user is deactivated, suspended, or deleted, clear session
      if (user.deactivated_at || user.suspended_at || user.deleted_at) {
        res.clearCookie('authToken');
        return res.status(403).json({ 
          message: "Account access restricted",
          redirect: '/login'
        });
      }

      next();
    }).catch(err => {
      console.error('Session validation error:', err);
      next();
    });

  } catch (err) {
    next();
  }
}

export async function logAdminActivity(req, res, next) {
  // Only log for admin routes
  if (!req.path.startsWith('/api/admin') && !req.path.startsWith('/admin')) {
    return next();
  }

  // Get admin info from token
  const token = req.cookies.authToken;
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Only log if user is admin
    if (payload.role !== 'admin') {
      return next();
    }

    // Store original res.json to capture response
    const originalJson = res.json.bind(res);
    let responseStatusCode = 200;
    
    // Override res.json to capture status code
    res.json = function(body) {
      responseStatusCode = res.statusCode;
      return originalJson(body);
    };

    // Store original res.status to capture status code
    const originalStatus = res.status.bind(res);
    res.status = function(code) {
      responseStatusCode = code;
      return originalStatus(code);
    };

    // Capture request data before it's consumed
    const requestData = {
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query,
      params: req.params
    };

    // Wait for response to complete
    res.on('finish', async () => {
      try {
        // Determine action and entity based on route
        const logData = determineActionFromRequest(requestData, responseStatusCode);
        
        if (logData.shouldLog) {
          await pool.execute(
            `INSERT INTO admin_activity_logs 
            (admin_id, action, entity_type, entity_id, old_value, new_value, 
             ip_address, user_agent, request_method, request_path, status_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              payload.id,
              logData.action,
              logData.entityType,
              logData.entityId,
              logData.oldValue,
              logData.newValue,
              req.ip || req.connection.remoteAddress,
              req.get('user-agent') || null,
              req.method,
              req.path,
              responseStatusCode
            ]
          );
        }
      } catch (error) {
        console.error('Error logging admin activity:', error);
      }
    });

    next();
  } catch (err) {
    next();
  }
}

// Helper function to determine what to log based on the request
function determineActionFromRequest(requestData, statusCode) {
  const { method, path, body, query, params } = requestData;
  
  // Only log successful operations (200-299)
  const shouldLog = statusCode >= 200 && statusCode < 300;
  
  let action = '';
  let entityType = null;
  let entityId = null;
  let oldValue = null;
  let newValue = null;

  // Helper function to extract ID from path
  const extractId = (pathPattern) => {
    const match = path.match(pathPattern);
    return match ? match[1] : null;
  };

  // User management actions
  if (path.includes('/admin/users')) {
    entityType = 'user';
    entityId = extractId(/\/users\/(\d+)/);

    if (method === 'GET' && path.includes('/export-overview')) {
      action = 'exported_user_overview';
    } else if (method === 'GET' && path.includes('/export')) {
      action = 'exported_users';
      newValue = JSON.stringify({ filters: query });
    } else if (method === 'GET' && entityId && path.includes('/overview')) {
      action = 'viewed_user_overview';
    } else if (method === 'GET' && entityId) {
      action = 'viewed_user';
    } else if (method === 'GET') {
      // action = 'viewed_users_list';
      newValue = JSON.stringify({ filters: query });
    } else if (method === 'PUT'  && entityId) {
      action = 'updated_user';
      newValue = JSON.stringify(body);
    } else if (method === 'DELETE' && entityId) {
      action = 'deleted_user';
    } else if (method === 'POST' && entityId && path.includes('/status')) {
      action = `${body.action}_user`;
      newValue = JSON.stringify({ action: body.action });
    } else if (method === 'POST' && entityId && path.includes('/reset-password')) {
      action = 'reset_user_password';
    } else if (method === 'POST' && entityId && path.includes('/send-email')) {
      action = 'sent_email_to_user';
      newValue = JSON.stringify({ subject: body.subject });
    }
  }
  
  // Product management actions
  else if (path.includes('/admin/products')) {
    entityType = 'product';
    entityId = extractId(/\/products\/(\d+)/);

    if (method === 'GET' && entityId) {
      action = 'viewed_product';
    } else if (method === 'GET') {
      // action = 'viewed_products_list';
    } else if (method === 'PUT' && entityId) {
      action = 'updated_product';
      newValue = JSON.stringify(body);
    } else if (method === 'DELETE' && entityId) {
      action = 'deleted_product';
    }
  }
  
  // Support ticket actions
  else if (path.includes('/admin/contact')) {
    entityType = 'support_ticket';
    entityId = extractId(/\/submission\/(\d+)/);

    if (method === 'GET' && path.includes('/statistics')) {
      // action = 'viewed_support_statistics';
    } else if (method === 'GET' && path.includes('/export')) {
      action = 'exported_support_tickets';
      newValue = JSON.stringify({ filters: query });
    // } else if (method === 'GET' && entityId && path.includes('/submissions')) {
    //   action = 'viewed_support_tickets';
    //   newValue = JSON.stringify({ filters: query });
    } else if (method === 'GET' && entityId) {
      action = 'viewed_support_ticket';
    } else if (method === 'PUT' && entityId) {
      action = 'updated_support_ticket';
      newValue = JSON.stringify(body);
    }
  }
  
  // Notification actions
  else if (path.includes('/admin/notifications')) {
    entityType = 'notification';
    entityId = extractId(/\/notifications\/(\d+)/);

    if (method === 'GET' && path.includes('/statistics')) {
      // action = 'viewed_notification_statistics';
    } else if (method === 'GET' && entityId) {
      action = 'viewed_notification';
    } else if (method === 'GET') {
      // action = 'viewed_notifications_list';
      newValue = JSON.stringify({ filters: query });
    } else if (method === 'POST' && path.includes('/send')) {
      action = 'sent_notification';
    } else if (method === 'DELETE' && entityId) {
      action = 'deleted_notification';
    }
  }

  // Order management actions (from ordersRouter)
  else if (path.includes('/api/admin/orders')) {
    entityType = 'order';
    
    // Extract order number from path if present
    const orderNumberMatch = path.match(/\/orders\/([^\/]+)/);
    entityId = orderNumberMatch ? orderNumberMatch[1] : null;

    if (method === 'GET' && entityId && entityId !== 'undefined') {
      action = 'viewed_order_details';
    } else if (method === 'GET') {
      // action = 'viewed_orders_list';
      newValue = JSON.stringify({ filters: query });
    } else if (method === 'PUT' && path.includes('/status')) {
      action = 'updated_order_status';
      newValue = JSON.stringify({ status: body.status });
    } else if (method === 'DELETE') {
      action = 'deleted_order';
    }
  }

  // Refund management actions
  else if (path.includes('/api/admin/refunds')) {
    entityType = 'refund';
    entityId = params.id || null;

    if (method === 'GET') {
      action = 'viewed_refunds_list';
      newValue = JSON.stringify({ filters: query });
    } else if (method === 'POST' && path.includes('/process')) {
      action = 'processed_refund';
      newValue = JSON.stringify({ action: body.approve ? 'approved' : 'rejected' });
    } else if (method === 'POST' && path.includes('/partial')) {
      action = 'processed_partial_refund';
      newValue = JSON.stringify({ amount: body.amount });
    }
  }
  
  // Dashboard stats
  // else if (path.includes('/api/admin/stats')) {
  //   action = 'viewed_dashboard_stats';
  // }

  return {
    shouldLog: shouldLog && action !== '',
    action,
    entityType,
    entityId,
    oldValue,
    newValue
  };
}

export function errorHandler(err, req, res, next) {
  // Determine severity
  const statusCode = err.statusCode || err.status || 500;
  const severity = determineSeverity(err, statusCode);

  // Log the error
  logError(err, { req }, severity).catch(logErr => {
    console.error('Failed to log error:', logErr);
  });

  // CSRF error
  if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('csrf')) {
    return res.status(403).json({ 
      message: 'Invalid security token. Please refresh and try again.' 
    });
  }

  // Handle JSON parsing errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      message: 'Invalid request format' 
    });
  }

  // Database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ 
      message: 'Duplicate entry. This resource already exists.' 
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ 
      message: 'Invalid reference. Related resource not found.' 
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      message: 'Invalid authentication token' 
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      message: 'Authentication token expired' 
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: err.message || 'Validation failed' 
    });
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(statusCode).json({
    message: isDevelopment ? err.message : 'An error occurred. Please try again.',
    ...(isDevelopment && { 
      stack: err.stack,
      error: err.name 
    })
  });
}

export function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.path}`);
  error.statusCode = 404;
  next(error);
}