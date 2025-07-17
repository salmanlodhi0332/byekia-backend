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
    otp
  } = req.body;

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
    const userImageFile = req.files?.userImage?.[0];
    const userImage = userImageFile ? userImageFile.filename : '';

    // Insert into users_table with userImage
    const [userResult] = await db.execute(`
      INSERT INTO users_table
        (name, email, \`phone number\`, userRole, isVerified, isActive, userImage, creationDate, updatedDate)
      VALUES (?, ?, ?, ?, 0, 0, ?, NOW(), NOW())
    `, [
      name, email, phone_number || '', userRole, userImage
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



////------------------------------------------------------------------------------------------------------------------------------------------

exports.login = async (req, res) => {
  const { email, password } = req.body;

  console.log("api/login", req.body);

  if (!email || !password) {
    return res.status(400).json({
      status: 400,
      message: 'Email and password are required.'
    });
  }

  try {
    // Step 1: Check if user exists
    const [users] = await db.execute('SELECT * FROM user_table WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(404).json({
        status: 404,
        message: 'User not found.'
      });
    }

    const user = users[0];

    // Step 2: Check password
    const isPasswordCorrect = await bcrypt.compare(password, user.password || '');
    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: 401,
        message: 'Invalid password.'
      });
    }

    // Step 3: Generate and store OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore.set(email, {
      otp,
      purpose: 'login',
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    sendRegistrationOtp(email, otp); // send via email

    res.status(200).json({
      status: 200,
      message: 'OTP sent for login.',
      data: { otp } // only for testing/demo
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      status: 500,
      message: 'Login failed.',
      error: error.message
    });
  }
};

exports.verifyLoginOtp = async (req, res) => {
  const { email, otp, device_id } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ status: 400, message: 'Email and OTP are required.' });
  }

  const storedOtpData = otpStore.get(email);

  if (
    !storedOtpData ||
    storedOtpData.otp !== otp ||
    storedOtpData.purpose !== 'login' ||
    Date.now() > storedOtpData.expiresAt
  ) {
    return res.status(400).json({ status: 400, message: 'Invalid or expired OTP.' });
  }

  try {
    const [users] = await db.execute('SELECT * FROM user_table WHERE email = ?', [email]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.' });
    }

    // ✅ Update device_id for single-device login logic
    await db.execute('UPDATE user_table SET device_id = ? WHERE id = ?', [device_id || null, user.id]);
    
     const [userData] = await db.execute('SELECT * FROM user_table WHERE email = ?', [email]);
     
     const userObj = userData[0];
    
     const token = jwt.sign(
      { userObj },
      process.env.JWT_SECRET || "default_jwt_secret"
    );

    const { password: _, ...safeUser } = user;

    otpStore.delete(email);

    res.status(200).json({
      status: 200,
      message: 'Login successful.',
      token,
      data: userObj
    });

  } catch (error) {
    res.status(500).json({
      status: 500,
      message: 'OTP verification failed.',
      error: error.message
    });
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
    const [users] = await db.execute('SELECT * FROM user_table WHERE email = ?', [email]);
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
    data: {}
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
    await db.execute('UPDATE user_table SET password = ? WHERE email = ?', [hashed, email]);
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


exports.socialAuth = async (req, res) => {
  const { username, email, phone_number, authentication_type, device_id } = req.body;

  if (!email || !authentication_type) {
    return res.status(400).json({
      status: 400,
      message: 'Email and authentication type are required.'
    });
  }

  try {
    const [users] = await db.execute('SELECT * FROM user_table WHERE email = ?', [email]);

    if (users.length > 0) {
      const user = users[0];

      // ✅ Update device_id for existing user
      await db.execute('UPDATE user_table SET device_id = ? WHERE id = ?', [device_id || null, user.id]);


     const [userData] = await db.execute('SELECT * FROM user_table WHERE email = ?', [email]);
     
     const userObj = userData[0];
    
     const token = jwt.sign(
      { userObj },
      process.env.JWT_SECRET || "default_jwt_secret"
    );

      return res.status(200).json({
        status: 200,
        message: 'Login successful.',
        data: { token, userObj }
      });
    }

    // ✅ Insert new user with device_id
    const [result] = await db.execute(
      'INSERT INTO user_table (username, email, phone_number, authentication_type, device_id) VALUES (?, ?, ?, ?, ?)',
      [username || '', email, phone_number || '', authentication_type, device_id || null]
    );

    const [newUser] = await db.execute('SELECT * FROM user_table WHERE id = ?', [result.insertId]);

    const token = jwt.sign(
      { id: result.insertId },
      process.env.JWT_SECRET || "default_jwt_secret"
    );

    res.status(201).json({
      status: 201,
      message: 'Social login successful.',
      data: { token, user: newUser[0] }
    });

  } catch (error) {
    res.status(500).json({
      status: 500,
      message: 'Social login failed.',
      error: error.message
    });
  }
};


exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.execute('SELECT * FROM user_table');
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
    const [user] = await db.execute('SELECT * FROM user_table WHERE id = ?', [req.params.id]);
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
  const { username, phone_number } = req.body;
  const userId = req.params.id;
  const profileImage = req.file ? req.file.path : null;

  console.log(req.body);
  console.log('File uploaded:', req.file);

  try {
    const fields = [];
    const values = [];

    if (username) {
      fields.push("username = ?");
      values.push(username);
    }

    if (phone_number) {
      fields.push("phone_number = ?");
      values.push(phone_number);
    }

    if (profileImage) {
      fields.push("profile_image_url = ?");
      values.push(profileImage);
    }

    if (fields.length === 0) {
      return res.status(400).json({ statusCode: 400, message: "No data provided for update." });
    }

    values.push(userId);

    const updateQuery = `UPDATE user_table SET ${fields.join(', ')} WHERE id = ?`;
    await db.execute(updateQuery, values);

    // ✅ Fetch updated user
    const [userRows] = await db.execute('SELECT id, username, phone_number, profile_image_url FROM user_table WHERE id = ?', [userId]);

    res.status(200).json({
      status: 200,
      message: 'User updated successfully.',
      data: userRows[0] || {}
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: 'Update failed.',
      error: error.message
    });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    await db.execute('DELETE FROM user_table WHERE id = ?', [req.params.id]);
    await db.execute('DELETE FROM chat_table WHERE user_id = ?', [req.params.id]);
    await db.execute('DELETE FROM user_subscriptions WHERE user_id = ?', [req.params.id]);
    res.status(200).json({
      status: 200,
      message: 'User deleted successfully.',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: 'Delete failed.',
      error: error.message
    });
  }
};


exports.updateUsertype = async (req, res) => {
  const { user_id, usertype } = req.body;

  // Basic validation
  if (!user_id || !usertype) {
    return res.status(400).json({
      status: 400,
      message: 'Missing required fields: user_id and usertype.'
    });
  }

  try {
    const allowedTypes = [
      'Homeowners Assistant',
      'HVAC Contractors Assistant',
      'Builder Assistant',
      'Architect Assistant'
    ];
    if (!allowedTypes.includes(usertype)) {
      return res.status(400).json({
        status: 400,
        message: `Invalid usertype. Allowed values: ${allowedTypes.join(', ')}.`
      });
    }

    // 1. Update usertype
    const [updateResult] = await db.execute(
      'UPDATE user_table SET usertype = ? WHERE id = ?',
      [usertype, user_id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        status: 404,
        message: 'User not found.'
      });
    }

    // 2. Check if user already has a subscription
    const [existingSubs] = await db.execute(
      'SELECT id FROM user_subscriptions WHERE user_id = ? AND is_active = 1',
      [user_id]
    );

    if (existingSubs.length === 0) {
      // 3. Get Free Plan for the new usertype (or global Free plan)
      const [planRows] = await db.execute(
        `SELECT id FROM subscription_plans 
         WHERE (usertype = ? OR usertype = 'free') AND price = 0.00
         ORDER BY usertype = 'free' DESC LIMIT 1`,
        [usertype]
      );

      if (planRows.length > 0) {
        const plan_id = planRows[0].id;

        // Assign free plan
        const today = new Date();
        const end = new Date();
        end.setMonth(end.getMonth() + 1); // 1-month free by default

        await db.execute(
          `INSERT INTO user_subscriptions 
           (user_id, plan_id, start_date, end_date, payment_gateway, payment_status, transaction_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            user_id,
            plan_id,
            today.toISOString().slice(0, 10),
            end.toISOString().slice(0, 10),
            'Free',
            'paid',
            'free-initial'
          ]
        );
      }
    }

    res.status(200).json({
      status: 200,
      message: 'Usertype updated and free plan assigned (if applicable).',
      user_id,
      usertype
    });

  } catch (error) {
    console.error('Error updating usertype and assigning free plan:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to update usertype and assign free plan.',
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
