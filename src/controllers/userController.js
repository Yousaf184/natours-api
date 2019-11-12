const User = require('../models/user');
const { createJwtToken, deleteImage } = require('../utils/utils');
const multer = require('multer');
const CustomError = require('../utils/customError');
const { successResponse, successResponseWithToken } = require('../utils/customResponse');
const MulterConfig = require('../utils/multer-config');
const {
    PASSWORD_UPDATE_ERROR,
    USER_PROFILE_UPDATE_ERROR,
    DISK_STORAGE
} = require('../utils/constants');

const getUser = async (req, res, next) => {
    return res.status(200).json(successResponse(req.user, null));
};

const updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword, passwordConfirm } = req.body;

        if (!currentPassword || !newPassword || !passwordConfirm) {
            throw new CustomError(PASSWORD_UPDATE_ERROR, 'provide current password and new password');
        }

        // select method called because password field is hidden
        // in user schema by default
        const user = await User.findById(req.user._id).select('+password');
        const isCurrentPassCorrect = await user.verifyPassword(currentPassword);

        if (!isCurrentPassCorrect) {
            throw new CustomError(PASSWORD_UPDATE_ERROR, 'current password is incorrect');
        }

        user.password = newPassword;
        user.passwordConfirm = passwordConfirm;
        await user.save();

        // send back jwt token along with password update success message
        const token = await createJwtToken(req.user._id);
        successResponseWithToken(res, token, 'password updated successfully');

    } catch(error) {
        next(error);
    }
};

// called before updating user profile info
// check if req.body contains user password or role
// if password or role is present, throw error
// password cannot be upadte through /users/me route
// and role cannot be updated by user
const removepasswordOrRoleFromReqBody = (req, res, next) => {
    try {
        if (req.body.password || req.body.passwordConfirm) {
            throw new CustomError(
                USER_PROFILE_UPDATE_ERROR,
                'password cannot be updated using this route'
            );
        }

        if (req.body.role) {
            throw new CustomError(
                USER_PROFILE_UPDATE_ERROR,
                'user cannot update his/her role'
            );
        }

        next();

    } catch (error) {
        next(error);
    }
};

// returns multer configuration for uploading user's profile image
const uploadUserImage = multer(
    new MulterConfig(
        'uploaded-images/users',
        500000 /* 0.5MB */,
        ['image/png', 'image.jpeg'],
        DISK_STORAGE
    )
);

// should not be used to update password,
// there's a separate route for updating password
const updateMe = async (req, res, next) => {
    try {
        // if user uploaded any profile image then add uploaded image
        // path to req.body so that it can be added in user's document in database
        if (req.file) {
            // if user previously uploaded a profile image,
            // remove previously uploaded profile image if its name
            // only if req.file.path and user.profileImage are not same
            if (req.user.profileImage && req.user.profileImage !== req.file.path) {
                deleteImage(req.user.profileImage);
            }

            req.body.profileImage = req.file.path;
        }

        const updatedUser = await User.findOneAndUpdate({ _id: req.user._id }, req.body, {
            runValidators: true,
            new: true
        });

        res.status(200).json(successResponse(updatedUser, 'user updated successfully'));

    } catch (error) {
        next(error);
    }
};

const deleteMe = async (req, res, next) => {
    try {
        await User.deleteOne({ _id: req.user._id });
        res.status(200).json(successResponse(null, 'account removed successfully'));
    } catch(error) {
        next(error);
    }
};

module.exports = {
    getUser,
    removepasswordOrRoleFromReqBody,
    updatePassword,
    updateMe,
    deleteMe,
    uploadUserImage
};