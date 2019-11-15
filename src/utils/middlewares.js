const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const CustomError = require('./customError');
const { UNAUTHENTICATED, UNAUTHORIZED } = require('./constants');

const protectRoute = async (req, res, next) => {
    let token;

    try {
        // 1. check for token in Authorization header or cookies
        let authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer')) {
            token = authHeader.split(' ')[1];
        } else if (req.cookies && req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            throw new CustomError(UNAUTHENTICATED, '');
        }

        // 2. verify JWT token
        const decodedToken = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

        // 3. check if user still exists in the database
        const user = await User.findById(decodedToken.id);
        if (!user) {
            throw new CustomError(UNAUTHENTICATED, '');
        }

        // 4. check if user chenged password after JWT token was issued
        if (user.isPasswordChangedAfterTokenIssued(decodedToken.iat)) {
            throw new CustomError(UNAUTHENTICATED, '');
        }

        req.user = user;
        next();

    } catch(error) {
        next(error);
    }
};

const restrictRouteTo = (...userRoles) => {
    return function(req, res, next) {
        // user property will be added to 'req' object in 'protectRoute' middleware
        const hasRole = userRoles.includes(req.user.role);

        if (!hasRole) {
            next(new CustomError(UNAUTHORIZED, 'you are not authorized to access this page'));
            return;
        }

        next();
    };
};

module.exports = {
    protectRoute,
    restrictRouteTo
};