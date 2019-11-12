const Tour = require('../models/tour');
const { successResponse } = require('../utils/customResponse');
const factory = require('./factoryFunctions');
const CustomError = require('../utils/customError');
const { INVALID_REQUEST_ERROR } = require('../utils/constants');
const ApiFeatures = require('../utils/apiFeatures');
const { validateGeospatialQueryParams } = require('../utils/utils');

const createTour = factory.createOne(Tour);
const getAllTours = factory.getAll(Tour);
const getTour = factory.getOne(Tour, { path: 'reviews' });
const deleteTour = factory.deleteOne(Tour);
const updateTour = factory.updateOne(Tour);

const getTourStats = async (req, res, next) => {
    try {
        const stats = await Tour.aggregate([
            {
                $match: { ratingsAverage: { $gte: 4.5 } }
            },
            {
                $group: {
                    _id: '$difficulty',      // field to group by
                    totalTours: { $sum: 1 },
                    averageRating: { $avg: '$ratingsAverage' },
                    averagePrice: { $avg: '$price' },
                    minimumPrice: { $min: '$price' },
                    maximumPrice: { $max: '$price' }
                }
            },
            {
                $sort: { averagePrice: 1 }   // 1 for ascending order
            }
        ]);

        res.status(200).json(successResponse(stats, null));

    } catch (error) {
        next(error);
    }
};

// returns number of tours and their names in each month of a
// given year. Year is passed as paramter in request url
const getToursByMonth = async (req, res, next) => {
    try {
        const year = req.params.year;

        const stats = await Tour.aggregate([
            {
                $unwind: '$startDates'
            },
            {
                $match: {
                    startDates: {
                        $gte: new Date(`${year}-01-01`),
                        $lte: new Date(`${year}-12-31`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: '$startDates' },
                    tourCount: { $sum: 1 },
                    tours: { $push: '$name' }
                }
            },
            {
                $addFields: { monthNumber: '$_id' }
            },
            {
                $project: {
                    _id: 0,    // 0 --> hide, 1 --> show
                    monthNumber: 1,
                    tourCount: 1,
                    tours: 1,
                    month: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$_id', 1] }, then: 'January' },
                                { case: { $eq: ['$_id', 2] }, then: 'February' },
                                { case: { $eq: ['$_id', 3] }, then: 'March' },
                                { case: { $eq: ['$_id', 4] }, then: 'April' },
                                { case: { $eq: ['$_id', 5] }, then: 'May' },
                                { case: { $eq: ['$_id', 6] }, then: 'June' },
                                { case: { $eq: ['$_id', 7] }, then: 'July' },
                                { case: { $eq: ['$_id', 8] }, then: 'August' },
                                { case: { $eq: ['$_id', 9] }, then: 'September' },
                                { case: { $eq: ['$_id', 10] }, then: 'October' },
                                { case: { $eq: ['$_id', 11] }, then: 'November' },
                                { case: { $eq: ['$_id', 12] }, then: 'December' },
                            ],
                            default: 'default month'
                        }
                    }
                }
            },
            {  // following two $project phases are added as part of a trick
               // to reorder the properties of aggregation result in a specific
               // order.
               // without following 2 $project phases, month property will
               // be last property in objects returned by aggregation
                $project: {
                    _month: '$month',
                    _monthNumber: '$monthNumber',
                    _tourCount: '$tourCount',
                    _tours: '$tours'
                }
            },
            {   // renaming modified names of properties to original property names
                $project: {
                    month: '$_month',
                    monthNumber: '$_monthNumber',
                    tourCount: '$_tourCount',
                    tours: '$_tours'
                }
            },
            {
                $sort: { monthNumber: 1 }
            }
        ]);

        res.status(200).json(successResponse(stats, null));

    } catch (error) {
        next(error);
    }
};

// GET => /tours/within/:distance/center/:latlng/unit/:unit
// /tours/within/20/center/31.516425,74.312203/unit/m
// unit -> miles = mi, kilimeteres = km
// get tours within certain distance from a center point
const getToursWithin = async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    try {
        validateGeospatialQueryParams(distance, lat, lng, unit);

        // radius in radians
        // divide distance by radius of earth to get radius in radians
        const earthRadiusKilometers = 6378.1;
        const earthRadiusMiles = 3963.2;
        const radius = unit === 'mi'
                        ? distance / earthRadiusMiles
                        : distance / earthRadiusKilometers;

        // build query
        const query = Tour.find({
            startLocation: {
                $geoWithin: {
                    $centerSphere: [[lng, lat], radius]
                }
            }
        });

        // allow sorting, pagination, filtering and limiting fields
        // in response data
        const apiFeatures = new ApiFeatures(query, req.query);
        await apiFeatures
                .filter()
                .sort()
                .limitFields()
                .paginate();

        // execute query
        const tours = await apiFeatures.query;
        res.status(200).json(successResponse(tours, null));

    } catch (error) {
        next(error);
    }
};

// get distance of each tour from a particular point
const getDistancesOfAllTours = async (req, res, next) => {
    let { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    try {
        validateGeospatialQueryParams(null, lat, lng, unit);

        // this is needed because calculated distances are in meters
        // each calculated distance will be multiplied by unit
        if (unit === 'mi') {
            unit = 0.000621371;   // miles in 1 meter
        } else {
            unit = 0.001;   // kilometers in 1 meters
        }

        // build query
        /**
         * geoNear should be first stage in geospatial aggregation.
         *
         * geoNear stage requires that one of the fields on the model
         * should have geospatial index on it.
         *
         * our geospatial index is defined on 'startLocation'.
         */
        const tours = await Tour.aggregate([
            {
                $geoNear: {
                    // point from where the distances should be calculated
                    near: {
                        type: 'Point',
                        coordinates: [parseInt(lng), parseInt(lat)]
                    },
                    // field where calculated distances will be stored
                    distanceField: 'distance',
                    // convert distance in meters in to current unit (km or mi)
                    distanceMultiplier: unit
                }
            },
            {
                $project: {
                    distance: 1,
                    name: 1
                }
            }
        ]);

        res.status(200).json(successResponse(tours, null));

    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTour,
    getAllTours,
    getTour,
    deleteTour,
    getTourStats,
    getToursByMonth,
    updateTour,
    getToursWithin,
    getDistancesOfAllTours
};