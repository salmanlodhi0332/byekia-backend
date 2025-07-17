const jwt = require('jsonwebtoken');
const db = require('../config/db');

module.exports = async (req, res, next) => {
  let token = req.headers['authorization'];
  console.log("token:", token);

  if (!token) {
    return res.status(403).json({ error: 'No token provided' });
  }

  // Remove 'Bearer ' prefix if present
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret");
    console.log("Decoded token:", decoded);

    // ✅ Get id and device_id from userObj
    const userId = decoded.userObj?.id;
    const tokenDeviceId = decoded.userObj?.device_id;

    if (!userId || !tokenDeviceId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    // Check device ID in DB
    const [rows] = await db.execute('SELECT device_id FROM user_table WHERE id = ?', [userId]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.device_id !== tokenDeviceId) {
      return res.status(401).json({ error: 'Logged in from another device.' });
    }

    // Attach userId to request
    req.userId = userId;
    next();

  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
