const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const requestRateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const tourRouter = require('./routes/tourRouter');
const userRouter = require('./routes/userRouter');
const authRouter = require('./routes/authRouter');
const reviewRouter = require('./routes/reviewRouter');
const { errorHandler } = require('./utils/utils');
const { UNDEFINED_ROUTE_ERROR } = require('./utils/constants');
const CustomError = require('./utils/customError');

const app = express();

// allow 100 requests per 1 hour from 1 IP address
const requestRateLimiter = requestRateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'request limit exceeded. You can only make 100 requests per 1 hour'
});

app.use(helmet());
app.use(express.json({ limit: '10kb' })); // limit request body size to 10 kilobyte
// prevent NoSQL query injection by removing dollar signs and dots from
// requst body, request query string and request params
app.use(mongoSanitize());
// remove malicious html code from user input to prevent cross site
// scripting attack
app.use(xss());
// prevent http paramter polution
app.use(hpp());
// limit number of requests from single IP address
app.use('/api', requestRateLimiter);

app.use(cookieParser());

// serve static files (image files uploaded on server)
app.use('/uploaded-images', express.static(path.join(__dirname, '..', 'uploaded-images')));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
    throw new CustomError(
        UNDEFINED_ROUTE_ERROR,
        `route (${req.originalUrl}) not found on the server`
    );
});

// express error handler
app.use(errorHandler);

module.exports = app;