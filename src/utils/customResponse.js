const { SUCCESS, JWT_COOKIE_KEY } = require('./constants');

/**
 * returns success response
 *
 * @param {object} data - data to be sent back in the response
 * @param {string} successMsg - success message to be returned in response
 *
 * @returns {object} response
 */
const successResponse = (data, successMsg) => {
    const response = { status: SUCCESS, results: 0 };

    if (data) {
        response.data = data;

        if (data instanceof Array)
            response.results = data.length;
        else
            response.results = 1;
    }

    if (successMsg) response.message = successMsg;

    return response;
};

/**
 * sends response to the client that includes jwt token along with optional message.
 * also sends cookie to the browser that includes jwt
 *
 * @param {object} res - express' response object
 * @param {string} jwtToken - json web token to be sent back to client
 * @param {string} successMsg - optional, message to be included in the response
 */
const successResponseWithToken = async (res, jwtToken, successMsg) => {
    const response =  { status: SUCCESS, token: jwtToken };
    if (successMsg) response.message = successMsg;

    // three days in milliseconds
    const threeDays = process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000;
    const cookieOptions = {
        expires: new Date(Date.now() + threeDays),  // cookie to expire in 3 days
        httpOnly: true
    };

    // send cookie over HTTPS only if in production
    if (process.env.NODE_ENV === 'production') {
        cookieOptions.secure = true;
    }

    res.status(200)
       .cookie(JWT_COOKIE_KEY, jwtToken, cookieOptions)
       .json(response);
};

module.exports = {
    successResponse,
    successResponseWithToken,
}