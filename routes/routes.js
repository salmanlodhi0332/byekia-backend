
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const fcmController = require('../controllers/notificationController');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');
// Auth
router.post('/Registration', userController.Registration);
router.post('/verify-registration',upload.fields([{ name: 'userImage', maxCount: 1 },{ name: 'docs', maxCount: 10 }]),userController.verifyRegistrationOtp);
router.post('/verifyUser', userController.verifyUser);//-----admin api
router.post('/login', userController.login);

// Password Flow
router.post('/forget-password', userController.forgetPassword);
router.post('/verify-otp', userController.verifyOtp);
router.post('/reset-password', userController.resetPassword);
router.post('/resendOtp', userController.resendOtp);

// User
router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUserById);
router.delete('/users/:id',authenticate,userController.deleteUser);
router.put('/users/:id',authenticate,upload.single('userImage'),userController.updateUser);

// Notification
router.post('/fcmtokenStore', fcmController.storeFcmToken);


module.exports = router;




