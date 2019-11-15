const express = require('express');
const authController = require('../controllers/authController');
const { protectRoute } = require('../utils/middlewares');

const router = express.Router();

router.post('/signup', authController.signUp);
router.post('/login', authController.login);
router.post('/reset-password/:resetToken', authController.resetPassword);
router.post('/forgot-password', authController.forgotPassword);

router.get('/logout', protectRoute, authController.logout);

module.exports = router;