const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signUp);
router.post('/login', authController.login);
router.post('/reset-password/:resetToken', authController.resetPassword);
router.post('/forgot-password', authController.forgotPassword);

module.exports = router;