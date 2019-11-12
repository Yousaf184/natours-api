const express = require('express');
const tourController = require('../controllers/tourController');
const { protectRoute, restrictRouteTo } = require('../utils/middlewares');
const reviewRouter = require('./reviewRouter');

const router = express.Router();

// nested route
// use review router when following 2 routes are encountered
router.use('/:tourId/reviews', reviewRouter);

router
    .route('/')
    .get(tourController.getAllTours)
    .post(protectRoute, restrictRouteTo('admin', 'lead guide'), tourController.createTour);

router
    .route('/stats')
    .get(tourController.getTourStats);

router
    .route('/:id')
    .get(protectRoute, tourController.getTour)
    .patch(
        protectRoute,
        restrictRouteTo('admin', 'lead guide'),
        tourController.updateTour
    )
    .delete(
        protectRoute,
        restrictRouteTo('admin', 'lead guide'),
        tourController.deleteTour
    );

router
    .route('/stats-by-month/:year')
    .get(tourController.getToursByMonth);

router.get('/within/:distance/center/:latlng/unit/:unit', tourController.getToursWithin);
// get distances of all tours from a certain point
router.get('/distances/center/:latlng/unit/:unit', tourController.getDistancesOfAllTours);

module.exports = router;