const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const CustomError = require('./customError');
const {
    UNDEFINED_ROUTE_ERROR,
    INVALID_LOGIN_ERROR,
    UNAUTHENTICATED,
    ERROR,
    UNAUTHORIZED,
    PASSWORD_RESET_ERROR,
    PASSWORD_UPDATE_ERROR,
    USER_PROFILE_UPDATE_ERROR,
    NOT_FOUND_ERROR,
    INVALID_REQUEST_ERROR,
    FILE_UPLOAD_ERROR
} = require('./constants');

const isNumber = (val) => {
    return /^[0-9]+$/.test(val);
};

const validateGeospatialQueryParams = (distance, lat, lng, unit) => {
    let errorMessage;

    // if distance paramter is not a number
    if (distance && !isNumber(distance)) {
        errorMessage = 'distance parameter should be number';
    }

    // if latitude and longitude are not provided in correct format
    // or are not numbers
    if (
        !errorMessage &&
        (!lat || !lng) &&
        (!isNumber(lat) || !isNumber(lng))
    ) {
        errorMessage = 'latitutde and longitude should be numbers and should be separated by comma';
    }

    // if unit provided is anything other than 'km' or 'mi'
    if (!errorMessage && unit && !['mi', 'km'].includes(unit)) {
        errorMessage = 'invalid unit provided, allowed units are (mi, km)';
    }

    if (errorMessage) {
        throw new CustomError(INVALID_REQUEST_ERROR, errorMessage);
    }
};

// delete the image file saved on the server
const deleteImage = (imagePath) => {
    try {
        const imageFilePath = path.join(__dirname, '..', '..', imagePath);
        fs.unlink(imageFilePath, (error) => {
            if (error) { console.log(error.message); }
        });

    } catch (error) {
        console.log(error.message);
    }
}

const createJwtToken = async (userID) => {
    // promisify will make jwt.sign function return promise
    const asyncJwtSign = promisify(jwt.sign);
    const jwtToken = await asyncJwtSign({ id: userID }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });

    return jwtToken;
};

/**
 * extracts error field and error message from each entry in 'validationErrors'
 * and adds new object in to 'errorsArr' with error field as 'name' property
 * and error message as 'message' property
 *
 * @param {object} validationErrors - mongoose validation error object
 * @param {array} errorsArr - empty array in which new error object will be pushed
 */
const extractValidationErrors = (validationErrors, errorsArr) => {
    const errorKeys = Object.keys(validationErrors);

    errorKeys.forEach(errKey => {
        errorsArr.push({
            name: errKey,
            message: validationErrors[errKey].message
        });
    });
};

// express error handler
// checks for name of the error and then adds appropriate
// error name and error message to 'errorResponse' object
const errorHandler = (error, req, res, next) => {
    console.log('inside express error handler');
    console.log(error.name);

    let statusCode = 400;
    const errorResponse = {
        status: ERROR,
    };

    if (error.name === 'ValidationError') {
        errorResponse.errors = [];
    } else {
        errorResponse.error = {};
    }

    switch(error.name) {
        case 'ValidationError':
            extractValidationErrors(error.errors, errorResponse.errors);
            break;

        case UNDEFINED_ROUTE_ERROR:
            statusCode = 404;
            errorResponse.error = { name: error.name, message: error.message };
            break;

        case 'JsonWebTokenError':
        case 'TokenExpiredError':
        case UNAUTHENTICATED:
            statusCode = 401;
            errorResponse.error = {
                name: UNAUTHENTICATED,
                message: 'access denied, you are not logged in'
            };
            break;

        case UNAUTHORIZED:
            statusCode = 403;
            errorResponse.error = { name: error.name, message: error.message };
            break;

        case 'CastError':
        case 'MongoError':
        case INVALID_LOGIN_ERROR:
        case PASSWORD_RESET_ERROR:
        case PASSWORD_UPDATE_ERROR:
        case USER_PROFILE_UPDATE_ERROR:
        case NOT_FOUND_ERROR:
        case INVALID_REQUEST_ERROR:
        case FILE_UPLOAD_ERROR:
            errorResponse.error = { name: error.name, message: error.message };
            break;

        default:
            statusCode = 500;
            errorResponse.error = 'something went wrong, we are working on fixing it';

    }

    res.status(statusCode).json(errorResponse);
};

module.exports = {
    createJwtToken,
    errorHandler,
    validateGeospatialQueryParams,
    deleteImage
};