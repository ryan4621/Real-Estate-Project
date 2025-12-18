// services/email-service.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from "fs/promises";
import path from "path";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS
  }
});

export const sendVerificationEmail = async (userEmail, userName, verificationUrl) => {
  try {
    const subjectLine = 'Verify Your Email - PRIME HOMES';

    const textContent = `
      Welcome to PRIME HOMES, ${userName}!

      Thank you for registering. Please verify your email address by visiting this link:

      ${verificationUrl}

      This link will expire in 24 hours.

      If you didn't create an account, please ignore this email.

      © ${new Date().getFullYear()} PRIME HOMES. All rights reserved.
    `;

    const htmlPath = path.join(process.cwd(), "email-templates", "verify-email.html");
    const cssPath = path.join(process.cwd(), "email-templates", "verify-email.css");

    let htmlTemplate = await fs.readFile(htmlPath, "utf8");
    const css = await fs.readFile(cssPath, "utf8");

    // Escape inserted values to prevent injection
    const escapeHtml = str =>
      String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[s]));

    htmlTemplate = htmlTemplate
      .replace("/* STYLES_PLACEHOLDER */", css)
      .replace(/{{userName}}/g, () => escapeHtml(userName))
      .replace(/{{verificationUrl}}/g, () => escapeHtml(verificationUrl))
      .replace(/{{year}}/g, new Date().getFullYear());

    await transporter.sendMail({
      from: process.env.NODEMAILER_FROM,
      to: userEmail,
      subject: subjectLine,
      text: textContent,
      html: htmlTemplate
    });

    console.log(`Verification email sent to ${userEmail}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

export const sendInquiryConfirmationEmail = async (buyerName, buyerEmail, inquiryId, message, isChecked) => {
  try {
    const subjectLine = `Inquiry Request Received - Ticket #${inquiryId}`;  
    const estimatedResponse = isChecked ? '5-8 hours' : '12-24 hours';
    const bodyParagraph = isChecked ? 'who can confirm and book your tour' : 'shortly';
    const requestTour = isChecked ? 'Yes' : 'No';

    const textContent = `
      Support Request Received - Ticket #${inquiryId}

      Dear ${buyerName},

      Thank you for sending an inquiry. We have successfully received your message and created a ticket for your inquiry.

      Ticket Information:
      - Ticket ID: #${inquiryId}
      - Request Tour: ${requestTour}
      - Expected Response: ${estimatedResponse}
      - Status: Pending Review

      Your Message:
      ${message}

      What happens next?
      - Our support team will review your request
      - You'll receive a response within ${estimatedResponse}
      - All communication will be sent to this email address
      - Please keep your ticket ID (#${inquiryId}) for reference

      Need urgent assistance? If this is a critical issue, please mention "URGENT" in any follow-up emails.

      This is an automated confirmation email. Please do not reply directly to this message.
      If you need to add more information to your ticket, please submit a new support request and reference ticket #${inquiryId}.

      © ${new Date().getFullYear()} Your Website. All rights reserved.
    `;

    const htmlPath = path.join(process.cwd(), "email-templates", "inquiry-email.html");
    const cssPath = path.join(process.cwd(), "email-templates", "inquiry-email.css");

    let htmlTemplate = await fs.readFile(htmlPath, "utf8");
    const css = await fs.readFile(cssPath, "utf8");

    // Escape inserted values to prevent injection
    const escapeHtml = str =>
      String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[s]));

    htmlTemplate = htmlTemplate
      .replace("/* STYLES_PLACEHOLDER */", css)
      .replace(/{{buyerName}}/g, () => escapeHtml(buyerName))
      .replace(/{{buyerEmail}}/g, () => escapeHtml(buyerEmail))
      .replace(/{{inquiryId}}/g, () => escapeHtml(inquiryId))
      .replace(/{{bodyParagraph}}/g, () => escapeHtml(bodyParagraph))
      .replace(/{{requestTour}}/g, () => escapeHtml(requestTour))
      .replace(/{{message}}/g, () => escapeHtml(message))
      .replace(/{{estimatedResponse}}/g, () => escapeHtml(estimatedResponse))
      .replace(/{{year}}/g, new Date().getFullYear());


    await transporter.sendMail({
      from: process.env.NODEMAILER_FROM,
      to: buyerEmail,
      subject: subjectLine,
      text: textContent,
      html: htmlTemplate
    });

    console.log(`Inquiry confirmation email sent to ${buyerEmail} for ticket #${inquiryId}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, error: error.message };
  }
};

export const sendInquiryNotificationToAdmin = async (buyerName, buyerEmail, inquiryId, message, isChecked, userInfo = null, adminEmail) => {
  try {
    const subjectLine = `New Inquiry Request - Ticket #${inquiryId}`;
    
    const buyerType = userInfo ? 'Registered User' : 'Guest';
    const adminPanelUrl = `/frontend/admin/admin-inquiries.html`;
    const requestTour = isChecked ? 'Yes' : 'No'
    const userName = userInfo ? `${userInfo.first_name} ${userInfo.last_name}` : ''
    const userEmail = userInfo ? `${userInfo.user_email}` : ''
    const submittedDate = new Date().toLocaleString()

    const textContent = `
      New Support Request - Ticket #${inquiryId}

      Customer Information:
      - Name: ${buyerName}
      - Email: ${buyerEmail}
      - Account Type: ${buyerType}
      ${userInfo ? `- Account Name: ${userName}\n- Account Email: ${userEmail}` : ''}

      Ticket Details:
      - Ticket ID: #${inquiryId}
      - Request Tour: ${requestTour}
      - Submitted: ${new Date().toLocaleString()}

      Customer Message:
      ${message}

      View this ticket in the admin panel: ${adminPanelUrl}

      This notification was sent automatically when a new support request was submitted.
    `;

    const htmlPath = path.join(process.cwd(), "email-templates", "inquiry-admin-email.html");
    const cssPath = path.join(process.cwd(), "email-templates", "inquiry-admin-email.css");

    let htmlTemplate = await fs.readFile(htmlPath, "utf8");
    const css = await fs.readFile(cssPath, "utf8");

    // Escape inserted values to prevent injection
    const escapeHtml = str =>
      String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[s]));

    // Process conditionals BEFORE replacing values
    const processConditionals = (template) => {
      return template.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
        // Check if the variable exists and has a value
        const value = variable === 'userName' ? userName : null;
        return value ? content : '';
      });
    };

    htmlTemplate = processConditionals(htmlTemplate);

    htmlTemplate = htmlTemplate
      .replace("/* STYLES_PLACEHOLDER */", css)
      .replace(/{{buyerName}}/g, () => escapeHtml(buyerName))
      .replace(/{{buyerEmail}}/g, () => escapeHtml(buyerEmail))
      .replace(/{{buyerType}}/g, () => escapeHtml(buyerType))
      .replace(/{{inquiryId}}/g, () => escapeHtml(inquiryId))
      .replace(/{{userName}}/g, () => escapeHtml(userName))
      .replace(/{{userEmail}}/g, () => escapeHtml(userEmail))
      .replace(/{{requestTour}}/g, () => escapeHtml(requestTour))
      .replace(/{{submittedDate}}/g, () => escapeHtml(submittedDate))
      .replace(/{{message}}/g, () => escapeHtml(message))
      .replace(/{{adminPanelUrl}}/g, () => escapeHtml(adminPanelUrl))

    await transporter.sendMail({
      from: process.env.NODEMAILER_FROM,
      to: adminEmail,
      subject: subjectLine,
      text: textContent,
      html: htmlTemplate
    });

    console.log(`Admin inquiry notification sent for ticket #${inquiryId}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return { success: false, error: error.message };
  }
};

export const sendInquiryToAgent = async (buyerName, buyerEmail, inquiryId, message, isChecked, agentEmail, id) => {
  try {
    const subjectLine = `New Inquiry Request - Ticket #${inquiryId}`;
    
    const requestTour = isChecked ? 'Yes' : 'No'
    const submittedDate = new Date().toLocaleString()
    const propertyId = id

    const textContent = `
      New Inquiry Request on Property ${propertyId} - Ticket #${inquiryId}

      Buyer Information:
      - Name: ${buyerName}
      - Email: ${buyerEmail}

      Inquiry Details:
      - Inquiry ID: #${inquiryId}
      - Property ID: #${propertyId}
      - Request Tour: ${requestTour}
      - Submitted: ${new Date().toLocaleString()}

      Customer Message:
      ${message}

      This notification was sent automatically when a new support request was submitted.
    `;

    const htmlPath = path.join(process.cwd(), "email-templates", "inquiry-agent-email.html");
    const cssPath = path.join(process.cwd(), "email-templates", "inquiry-agent-email.css");

    let htmlTemplate = await fs.readFile(htmlPath, "utf8");
    const css = await fs.readFile(cssPath, "utf8");

    // Escape inserted values to prevent injection
    const escapeHtml = str =>
      String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[s]));

    htmlTemplate = htmlTemplate
      .replace("/* STYLES_PLACEHOLDER */", css)
      .replace(/{{buyerName}}/g, () => escapeHtml(buyerName))
      .replace(/{{buyerEmail}}/g, () => escapeHtml(buyerEmail))
      .replace(/{{propertyId}}/g, () => escapeHtml(propertyId))
      .replace(/{{inquiryId}}/g, () => escapeHtml(inquiryId))
      .replace(/{{requestTour}}/g, () => escapeHtml(requestTour))
      .replace(/{{submittedDate}}/g, () => escapeHtml(submittedDate))
      .replace(/{{message}}/g, () => escapeHtml(message))

    await transporter.sendMail({
      from: process.env.NODEMAILER_FROM,
      to: agentEmail,
      subject: subjectLine,
      text: textContent,
      html: htmlTemplate
    });

    console.log(`Agent inquiry notification sent for ticket #${inquiryId}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return { success: false, error: error.message };
  }
};

export const sendNotificationEmail = async (userEmail, userName, title, message, category) => {
  try {

    const subjectLine = `${title}`;
    
    // Get template based on category
    const template = getNotificationTemplate(category, title, message, userName);

    await transporter.sendMail({
      from: process.env.NODEMAILER_FROM,
      to: userEmail,
      subject: subjectLine,
      text: template.text,
      html: template.html
    });

    console.log(`Notification email sent to ${userEmail} (${category})`);
    return { success: true };

  } catch (error) {
    console.error('Error sending notification email:', error);
    return { success: false, error: error.message };
  }
};

function getNotificationTemplate(category, title, message, userName) {
  const baseStyles = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .message-content {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 8px;
      margin: 1.5rem 0;
    }
    .footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #e9ecef;
      font-size: 0.9rem;
      color: #7f8c8d;
      text-align: center;
    }
    @media (max-width: 600px) {
      body { padding: 10px; }
      .container { padding: 1rem; }
    }
  `;

  switch (category) {
    case 'marketing_emails':
      return {
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>${baseStyles}
              .header {
                background: linear-gradient(135deg, #3498db, #2980b9);
                color: white;
                padding: 1.5rem;
                border-radius: 8px;
                text-align: center;
                margin-bottom: 2rem;
              }
              .message-content {
                border-left: 4px solid #3498db;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 1.5rem;">${title}</h1>
              </div>
              
              <p>Hi ${userName},</p>
              
              <div class="message-content">
                ${message.replace(/\n/g, '<br>')}
              </div>
              
              <div class="footer">
                <p>You received this because you subscribed to marketing updates.</p>
                <p>You can update your notification preferences in your account settings.</p>
                <p>&copy; ${new Date().getFullYear()} Your Website. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `${title}\n\nHi ${userName},\n\n${message}\n\nYou received this because you subscribed to marketing updates.\nYou can update your notification preferences in your account settings.\n\n© ${new Date().getFullYear()} Your Website. All rights reserved.`
      };

    case 'saved_listings':
      return {
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>${baseStyles}
              .header {
                background: linear-gradient(135deg, #27ae60, #229954);
                color: white;
                padding: 1.5rem;
                border-radius: 8px;
                text-align: center;
                margin-bottom: 2rem;
              }
              .message-content {
                border-left: 4px solid #27ae60;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 1.5rem;">Saved Listings Update</h1>
                <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">${title}</p>
              </div>
              
              <p>Hi ${userName},</p>
              
              <div class="message-content">
                ${message.replace(/\n/g, '<br>')}
              </div>
              
              <div class="footer">
                <p>This is an important update about your order.</p>
                <p>You can update your notification preferences in your account settings.</p>
                <p>&copy; ${new Date().getFullYear()} Your Website. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Order Update: ${title}\n\nHi ${userName},\n\n${message}\n\nThis is an important update about your order.\nYou can update your notification preferences in your account settings.\n\n© ${new Date().getFullYear()} Your Website. All rights reserved.`
      };
    
    case 'general':
    default:
      return {
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>${baseStyles}
              .header {
                background: linear-gradient(135deg, #34495e, #2c3e50);
                color: white;
                padding: 1.5rem;
                border-radius: 8px;
                text-align: center;
                margin-bottom: 2rem;
              }
              .message-content {
                border-left: 4px solid #34495e;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 1.5rem;">${title}</h1>
              </div>
              
              <p>Hi ${userName},</p>
              
              <div class="message-content">
                ${message.replace(/\n/g, '<br>')}
              </div>
              
              <div class="footer">
                <p>This is a general notification from our team.</p>
                <p>You can update your notification preferences in your account settings.</p>
                <p>&copy; ${new Date().getFullYear()} Your Website. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `${title}\n\nHi ${userName},\n\n${message}\n\nThis is a general notification from our team.\nYou can update your notification preferences in your account settings.\n\n© ${new Date().getFullYear()} Your Website. All rights reserved.`
      };
  }
}

export const sendContactConfirmationEmail = async (customerEmail, customerName, submissionId, subject, message, priority = 'normal') => {
  try {
    const subjectLine = `Support Request Received - Ticket #${submissionId}`;  
    const estimatedResponse = priority === 'high' || priority === 'urgent' ? '4-8 hours' : '12-24 hours';
    const formattedSubject = formatSubjectForEmail(subject)

    const textContent = `
      Support Request Received - Ticket #${submissionId}

      Dear ${customerName},

      Thank you for contacting our support team. We have successfully received your message and created a support ticket for your inquiry.

      Ticket Information:
      - Ticket ID: #${submissionId}
      - Subject: ${formattedSubject}
      - Priority: ${priority}
      - Expected Response: ${estimatedResponse}
      - Status: Pending Review

      Your Message:
      ${message}

      What happens next?
      - Our support team will review your request
      - You'll receive a response within ${estimatedResponse}
      - All communication will be sent to this email address
      - Please keep your ticket ID (#${submissionId}) for reference

      Need urgent assistance? If this is a critical issue, please mention "URGENT" in any follow-up emails.

      This is an automated confirmation email. Please do not reply directly to this message.
      If you need to add more information to your ticket, please submit a new support request and reference ticket #${submissionId}.

      © ${new Date().getFullYear()} Your Website. All rights reserved.
    `;

    const htmlPath = path.join(process.cwd(), "email-templates", "contact-confirmation-email.html");
    const cssPath = path.join(process.cwd(), "email-templates", "contact-confirmation-email.css");

    let htmlTemplate = await fs.readFile(htmlPath, "utf8");
    const css = await fs.readFile(cssPath, "utf8");

    const escapeHtml = str =>
      String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[s]));

    htmlTemplate = htmlTemplate
      .replace("/* STYLES_PLACEHOLDER */", css)
      .replace(/{{customerName}}/g, () => escapeHtml(customerName))
      .replace(/{{customerEmail}}/g, () => escapeHtml(customerEmail))
      .replace(/{{submissionId}}/g, () => escapeHtml(submissionId))
      .replace(/{{formattedSubject}}/g, () => escapeHtml(formattedSubject))
      .replace(/{{message}}/g, () => escapeHtml(message))
      .replace(/{{priority}}/g, () => escapeHtml(priority))
      .replace(/{{estimatedResponse}}/g, () => escapeHtml(estimatedResponse))
      .replace(/{{year}}/g, new Date().getFullYear());

    await transporter.sendMail({
      from: process.env.NODEMAILER_FROM,
      to: customerEmail,
      subject: subjectLine,
      text: textContent,
      html: htmlTemplate
    });

    console.log(`Confirmation email sent to ${customerEmail} for ticket #${submissionId}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, error: error.message };
  }
};

export const sendContactNotificationToAdmin = async (submissionId, customerName, customerEmail, subject, message, priority = 'normal', userInfo = null, adminEmails) => {
  try {
    const subjectLine = `New Support Request - Ticket #${submissionId} [${priority.toUpperCase()}]`;
    
    const customerType = userInfo ? 'Registered User' : 'Guest';
    const adminPanelUrl = `/frontend/admin/admin-support.html`;
    const formattedSubject = formatSubjectForEmail(subject)
    const userFullName = userInfo ? `${userInfo.first_name} ${userInfo.last_name}` : ""
    const userEmail = userInfo ? `${userInfo.user_email}` : ""
    const submitted = new Date().toLocaleString()

    const textContent = `
      New Support Request - Ticket #${submissionId}

      Customer Information:
      - Name: ${customerName}
      - Email: ${customerEmail}
      - Account Type: ${customerType}
      ${userInfo ? `- Account Name: ${userFullName}\n- Account Email: ${userEmail}` : ''}

      Ticket Details:
      - Ticket ID: #${submissionId}
      - Subject: ${formattedSubject}
      - Priority: ${priority}
      - Submitted: ${submitted}

      Customer Message:
      ${message}

      View this ticket in the admin panel: ${adminPanelUrl}

      This notification was sent automatically when a new support request was submitted.
    `;

    const htmlPath = path.join(process.cwd(), "email-templates", "contact-admin-email.html");
    const cssPath = path.join(process.cwd(), "email-templates", "contact-admin-email.css");

    let htmlTemplate = await fs.readFile(htmlPath, "utf8");
    const css = await fs.readFile(cssPath, "utf8");

    // Escape inserted values to prevent injection
    const escapeHtml = str =>
      String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[s]));

    // Process conditionals BEFORE replacing values
    const processConditionals = (template) => {
      return template.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
        // Check if the variable exists and has a value
        const value = variable === 'userFullName' ? userFullName : null;
        return value ? content : '';
      });
    };

    htmlTemplate = processConditionals(htmlTemplate);

    htmlTemplate = htmlTemplate
      .replace("/* STYLES_PLACEHOLDER */", css)
      .replace(/{{customerName}}/g, () => escapeHtml(customerName))
      .replace(/{{customerEmail}}/g, () => escapeHtml(customerEmail))
      .replace(/{{customerType}}/g, () => escapeHtml(customerType))
      .replace(/{{submissionId}}/g, () => escapeHtml(submissionId))
      .replace(/{{formattedSubject}}/g, () => escapeHtml(formattedSubject))
      .replace(/{{message}}/g, () => escapeHtml(message))
      .replace(/{{priority}}/g, () => escapeHtml(priority))
      .replace(/{{submitted}}/g, () => escapeHtml(submitted))
      .replace(/{{userFullName}}/g, () => escapeHtml(userFullName))
      .replace(/{{userEmail}}/g, () => escapeHtml(userEmail))
      .replace(/{{year}}/g, new Date().getFullYear());

    await transporter.sendMail({
      from: process.env.NODEMAILER_FROM,
      to: adminEmails,
      subject: subjectLine,
      text: textContent,
      html: htmlTemplate
    });

    console.log(`Admin notification sent for ticket #${submissionId}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return { success: false, error: error.message };
  }
};

function formatSubjectForEmail(subject) {
  const subjects = {
    'general': 'General Inquiry',
    'account': 'Account Issues',
    'listings': 'Property Listings Questions',
    'technical': 'Technical Support',
    'other': 'Other'
  };
  return subjects[subject] || subject;
}

export const sendPasswordResetEmail = async (userName, userEmail, resetLink) => {
  try {
    const subjectLine = 'Password Reset Code - Action Required';

    const textContent = `
      Password Reset Request

      Hi ${userName},

      We received a request to reset your password. Please click the link below to reset your password using our secured server.

      RESET LINK: ${resetLink}

      This link expires in 15 minutes.

      ⚠️ Security Notice: If you didn't request this password reset email, or you remembered your password, please ignore this email or contact support if you're concerned about your account security.

      What to do next:
      - Click the reset link to navigate to the password reset page
      - Create a new secure password
      - This link will expire in 15 minutes

      Security Tips:
      - Never share your reset link with anyone
      - Choose a strong, unique password
      - Use a combination of letters, numbers, and symbols

      This is an automated security email.
      If you didn't request a password reset, no action is needed - your password remains the same and secure.

      © ${new Date().getFullYear()} Your Website. All rights reserved.
    `;

    const htmlPath = path.join(process.cwd(), "email-templates", "password-reset.html");
    const cssPath = path.join(process.cwd(), "email-templates", "password-reset.css");

    let htmlTemplate = await fs.readFile(htmlPath, "utf8");
    const css = await fs.readFile(cssPath, "utf8");

    const escapeHtml = str =>
      String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[s]));

    htmlTemplate = htmlTemplate
      .replace("/* STYLES_PLACEHOLDER */", css)
      .replace(/{{userName}}/g, () => escapeHtml(userName))
      .replace(/{{resetLink}}/g, () => escapeHtml(resetLink))
      .replace(/{{userEmail}}/g, () => escapeHtml(userEmail))
      .replace(/{{year}}/g, new Date().getFullYear());

    await transporter.sendMail({
      from: process.env.NODEMAILER_FROM,
      to: userEmail,
      subject: subjectLine,
      text: textContent,
      html: htmlTemplate
    });
    
    console.log(`Password reset email sent to ${userEmail}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending password reset link to email:', error);
    return { success: false };
  }
};

export const sendPasswordResetConfirmation = async (userEmail, userName) => {
  try {
    const subjectLine = 'Password Successfully Reset';

    const textContent = `
      Password Reset Successful

      Hi ${userName},

      ✅ Your password has been successfully reset.

      You can now log in to your account using your new password.

      What changed:
      - Your old password is no longer valid
      - You can now use your new password to log in
      - All active sessions have been maintained

      ⚠️ Didn't make this change? If you didn't reset your password, your account may be compromised. Please contact our support team immediately.

      Security Recommendations:
      - Don't reuse passwords across different websites
      - Enable two-factor authentication for extra security
      - Regularly update your password
      - Never share your password with anyone

      This is a security notification about your account.
      If you need help, please contact our support team.

      © ${new Date().getFullYear()} Your Website. All rights reserved.
    `;

    const htmlPath = path.join(process.cwd(), "email-templates", "password-reset-confirmation.html");
    const cssPath = path.join(process.cwd(), "email-templates", "password-reset-confirmation.css");

    let htmlTemplate = await fs.readFile(htmlPath, "utf8");
    const css = await fs.readFile(cssPath, "utf8");

    const escapeHtml = str =>
      String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[s]));

    htmlTemplate = htmlTemplate
      .replace("/* STYLES_PLACEHOLDER */", css)
      .replace(/{{userName}}/g, () => escapeHtml(userName))
      .replace(/{{year}}/g, new Date().getFullYear());

    await transporter.sendMail({
      from: process.env.NODEMAILER_FROM,
      to: userEmail,
      subject: subjectLine,
      text: textContent,
      html: htmlTemplate
    });
    
    console.log(`Password reset confirmation sent to ${userEmail}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    return { success: false };
  }
};

export const sendPasswordChangeConfirmation = async (userEmail, userName) => {
  try {
    const subjectLine = 'Password Successfully Changed';

    const textContent = `
      Password Changed Successfully

      Hi ${userName},

      ✅ Your password has been successfully changed.

      You can now log in to your account using your new password.

      What changed:
      - Your old password is no longer valid
      - You can now use your new password to log in
      - All active sessions have been logged out

      ⚠️ Didn't make this change? If you didn't change your password, your account may be compromised. Please contact our support team immediately.

      Security Recommendations:
      - Don't reuse passwords across different websites
      - Enable two-factor authentication for extra security
      - Regularly update your password
      - Never share your password with anyone

      This is a security notification about your account.
      If you need help, please contact our support team.

      © ${new Date().getFullYear()} Your Website. All rights reserved.
    `;

    const htmlPath = path.join(process.cwd(), "email-templates", "password-change-confirmation.html");
    const cssPath = path.join(process.cwd(), "email-templates", "password-reset-confirmation.css");

    let htmlTemplate = await fs.readFile(htmlPath, "utf8");
    const css = await fs.readFile(cssPath, "utf8");

    const escapeHtml = str =>
      String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[s]));

    htmlTemplate = htmlTemplate
      .replace("/* STYLES_PLACEHOLDER */", css)
      .replace(/{{userName}}/g, () => escapeHtml(userName))
      .replace(/{{year}}/g, new Date().getFullYear());

    await transporter.sendMail({
      from: process.env.NODEMAILER_FROM,
      to: userEmail,
      subject: subjectLine,
      text: textContent,
      html: htmlTemplate
    });
    
    console.log(`Password change confirmation sent to ${userEmail}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending password change confirmation email:', error);
    return { success: false };
  }
};

export const sendPreApprovalVerificationEmail = async (email, name, verificationCode) => {
  try {
    const subjectLine = 'Verify Your Pre Approval Email - PRIME HOMES';

    const textContent = `
      Welcome to PRIME HOMES, ${name}!

      Thank you for taking the time to request for a pre-approval. Please verify your email address using the code below:

      ${verificationCode}

      This code will expire in 15 minutes.

      If you didn't initiate this request, please ignore this email.

      © ${new Date().getFullYear()} PRIME HOMES. All rights reserved.
    `;

    const htmlPath = path.join(process.cwd(), "email-templates", "verify-pre-approval-email.html");
    const cssPath = path.join(process.cwd(), "email-templates", "verify-pre-approval-email.css");

    let htmlTemplate = await fs.readFile(htmlPath, "utf8");
    const css = await fs.readFile(cssPath, "utf8");

    const escapeHtml = str =>
      String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[s]));

    htmlTemplate = htmlTemplate
      .replace("/* STYLES_PLACEHOLDER */", css)
      .replace(/{{name}}/g, () => escapeHtml(name))
      .replace(/{{verificationCode}}/g, () => escapeHtml(verificationCode))
      .replace(/{{year}}/g, new Date().getFullYear());

    await transporter.sendMail({
      from: process.env.NODEMAILER_FROM,
      to: email,
      subject: subjectLine,
      text: textContent,
      html: htmlTemplate
    });

    console.log(`Verification email sent to ${email}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// // Send password reset code email
// export const sendPasswordResetEmail = async (userEmail, userName, resetCode) => {
//   try {
//     const subjectLine = 'Password Reset Code - Action Required';
    
//     const htmlContent = `
//       <!DOCTYPE html>
//       <html lang="en">
//       <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Password Reset</title>
//         <style>
//           body {
//             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
//             line-height: 1.6;
//             color: #333;
//             max-width: 600px;
//             margin: 0 auto;
//             padding: 20px;
//             background-color: #f8f9fa;
//           }
//           .container {
//             background: white;
//             border-radius: 12px;
//             padding: 2rem;
//             box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//           }
//           .header {
//             background: linear-gradient(135deg, #e74c3c, #c0392b);
//             color: white;
//             padding: 1.5rem;
//             border-radius: 8px;
//             text-align: center;
//             margin-bottom: 2rem;
//           }
//           .header h1 {
//             margin: 0;
//             font-size: 1.5rem;
//           }
//           .code-box {
//             background: #f8f9fa;
//             padding: 2rem;
//             border-radius: 8px;
//             text-align: center;
//             margin: 2rem 0;
//             border: 2px dashed #e74c3c;
//           }
//           .reset-code {
//             font-size: 2.5rem;
//             font-weight: bold;
//             color: #e74c3c;
//             letter-spacing: 0.5rem;
//             font-family: 'Courier New', monospace;
//           }
//           .warning-box {
//             background: #fff3cd;
//             padding: 1rem;
//             border-radius: 8px;
//             border-left: 4px solid #f39c12;
//             margin: 1rem 0;
//           }
//           .footer {
//             margin-top: 2rem;
//             padding-top: 1rem;
//             border-top: 1px solid #e9ecef;
//             font-size: 0.9rem;
//             color: #7f8c8d;
//             text-align: center;
//           }
//           @media (max-width: 600px) {
//             body { padding: 10px; }
//             .container { padding: 1rem; }
//             .reset-code { font-size: 2rem; letter-spacing: 0.3rem; }
//           }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>Password Reset Request</h1>
//             <p style="margin: 0; opacity: 0.9;">Your verification code is ready</p>
//           </div>
          
//           <p>Hi ${userName},</p>
          
//           <p>We received a request to reset your password. Use the code below to complete the process:</p>
          
//           <div class="code-box">
//             <p style="margin: 0; font-size: 0.9rem; color: #7f8c8d; margin-bottom: 1rem;">Your Reset Code</p>
//             <div class="reset-code">${resetCode}</div>
//             <p style="margin: 1rem 0 0 0; font-size: 0.9rem; color: #7f8c8d;">This code expires in 15 minutes</p>
//           </div>
          
//           <div class="warning-box">
//             <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email or contact support if you're concerned about your account security.
//           </div>
          
//           <p><strong>What to do next:</strong></p>
//           <ul>
//             <li>Enter this 6-digit code on the password reset page</li>
//             <li>Create a new secure password</li>
//             <li>The code will expire in 15 minutes</li>
//           </ul>
          
//           <p><strong>Security Tips:</strong></p>
//           <ul>
//             <li>Never share your reset code with anyone</li>
//             <li>Choose a strong, unique password</li>
//             <li>Use a combination of letters, numbers, and symbols</li>
//           </ul>
          
//           <div class="footer">
//             <p>This is an automated security email.</p>
//             <p>If you didn't request a password reset, no action is needed - your password remains secure.</p>
//             <p>&copy; ${new Date().getFullYear()} Your Website. All rights reserved.</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;

//     const textContent = `
// Password Reset Request

// Hi ${userName},

// We received a request to reset your password. Use the code below to complete the process:

// YOUR RESET CODE: ${resetCode}

// This code expires in 15 minutes.

// ⚠️ Security Notice: If you didn't request this password reset, please ignore this email or contact support if you're concerned about your account security.

// What to do next:
// - Enter this 6-digit code on the password reset page
// - Create a new secure password
// - The code will expire in 15 minutes

// Security Tips:
// - Never share your reset code with anyone
// - Choose a strong, unique password
// - Use a combination of letters, numbers, and symbols

// This is an automated security email.
// If you didn't request a password reset, no action is needed - your password remains secure.

// © ${new Date().getFullYear()} Your Website. All rights reserved.
//     `;

//     const msg = {
//       to: userEmail,
//       from: EMAIL_CONFIG.from,
//       subject: subjectLine,
//       text: textContent,
//       html: htmlContent
//     };

//     await sgMail.send(msg);
//     console.log(`Password reset email sent to ${userEmail}`);
//     return { success: true };

//   } catch (error) {
//     console.error('Error sending password reset email:', error);
//     return { success: false, error: error.message };
//   }
// };


// // Send password reset confirmation email
// export const sendPasswordResetConfirmation = async (userEmail, userName) => {
//   try {
//     const subjectLine = 'Password Successfully Reset';
    
//     const htmlContent = `
//       <!DOCTYPE html>
//       <html lang="en">
//       <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Password Reset Confirmation</title>
//         <style>
//           body {
//             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
//             line-height: 1.6;
//             color: #333;
//             max-width: 600px;
//             margin: 0 auto;
//             padding: 20px;
//             background-color: #f8f9fa;
//           }
//           .container {
//             background: white;
//             border-radius: 12px;
//             padding: 2rem;
//             box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//           }
//           .header {
//             background: linear-gradient(135deg, #27ae60, #229954);
//             color: white;
//             padding: 1.5rem;
//             border-radius: 8px;
//             text-align: center;
//             margin-bottom: 2rem;
//           }
//           .header h1 {
//             margin: 0;
//             font-size: 1.5rem;
//           }
//           .success-icon {
//             font-size: 3rem;
//             text-align: center;
//             margin: 1rem 0;
//           }
//           .info-box {
//             background: #d5f4e6;
//             padding: 1.5rem;
//             border-radius: 8px;
//             border-left: 4px solid #27ae60;
//             margin: 1.5rem 0;
//           }
//           .warning-box {
//             background: #fff3cd;
//             padding: 1rem;
//             border-radius: 8px;
//             border-left: 4px solid #f39c12;
//             margin: 1rem 0;
//           }
//           .footer {
//             margin-top: 2rem;
//             padding-top: 1rem;
//             border-top: 1px solid #e9ecef;
//             font-size: 0.9rem;
//             color: #7f8c8d;
//             text-align: center;
//           }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>Password Reset Successful</h1>
//           </div>
          
//           <div class="success-icon">✅</div>
          
//           <p>Hi ${userName},</p>
          
//           <div class="info-box">
//             <p style="margin: 0;"><strong>Your password has been successfully reset.</strong></p>
//             <p style="margin: 0.5rem 0 0 0;">You can now log in to your account using your new password.</p>
//           </div>
          
//           <p><strong>What changed:</strong></p>
//           <ul>
//             <li>Your old password is no longer valid</li>
//             <li>You can now use your new password to log in</li>
//             <li>All active sessions have been maintained</li>
//           </ul>
          
//           <div class="warning-box">
//             <strong>⚠️ Didn't make this change?</strong> If you didn't reset your password, your account may be compromised. Please contact our support team immediately.
//           </div>
          
//           <p><strong>Security Recommendations:</strong></p>
//           <ul>
//             <li>Don't reuse passwords across different websites</li>
//             <li>Enable two-factor authentication for extra security</li>
//             <li>Regularly update your password</li>
//             <li>Never share your password with anyone</li>
//           </ul>
          
//           <div class="footer">
//             <p>This is a security notification about your account.</p>
//             <p>If you need help, please contact our support team.</p>
//             <p>&copy; ${new Date().getFullYear()} Your Website. All rights reserved.</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;

//     const textContent = `
// Password Reset Successful

// Hi ${userName},

// ✅ Your password has been successfully reset.

// You can now log in to your account using your new password.

// What changed:
// - Your old password is no longer valid
// - You can now use your new password to log in
// - All active sessions have been maintained

// ⚠️ Didn't make this change? If you didn't reset your password, your account may be compromised. Please contact our support team immediately.

// Security Recommendations:
// - Don't reuse passwords across different websites
// - Enable two-factor authentication for extra security
// - Regularly update your password
// - Never share your password with anyone

// This is a security notification about your account.
// If you need help, please contact our support team.

// © ${new Date().getFullYear()} Your Website. All rights reserved.
//     `;

//     const msg = {
//       to: userEmail,
//       from: EMAIL_CONFIG.from,
//       subject: subjectLine,
//       text: textContent,
//       html: htmlContent
//     };

//     await sgMail.send(msg);
//     console.log(`Password reset confirmation sent to ${userEmail}`);
//     return { success: true };

//   } catch (error) {
//     console.error('Error sending password reset confirmation:', error);
//     return { success: false, error: error.message };
//   }
// };


// // Send critical error alert to all super admins
// export const sendCriticalErrorAlert = async (errorDetails) => {
//   try {
//     const {
//       errorId,
//       errorType,
//       errorMessage,
//       requestPath,
//       userId,
//       userEmail,
//       timestamp
//     } = errorDetails;

//     // Import pool to get super admin emails
//     const { default: pool } = await import('../main.js');
    
//     // Get all super admin emails
//     const [admins] = await pool.execute(
//       'SELECT email, name FROM users WHERE role = "super_admin" AND deleted_at IS NULL'
//     );

//     if (admins.length === 0) {
//       console.log('⚠️  No super admins found to send critical error alert');
//       return { success: false, message: 'No super admins found' };
//     }

//     const adminPanelUrl = `${process.env.WEBSITE_URL}/admin-error-logs.html`;
    
//     const htmlContent = `
//       <!DOCTYPE html>
//       <html lang="en">
//       <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Critical Error Alert</title>
//         <style>
//           body {
//             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
//             line-height: 1.6;
//             color: #333;
//             max-width: 600px;
//             margin: 0 auto;
//             padding: 20px;
//             background-color: #f8f9fa;
//           }
//           .container {
//             background: white;
//             border-radius: 12px;
//             padding: 2rem;
//             box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//           }
//           .header {
//             background: linear-gradient(135deg, #e74c3c, #c0392b);
//             color: white;
//             padding: 1.5rem;
//             border-radius: 8px;
//             text-align: center;
//             margin-bottom: 2rem;
//             animation: pulse 2s infinite;
//           }
//           @keyframes pulse {
//             0%, 100% { opacity: 1; }
//             50% { opacity: 0.9; }
//           }
//           .header h1 {
//             margin: 0;
//             font-size: 1.5rem;
//           }
//           .alert-badge {
//             background: #fff;
//             color: #e74c3c;
//             padding: 0.5rem 1rem;
//             border-radius: 20px;
//             font-weight: bold;
//             display: inline-block;
//             margin-top: 0.5rem;
//           }
//           .error-details {
//             background: #fadbd8;
//             padding: 1.5rem;
//             border-radius: 8px;
//             border-left: 4px solid #e74c3c;
//             margin: 1.5rem 0;
//           }
//           .info-row {
//             display: flex;
//             justify-content: space-between;
//             margin-bottom: 0.75rem;
//             padding: 0.5rem 0;
//             border-bottom: 1px solid #f8d7da;
//           }
//           .info-row:last-child {
//             border-bottom: none;
//             margin-bottom: 0;
//           }
//           .label {
//             font-weight: 600;
//             color: #721c24;
//           }
//           .value {
//             color: #856404;
//             font-family: 'Courier New', monospace;
//             word-break: break-all;
//           }
//           .error-message {
//             background: #fff3cd;
//             padding: 1rem;
//             border-radius: 8px;
//             margin: 1rem 0;
//             border-left: 4px solid #ffc107;
//           }
//           .action-buttons {
//             text-align: center;
//             margin: 2rem 0;
//           }
//           .btn {
//             display: inline-block;
//             padding: 12px 24px;
//             background: linear-gradient(135deg, #e74c3c, #c0392b);
//             color: white;
//             text-decoration: none;
//             border-radius: 8px;
//             font-weight: 600;
//           }
//           .footer {
//             margin-top: 2rem;
//             padding-top: 1rem;
//             border-top: 1px solid #e9ecef;
//             font-size: 0.9rem;
//             color: #7f8c8d;
//             text-align: center;
//           }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>🚨 Critical Error Detected</h1>
//             <div class="alert-badge">IMMEDIATE ATTENTION REQUIRED</div>
//           </div>
          
//           <p><strong>A critical error has occurred in the system that requires immediate attention.</strong></p>
          
//           <div class="error-details">
//             <h3 style="margin-top: 0; color: #721c24;">Error Information</h3>
//             <div class="info-row">
//               <span class="label">Error ID:</span>
//               <span class="value">#${errorId}</span>
//             </div>
//             <div class="info-row">
//               <span class="label">Error Type:</span>
//               <span class="value">${errorType}</span>
//             </div>
//             <div class="info-row">
//               <span class="label">Timestamp:</span>
//               <span class="value">${new Date(timestamp).toLocaleString()}</span>
//             </div>
//             ${requestPath ? `
//             <div class="info-row">
//               <span class="label">Request Path:</span>
//               <span class="value">${requestPath}</span>
//             </div>
//             ` : ''}
//             ${userId ? `
//             <div class="info-row">
//               <span class="label">User ID:</span>
//               <span class="value">${userId}</span>
//             </div>
//             ` : ''}
//             ${userEmail ? `
//             <div class="info-row">
//               <span class="label">User Email:</span>
//               <span class="value">${userEmail}</span>
//             </div>
//             ` : ''}
//           </div>
          
//           <div class="error-message">
//             <h4 style="margin-top: 0; color: #856404;">Error Message:</h4>
//             <p style="margin-bottom: 0; font-family: 'Courier New', monospace;">${errorMessage}</p>
//           </div>
          
//           <div class="action-buttons">
//             <a href="${adminPanelUrl}" class="btn">View in Admin Panel</a>
//           </div>
          
//           <p><strong>Recommended Actions:</strong></p>
//           <ul>
//             <li>Review the error details in the admin panel</li>
//             <li>Check system logs for related issues</li>
//             <li>Verify system resources and database connectivity</li>
//             <li>Mark as resolved once fixed</li>
//           </ul>
          
//           <div class="footer">
//             <p>This is an automated critical error alert sent to all super administrators.</p>
//             <p>Error ID: #${errorId} | ${new Date(timestamp).toLocaleString()}</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;

//     const textContent = `
// 🚨 CRITICAL ERROR DETECTED 🚨

// A critical error has occurred in the system that requires immediate attention.

// Error Information:
// - Error ID: #${errorId}
// - Error Type: ${errorType}
// - Timestamp: ${new Date(timestamp).toLocaleString()}
// ${requestPath ? `- Request Path: ${requestPath}` : ''}
// ${userId ? `- User ID: ${userId}` : ''}
// ${userEmail ? `- User Email: ${userEmail}` : ''}

// Error Message:
// ${errorMessage}

// View in Admin Panel: ${adminPanelUrl}

// Recommended Actions:
// - Review the error details in the admin panel
// - Check system logs for related issues
// - Verify system resources and database connectivity
// - Mark as resolved once fixed

// This is an automated critical error alert sent to all super administrators.
// Error ID: #${errorId} | ${new Date(timestamp).toLocaleString()}
//     `;

//     // Send to all super admins
//     const emailPromises = admins.map(admin => {
//       const msg = {
//         to: admin.email,
//         from: EMAIL_CONFIG.from,
//         subject: `🚨 CRITICAL ERROR #${errorId} - Immediate Action Required`,
//         text: textContent,
//         html: htmlContent
//       };
//       return sgMail.send(msg);
//     });

//     await Promise.all(emailPromises);
    
//     console.log(`✅ Critical error alert sent to ${admins.length} super admin(s) for error #${errorId}`);
//     return { success: true, sentTo: admins.length };

//   } catch (error) {
//     console.error('Error sending critical error alert:', error);
//     return { success: false, error: error.message };
//   }
// };


// // Send 2FA verification code email
// export const send2FACodeEmail = async (userEmail, userName, code) => {
//   try {
//     const subjectLine = 'Your Login Verification Code';
    
//     const htmlContent = `
//       <!DOCTYPE html>
//       <html lang="en">
//       <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>2FA Verification Code</title>
//         <style>
//           body {
//             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
//             line-height: 1.6;
//             color: #333;
//             max-width: 600px;
//             margin: 0 auto;
//             padding: 20px;
//             background-color: #f8f9fa;
//           }
//           .container {
//             background: white;
//             border-radius: 12px;
//             padding: 2rem;
//             box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//           }
//           .header {
//             background: linear-gradient(135deg, #667eea, #764ba2);
//             color: white;
//             padding: 1.5rem;
//             border-radius: 8px;
//             text-align: center;
//             margin-bottom: 2rem;
//           }
//           .header h1 {
//             margin: 0;
//             font-size: 1.5rem;
//           }
//           .code-box {
//             background: #f8f9fa;
//             padding: 2rem;
//             border-radius: 8px;
//             text-align: center;
//             margin: 2rem 0;
//             border: 2px dashed #667eea;
//           }
//           .verification-code {
//             font-size: 2.5rem;
//             font-weight: bold;
//             color: #667eea;
//             letter-spacing: 0.5rem;
//             font-family: 'Courier New', monospace;
//           }
//           .warning-box {
//             background: #fff3cd;
//             padding: 1rem;
//             border-radius: 8px;
//             border-left: 4px solid #f39c12;
//             margin: 1rem 0;
//           }
//           .footer {
//             margin-top: 2rem;
//             padding-top: 1rem;
//             border-top: 1px solid #e9ecef;
//             font-size: 0.9rem;
//             color: #7f8c8d;
//             text-align: center;
//           }
//           @media (max-width: 600px) {
//             body { padding: 10px; }
//             .container { padding: 1rem; }
//             .verification-code { font-size: 2rem; letter-spacing: 0.3rem; }
//           }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>🔐 Login Verification</h1>
//             <p style="margin: 0; opacity: 0.9;">Your two-factor authentication code</p>
//           </div>
          
//           <p>Hi ${userName},</p>
          
//           <p>You're attempting to sign in to your account. To complete the login process, please use the verification code below:</p>
          
//           <div class="code-box">
//             <p style="margin: 0; font-size: 0.9rem; color: #7f8c8d; margin-bottom: 1rem;">Your Verification Code</p>
//             <div class="verification-code">${code}</div>
//             <p style="margin: 1rem 0 0 0; font-size: 0.9rem; color: #7f8c8d;">This code expires in 15 minutes</p>
//           </div>
          
//           <div class="warning-box">
//             <strong>⚠️ Security Notice:</strong> If you didn't attempt to log in, please ignore this email and consider changing your password. Someone may be trying to access your account.
//           </div>
          
//           <p><strong>Important:</strong></p>
//           <ul>
//             <li>Never share this code with anyone</li>
//             <li>Our team will never ask for this code</li>
//             <li>The code will expire in 15 minutes</li>
//             <li>You can request a new code if needed</li>
//           </ul>
          
//           <div class="footer">
//             <p>This is an automated security message.</p>
//             <p>If you didn't request this code, no action is needed.</p>
//             <p>&copy; ${new Date().getFullYear()} FARFETCH. All rights reserved.</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;

//     const textContent = `
//       Login Verification Code

//       Hi ${userName},

//       You're attempting to sign in to your account. To complete the login process, please use the verification code below:

//       YOUR VERIFICATION CODE: ${code}

//       This code expires in 15 minutes.

//       ⚠️ Security Notice: If you didn't attempt to log in, please ignore this email and consider changing your password. Someone may be trying to access your account.

//       Important:
//       - Never share this code with anyone
//       - Our team will never ask for this code
//       - The code will expire in 15 minutes
//       - You can request a new code if needed

//       This is an automated security message.
//       If you didn't request this code, no action is needed.

//       © ${new Date().getFullYear()} FARFETCH. All rights reserved.
//     `;

//     const msg = {
//       to: userEmail,
//       from: EMAIL_CONFIG.from,
//       subject: subjectLine,
//       text: textContent,
//       html: htmlContent
//     };

//     await sgMail.send(msg);
//     console.log(`2FA code email sent to ${userEmail}`);
//     return { success: true };

//   } catch (error) {
//     console.error('Error sending 2FA code email:', error);
//     return { success: false, error: error.message };
//   }
// };