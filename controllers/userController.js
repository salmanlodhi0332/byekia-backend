const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendResetPassword, sendPasswordResetOtp, sendRegistrationOtp } = require('../utils/emailSender');

// In-memory OTP store (for demo)
const otpStore = new Map();

// Register 
// Send OTP to email
exports.Registration = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ status: 400, message: 'Email is required.' });
  }

  try {
    const [existingUser] = await db.execute('SELECT * FROM users_table WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ status: 400, message: 'User already exists.' });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore.set(email, { otp, purpose: 'register', expiresAt: Date.now() + 5 * 60 * 1000 });

    await sendRegistrationOtp(email, otp); // Replace with actual sender

    return res.status(200).json({
      status: 200,
      message: 'OTP sent to email.',
      data: { otp } // Only for testing, remove in production
    });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Failed to send OTP.', error: error.message });
  }
};


exports.verifyRegistrationOtp = async (req, res) => {
  const {
    name,
    email,
    phone_number,
    userRole,
    otp,
    password
  } = req.body;

  if (!email || !otp || !name || !userRole || !password) {
    return res.status(400).json({ status: 400, message: 'Missing required fields.' });
  }

  const storedOtp = otpStore.get(email);

  if (
    !storedOtp ||
    storedOtp.otp !== otp ||
    storedOtp.purpose !== 'register' ||
    Date.now() > storedOtp.expiresAt
  ) {
    return res.status(400).json({ status: 400, message: 'Invalid or expired OTP.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const userImageFile = req.files?.userImage?.[0];
    const userImage = userImageFile ? userImageFile.filename : '';

    // Insert into users_table with hashed password and userImage
    const [userResult] = await db.execute(`
      INSERT INTO users_table
        (name, email, \`phone number\`, userRole, password, isVerified, isActive, userImage, creationDate, updatedDate)
      VALUES (?, ?, ?, ?, ?, 0, 0, ?, NOW(), NOW())
    `, [
      name, email, phone_number || '', userRole, hashedPassword, userImage
    ]);

    const userId = userResult.insertId;

    // Insert into users_docs_table for each uploaded doc
    const docFiles = req.files?.docs || [];
    if (docFiles.length > 0) {
      const insertPromises = docFiles.map(file => {
        return db.execute(`
          INSERT INTO users_docs_table (userId, docs, creationDate, updatedDate)
          VALUES (?, ?, NOW(), NOW())
        `, [userId, file.filename]);
      });
      await Promise.all(insertPromises);
    }

    otpStore.delete(email);

    const [userRow] = await db.execute('SELECT * FROM users_table WHERE id = ?', [userId]);

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'default_jwt_secret');

    res.status(201).json({
      status: 201,
      message: 'User registered successfully with documents.',
      token,
      data: userRow[0]
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ status: 500, message: 'Registration failed.', error: error.message });
  }
};
// Manually verify user (e.g. via admin or user link confirmation)
exports.verifyUser = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ status: 400, message: 'Email is required.' });

  try {
    const [result] = await db.execute(
      'UPDATE users_table SET isVerified = 1,isActive = 1, updatedDate = NOW() WHERE email = ?',
      [email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 404, message: 'User not found.' });
    }

    res.status(200).json({ status: 200, message: 'User verified successfully.' });

  } catch (error) {
    res.status(500).json({ status: 500, message: 'Verification failed.', error: error.message });
  }
};


exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 400, message: 'Email and password are required.' });
  }

  try {
    const [userResult] = await db.execute('SELECT * FROM users_table WHERE email = ?', [email]);

    if (userResult.length === 0) {
      return res.status(404).json({ status: 404, message: 'User not found.' });
    }

    const user = userResult[0];

    if (user.isVerified !== 1) {
      return res.status(403).json({ status: 403, message: 'User is not verified.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ status: 401, message: 'Invalid password.' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'default_jwt_secret');

    res.status(200).json({
      status: 200,
      message: 'Login successful.',
      token,
      data: user
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ status: 500, message: 'Login failed.', error: error.message });
  }
};



exports.forgetPassword = async (req, res) => {
  const { email } = req.body;
  console.log("api/forgetPassword", req.body);

  if (!email) {
    return res.status(400).json({
      status: 400,
      message: 'Email is required.'
    });
  }

  try {
    const [users] = await db.execute('SELECT * FROM users_table WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({
        status: 404,
        message: 'User not found.'
      });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore.set(email, { otp, purpose: 'forgetPassword', expiresAt: Date.now() + 5 * 60 * 1000 });

    sendPasswordResetOtp(email, otp);

    res.status(200).json({
      status: 200,
      message: 'OTP sent for password reset.',
      data: { otp } // only for testing
    });

  } catch (error) {
    res.status(500).json({
      status: 500,
      message: 'Failed to send OTP.',
      error: error.message
    });
  }
};


exports.verifyOtp = (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      status: 400,
      message: 'Email and OTP are required.'
    });
  }

  const stored = otpStore.get(email);

  if (
    !stored ||
    stored.otp.toString() !== otp.toString() ||
    stored.purpose !== 'forgetPassword' ||
    stored.expiresAt < Date.now()
  ) {
    return res.status(400).json({
      status: 400,
      message: 'Invalid or expired OTP.'
    });
  }

  // Invalidate the OTP after successful use
  otpStore.delete(email);

  return res.status(200).json({
    status: 200,
    message: 'OTP verified successfully.',
  });
};


exports.resetPassword = async (req, res) => {
  const { email, new_password } = req.body;

  if (!email || !new_password) {
    return res.status(400).json({
      status: 400,
      message: 'Email and new password are required.'
    });
  }

  try {
    const hashed = await bcrypt.hash(new_password, 10);
    await db.execute('UPDATE users_table SET password = ? WHERE email = ?', [hashed, email]);
    otpStore.delete(email);

    res.status(200).json({
      status: 200,
      message: 'Password reset successfully.',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: 'Password reset failed.',
      error: error.message
    });
  }
};



exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.execute('SELECT * FROM users_table');
    res.status(200).json({
      status: 200,
      message: 'Users fetched successfully.',
      data: users
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: 'Failed to fetch users.',
      error: error.message
    });
  }
};


exports.getUserById = async (req, res) => {
  try {
    const [user] = await db.execute('SELECT * FROM users_table WHERE id = ?', [req.params.id]);
    res.status(200).json({
      status: 200,
      message: 'User fetched successfully.',
      data: user[0] || null
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: 'Failed to fetch user.',
      error: error.message
    });
  }
};


exports.updateUser = async (req, res) => {
  const { name, phone_number } = req.body;
  const userId = req.params.id;
  const userImage = req.file ? req.file.filename : null;

  try {
    const fields = [];
    const values = [];

    if (name) {
      fields.push("name = ?");
      values.push(name);
    }

    if (phone_number) {
      fields.push("`phone number` = ?");
      values.push(phone_number);
    }

    if (userImage) {
      fields.push("userImage = ?");
      values.push(userImage);
    }

    if (fields.length === 0) {
      return res.status(400).json({ status: 400, message: "No data provided for update." });
    }

    fields.push("updatedDate = NOW()");
    values.push(userId);

    const updateQuery = `UPDATE users_table SET ${fields.join(', ')} WHERE id = ?`;
    await db.execute(updateQuery, values);

    // Fetch updated user
    const [userRows] = await db.execute(
      'SELECT id, name, email, `phone number`, userRole, userImage, isVerified, isActive FROM users_table WHERE id = ?',
      [userId]
    );

    res.status(200).json({
      status: 200,
      message: 'User updated successfully.',
      data: userRows[0] || {}
    });

  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({
      status: 500,
      message: 'Update failed.',
      error: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    // 1. Delete userImage file (if needed)
    const [userRows] = await db.execute('SELECT userImage FROM users_table WHERE id = ?', [userId]);
    if (userRows.length > 0 && userRows[0].userImage) {
      const profilePath = path.join(__dirname, '../public/profiles', userRows[0].userImage);
      if (fs.existsSync(profilePath)) fs.unlinkSync(profilePath);
    }

    // 2. Delete user documents (files + records)
    const [docs] = await db.execute('SELECT docs FROM users_docs_table WHERE userId = ?', [userId]);
    docs.forEach(doc => {
      const docPath = path.join(__dirname, '../public/docs', doc.docs);
      if (fs.existsSync(docPath)) fs.unlinkSync(docPath);
    });
    await db.execute('DELETE FROM users_docs_table WHERE userId = ?', [userId]);

    // 3. Get ride IDs where user is either userId or riderId
    const [rideRows] = await db.execute(`
      SELECT id FROM Ride_details_table WHERE userId = ? OR riderId = ?
    `, [userId, userId]);

    const rideIds = rideRows.map(ride => ride.id);
    if (rideIds.length > 0) {
      const placeholders = rideIds.map(() => '?').join(',');
      await db.execute(`DELETE FROM ride_review_table WHERE rideId IN (${placeholders})`, rideIds);
      await db.execute(`DELETE FROM Ride_details_table WHERE id IN (${placeholders})`, rideIds);
    }

    // 4. Delete related FCM tokens and notifications
    await db.execute('DELETE FROM FCMtoken_table WHERE userId = ?', [userId]);
    await db.execute('DELETE FROM Notification_table WHERE userId = ?', [userId]);

    // 5. Finally, delete the user
    await db.execute('DELETE FROM users_table WHERE id = ?', [userId]);

    res.status(200).json({
      status: 200,
      message: 'User and all related data deleted successfully.',
      data: {}
    });

  } catch (error) {
    console.error('User Deletion Error:', error);
    res.status(500).json({
      status: 500,
      message: 'User deletion failed.',
      error: error.message
    });
  }
};


exports.resendOtp = async (req, res) => {
  const { email, purpose } = req.body;

  console.log("api/resendOtp", req.body);

  if (!email || !purpose) {
    return res.status(400).json({
      status: 400,
      message: 'Both email and purpose are required.'
    });
  }

  try {
    // Validate user existence if purpose is login or forgetPassword
    if (purpose === 'login' || purpose === 'forgetPassword') {
      const [users] = await db.execute('SELECT * FROM user_table WHERE email = ?', [email]);
      if (users.length === 0) {
        return res.status(404).json({
          status: 404,
          message: 'User not found.'
        });
      }
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore.set(email, { otp, purpose, expiresAt: Date.now() + 5 * 60 * 1000 });

    // Send OTP depending on purpose
    if (purpose === 'login' || purpose === 'register') {
      sendRegistrationOtp(email, otp);
    } else if (purpose === 'forgetPassword') {
      sendPasswordResetOtp(email, otp);
    } else {
      return res.status(400).json({
        status: 400,
        message: 'Invalid purpose. Allowed: login, register, forgetPassword.'
      });
    }

    res.status(200).json({
      status: 200,
      message: `OTP resent for ${purpose}.`,
      data: { otp } // Only for testing
    });

  } catch (error) {
    console.error('Error in resendOtp:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to resend OTP.',
      error: error.message
    });
  }
};
