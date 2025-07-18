const db = require('../config/db');

exports.storeFcmToken = async (req, res) => {
  const { userId, fcmtoken, deviceID } = req.body;

  if (!userId || !fcmtoken || !deviceID) {
    return res.status(400).json({
      status: 400,
      message: 'userId, fcmtoken, and deviceID are required.'
    });
  }

  try {
    // Optional: Check if token for this device already exists for user
    const [existing] = await db.execute(
      'SELECT * FROM FCMtoken_table WHERE userId = ? AND deviceID = ?',
      [userId, deviceID]
    );

    if (existing.length > 0) {
      // Update existing token
      await db.execute(
        'UPDATE FCMtoken_table SET fcmtoken = ?, updatedDate = NOW() WHERE id = ?',
        [fcmtoken, existing[0].id]
      );
    } else {
      // Insert new token
      await db.execute(
        'INSERT INTO FCMtoken_table (fcmtoken, deviceID, userId, creationDate, updatedDate) VALUES (?, ?, ?, NOW(), NOW())',
        [fcmtoken, deviceID, userId]
      );
    }

    res.status(200).json({
      status: 200,
      message: 'FCM token saved successfully.'
    });

  } catch (error) {
    console.error("FCM Token Error:", error);
    res.status(500).json({
      status: 500,
      message: 'Failed to save FCM token.',
      error: error.message
    });
  }
};
