const Review = require('../models/review');
const factory = require('./factoryFunctions');

// returns all reviews in database for eaach tour
// or all reviews for a single tour if tour id is present in params
const getAllReviews = factory.getAll(Review);
const deleteReview = factory.deleteOne(Review);
const updateReview = factory.updateOne(Review);

// called before creating review
// adds tour id and user id on req.body object
// tour and user are required properties in Review model
const setTourAndUserId = (req, res, next) => {
    if (req.params.tourId) {
        req.body.tour = req.params.tourId;
    }

    req.body.user = req.user._id;

    next();
};

const createReview = factory.createOne(Review);

module.exports = {
    getAllReviews,
    createReview,
    deleteReview,
    updateReview,
    setTourAndUserId
};