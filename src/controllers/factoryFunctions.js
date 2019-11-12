const { successResponse } = require('../utils/customResponse');
const ApiFeatures = require('../utils/apiFeatures');
const CustomError = require('../utils/customError');
const { NOT_FOUND_ERROR } = require('../utils/constants');

// factory function that returns a function
// to create a document of a particular model
const createOne = (model) => async (req, res, next) => {
    try {
        const document = new model(req.body);
        await document.save();
        res.status(200).send(successResponse(document, 'document created successfully'));
    } catch (error) {
        next(error);
    }
};

// factory function that returns a function
// to get all documents of a particular model
const getAll = (model) => async (req, res, next) => {
    const filter = {};

    // ONLY REQUIRED FOR REVIEW MODEL
    // if request is sent via nested route in tour router
    // then there will be tourId param
    // if it is present, get only those reviews where tour
    // property of review is equal to tourId param
    if (req.params.tourId) {
        filter.tour = req.params.tourId;
    }

    try {
        // build query
        const query = model.find(filter);
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

// factory function that returns a function to get
// single document of a particular model
const getOne = (model, populateOptions) => async (req, res, next) => {
    const id = req.params.id;

    try {
        // build query
        let query = model.findById(id);

        if (populateOptions) {
            query = query.populate(populateOptions);
        }

        // await query
        const document = await query;

        if (!document) {
            throw new CustomError(NOT_FOUND_ERROR, `document with id=${id} doesn't exists`);
        }

        res.status(200).json(successResponse(document, null));

    } catch (error) {
        // CastError will be thrown when 'id' is not a valid 'ObjectId'
        if (error.name === 'CastError') {
            error.name = NOT_FOUND_ERROR;
            error.message = `document with id=${id} doesn't exists`;
        }
        next(error);
    }
};

// factory function that returns a function
// to update a document of a particular model
const updateOne = (model) => async (req, res, next) => {
    const id = req.params.id;

    try {
        // updateOne returns an object containing info about the update operation
        const operationInfo = await model.updateOne({ _id: id }, req.body, {
            runValidators: true
        });

        // if no document was modified as result of updateOne operation
        if (operationInfo.ok == 1 && operationInfo.nModified < 1) {
            throw new CustomError(NOT_FOUND_ERROR, `document with id=${id} doesn't exists`);
        }

        /**
         * another query to get the updated document and return it in response.
         *
         * findOneAndUpdate or findByIdAndUpdate methods return the updated
         * document instead of returning info about update operation
         * but these 2 methods were not used because when updateOne is used,
         * id of the updated document can be retrieved from the query in
         * query middleware at path -> query._conditions._id
         *
         * id of the updated document is used in query middleware for Review model
         */
        const updatedDocument = await model.findOne({ _id: id });
        res.status(200).json(successResponse(updatedDocument, 'document updated successfully'));

    } catch (error) {
        next(error);
    }
};

// factory function that returns a function to delete
// single document of a particular model
const deleteOne = (model) => async (req, res, next) => {
    const id = req.params.id;

    try {
        // deleteOne returns an object containing info about the delete operation
        const operationInfo = await model.deleteOne({ _id: id });

        // no document was deleted as result of deleteOne operation
        if (operationInfo.ok == 1 && operationInfo.deletedCount == 0) {
            throw new CustomError(NOT_FOUND_ERROR, `document with id=${id} not found`);
        }

        res.status(200).send(successResponse(null, 'document removed successfully'));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAll,
    getOne,
    deleteOne,
    updateOne,
    createOne
};