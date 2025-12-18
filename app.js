import express from 'express';
// import https from "https";
// import jwt from 'jsonwebtoken';
import pool from './database.js'
import cookieParser from "cookie-parser";
import path from 'path';
import { fileURLToPath } from 'url';
import { doubleCsrfProtection } from './middleware/security.js';
import adminRoutes from "./routes/admin-routes/index.js";
import authRoutes from './routes/auth-routes.js';
import publicRoutes from './routes/public-routes.js';
import inquiriesRoutes from './routes/inquiries-routes.js';
import userRoutes from './routes/user-routes.js';
import { createUsersTable } from './migrations/users-table-mig.js'
import { createPendingRegistrationsTable } from './migrations/pending-registrations-mig.js'
import { createPropertiesTable } from './migrations/properties-table-mig.js'
import { createPropertiesImagesTable } from './migrations/properties-images-mig.js'
import { createInquiriesTable } from './migrations/inquiries-table-mig.js'
import { createUserSessionsTable } from './migrations/user-sessions-mig.js'
import { createNotificationsTable } from './migrations/notifications-table-mig.js'
import { createContactSubmissionsTable } from './migrations/contact-submissions-mig.js'
import { createNotificationSettingsTable } from './migrations/notifications-settings-mig.js'
import { createFavoritesTable } from './migrations/favourite-table-mig.js'
import { createPreApprovalsTable } from './migrations/pre-approvals-mig.js'
import { createSavedSearchesTable } from './migrations/saved-searches-mig.js'
import { createOpenHousesTable } from './migrations/open-houses-mig.js'


await createUsersTable();
await createPendingRegistrationsTable();
await createPropertiesTable();
await createPropertiesImagesTable();
await createInquiriesTable();
await createUserSessionsTable();
await createNotificationsTable();
await createContactSubmissionsTable();
await createNotificationSettingsTable();
await createFavoritesTable();
await createPreApprovalsTable();
await createSavedSearchesTable()
await createOpenHousesTable()


// Init Express
const app = express();

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Security middleware
// app.use(corsHeaders);
// app.use(securityHeaders);

app.set('trust proxy', 1); // trust first proxy


// CSRF protection 
app.use(doubleCsrfProtection);

// Static files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/email-templates', express.static(path.join(__dirname, 'email-templates')));
app.use('/routes-templates', express.static(path.join(__dirname, 'routes-templates')));

// Root route for health checks / homepage
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'farfetch.html')));

// // Routes
app.use('/admin', adminRoutes);
app.use('/public', inquiriesRoutes);
app.use('/auth', authRoutes);
app.use('/public', publicRoutes);
app.use('/api', userRoutes);


// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`HTTPS Express server running on port ${PORT}`);
});

// gracefulShutdown(server, pool);