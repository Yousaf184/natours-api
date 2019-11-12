const express = require('express');
const { protectRoute, restrictRouteTo } = require('../utils/middlewares');
const reviewController = require('../controllers/reviewController');

// mergeParams options is set to true because reviews router
// needs access to tourId paramter from nested route in tour router
const router = express.Router({ mergeParams: true });

// all routes are protected
router.use(protectRoute);

// both POST and GET requests will be routed here
// via tour router using nested route
// because we need tour id to create a review and
// to get all reviews of a particular tour
router
    .route('/')
    .post(
        restrictRouteTo('user'),
        reviewController.setTourAndUserId,
        reviewController.createReview
    )
    .get(reviewController.getAllReviews);

router
    .route('/:id')
    .patch(restrictRouteTo('user'), reviewController.updateReview)
    .delete(restrictRouteTo('user', 'admin'), reviewController.deleteReview);

module.exports = router;