import helmet from 'helmet';
import pool from '../database.js'
import rateLimit from 'express-rate-limit';
import { doubleCsrf } from 'csrf-csrf';
import cors from "cors";
import dotenv from "dotenv";
import { RedisStore } from 'rate-limit-redis'
import { createClient } from 'redis'

dotenv.config();

const corsHeaders = cors({
  origin: process.env.NODE_ENV === 'production' 
  ? [process.env.WEBSITE_URL]
  : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
});

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://fonts.cdnfonts.com",
        "https://use.fontawesome.com",
        "https://cdn.jsdelivr.net",
        "https://embed.tawk.to",
        "https://www.gstatic.com"
      ],
      fontSrc: [
        "'self'",
        "data:",
        "https://fonts.gstatic.com",
        "https://use.fontawesome.com",
        "https://cdn.jsdelivr.net",
        "https://fonts.cdnfonts.com",
        "https://embed.tawk.to"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "https://ik.imagekit.io/hd48hro8z",
        "https://i.pinimg.com",
        "https://via.placeholder.com"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://embed.tawk.to",
        "https://cdn.jsdelivr.net",
        "https://use.fontawesome.com",
        "https://js.stripe.com/v3/",
        "https://cdnjs.cloudflare.com",
        "https://translate.google.com",
        "https://translate.googleapis.com",
        "https://translate-pa.googleapis.com"
      ],
      scriptSrcAttr: [
        "'unsafe-inline'"
      ],
      connectSrc: [
        "'self'",
        "https://ik.imagekit.io/hd48hro8z",
        "https://upload.imagekit.io",
        "https://embed.tawk.to",
        "wss://embed.tawk.to",
        "https://va.tawk.to",
        "wss://*.tawk.to", 
        "https://i.pinimg.com",
        "https://js.stripe.com/",
        "https://via.placeholder.com",
        "https://cdn.jsdelivr.net",
        "https://translate.googleapis.com",
        "https://embed.tawk.to/_s/v4/app/68f83c69d79/js/twk-chunk-vendors.js",
        "https://cdnjs.cloudflare.com"
      ],
      frameSrc: ["https://embed.tawk.to", "https://js.stripe.com/"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Create a `node-redis` client
const client = createClient({
	url: process.env.REDIS_URL
})

await client.connect()

client.on('connect', () => console.log('✅ Connected to Redis successfully'));
client.on('error', (err) => console.error('❌ Redis error:', err));


// General rate limiting
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => client.sendCommand(args) }),
});

// Strict rate limiting for sensitive operations
const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again later',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => client.sendCommand(args) })
});

// Authentication rate limiting
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 5 attempts per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: new RedisStore({ sendCommand: (...args) => client.sendCommand(args) })
});

const verificationResendRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Too many verification email requests. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => client.sendCommand(args) })
});

// Address operations rate limiting
const addressRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Too many address operations, please try again later',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => client.sendCommand(args) })
});

const contactRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many contact submissions, please try again later',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => client.sendCommand(args) })
});

// Configure CSRF protection
const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getSessionIdentifier: (req) => {
    return req.cookies.authToken || req.cookies.sessionId || 'anonymous';
  }
});

const checkEnvVars = () => {
  const requiredEnvVars = [
    'JWT_SECRET',
    'CSRF_SECRET',
    'SENDGRID_API_KEY',
    'ADMIN_EMAIL',
    'FROM_EMAIL',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'IMAGEKIT_PRIVATE',
    'REDIS_URL',
    'WEBSITE_URL'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ FATAL: Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  console.log('✅ All required environment variables are set');
};

// Graceful shutdown
const gracefulShutdown = (server, pool) => {
  const shutdown = async () => {
    console.log('Received shutdown signal, closing server gracefully...');
    
    server.close(async () => {
      console.log('HTTP server closed');
      
      try {
        await pool.end();
        console.log('Database connections closed');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
      console.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export {
  corsHeaders,
  securityHeaders,
  generalRateLimit,
  strictRateLimit,
  authRateLimit,
  addressRateLimit,
  contactRateLimit,
  verificationResendRateLimit,
  doubleCsrfProtection,
  checkEnvVars,
  gracefulShutdown
};
