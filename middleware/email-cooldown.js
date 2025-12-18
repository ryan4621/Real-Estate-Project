//email-cooldown.js
import pool from "../database.js";

// Store cooldown in database
export async function checkVerificationCooldown(req, res, next) {
  try {
    const email = req.body.email;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check last verification email sent time
    const [userResults] = await pool.execute(
      `SELECT last_verification_sent 
       FROM users 
       WHERE email = ?`,
      [email]
    );

    const [pendingResults] = await pool.execute(
      `SELECT last_verification_sent FROM pending_registrations WHERE email = ?`,
      [email]
    );

    if (userResults.length === 0 && pendingResults.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const lastSent = userResults.length > 0
    ? userResults[0].last_verification_sent
    : pendingResults[0].last_verification_sent;
    
    if (lastSent) {
      const now = new Date();
      const cooldownPeriod = 60 * 1000; // 60 seconds
      const timeSinceLastSent = now - new Date(lastSent);
      
      if (timeSinceLastSent < cooldownPeriod) {
        const remainingSeconds = Math.ceil((cooldownPeriod - timeSinceLastSent) / 1000);
        return res.status(429).json({ 
          message: 'Please wait before requesting another verification email',
          remainingSeconds,
          cooldownSeconds: 60
        });
      }
    }

    next();
  } catch (error) {
    console.error('Cooldown check error:', error);
    next(error);
  }
}

// Update last sent timestamp
export async function updateVerificationTimestamp(email) {
  try {
    await pool.execute(
      `UPDATE users 
       SET last_verification_sent = NOW() 
       WHERE email = ?`,
      [email]
    );

    await pool.execute(
      `UPDATE pending_registrations SET last_verification_sent = NOW() WHERE email = ?`,
      [email]
    );
    
  } catch (error) {
    console.error('Error updating verification timestamp:', error);
    throw error;
  }
}