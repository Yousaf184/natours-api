const crypto = require('crypto');
const User = require('../models/user');
const { createJwtToken } = require('../utils/utils');
const Email = require('../utils/email');
const CustomError = require('../utils/customError');
const { successResponse, successResponseWithToken } = require('../utils/customResponse');
const {
    INVALID_LOGIN_ERROR,
    PASSWORD_RESET_ERROR,
} = require('../utils/constants');

const signUp = async (req, res, next) => {
    try {
        let user = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            passwordConfirm: req.body.passwordConfirm
        });

        await user.save();

        const token = await createJwtToken(user._id);
        successResponseWithToken(res, token, 'user registered successfully');

    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            throw new CustomError(INVALID_LOGIN_ERROR, 'please provide email and password');
        }

        // select method called because password field is hidden
        // in user schema by default
        const user = await User.findOne({ email }).select('+password');
        let correct;

        if (user) {
            correct = await user.verifyPassword(password);
        }

        if (!user || !correct) {
            throw new CustomError(INVALID_LOGIN_ERROR, 'incorrect email/password combination');
        }

        const token = await createJwtToken(user._id);
        successResponseWithToken(res, token, null);

    } catch(error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (user) {
            const passwordResetToken = await user.createPasswordResetToken();
            const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/reset-password/${passwordResetToken}`;

            const emailData = {
                userName: user.name,
                passwordResetLink: resetUrl
            };

            new Email(user.email).sendPasswordResetEmail(emailData);
        }

        // this response will be sent even when there's no user with given email
        // because we don't want to tell the user that there's no user in our database
        // with given email
        res.status(200).json(successResponse(null, 'if user with a given email exists, email to reset password has been sent'));

    } catch(error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    let passwordResetToken = req.params.resetToken;
    let user;

    // password reset token saved in database is encrypted
    // encrypt the reset token received in params and then
    // search for user with encrypted reset token
    passwordResetToken = crypto
                            .createHash('sha256')
                            .update(passwordResetToken)
                            .digest('hex');

    try {
        user = await User.findOne({ passwordResetToken });
        if (!user) {
            throw new CustomError(PASSWORD_RESET_ERROR, 'invalid password reset token');
        }

        const hasTokenExpired = Date.now() > user.passwordResetTokenExpiry;

        if (hasTokenExpired) {
            user.removePasswordResetToken();
            await user.save({ validateBeforeSave: false });

            throw new CustomError(PASSWORD_RESET_ERROR, 'password reset token expired');
        }

        user.password = req.body.newPassword;
        user.passwordConfirm = req.body.passwordConfirm;
        user.removePasswordResetToken();
        await user.save();

        res.status(200).json(successResponse(null, 'password reset successful'));

    } catch(error) {
        next(error);
    }
};

module.exports = {
    signUp,
    login,
    forgotPassword,
    resetPassword,
};