const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'please provide tour review'],
        minlength: [8, 'review must be atleast 8 characters long'],
        maxlength: [100, 'review cannot contain more than 100 characters']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'a review must belong to a user']
    },
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'a review must belong to a tour']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// combination of user id and tour id in reviews collection
// should be unique to prevent any user from creating multiple reviews
// on same tour
reviewSchema.index({ user: 1, tour: 1 }, { unique: true })

// static method, this refers to Model itself
// when any review is created, calculate the average of
// ratings for a tour to which current review belongs to
// and also increment the ratings count for the tour
reviewSchema.statics.calcRatingsCountAndAvg = async function(tourId) {
    try {
        const res = await this.aggregate([
            {
                $match: { tour: tourId },
            },
            {
                $group: {
                    _id: '$tour',
                    numOfRatings: { $sum: 1 },
                    avgRating: { $avg: '$rating'}
                }
            }
        ]);

        let updateInfo = {};

        // if res array is empty, set ratingsQuantity
        // and ratingsAverage to 0
        // res array will be empty there are no reviews left in database
        if (res.length === 0) {
            updateInfo.ratingsQuantity = 0;
            updateInfo.ratingsAverage = 0;
        } else {
            updateInfo.ratingsQuantity = res[0].numOfRatings;
            updateInfo.ratingsAverage = res[0].avgRating;
        }

        // Tour model is required here instead of at the top of the file
        // because Review model is required in Tour Model, so to avoid
        // circular reference, Tour model is required inside this function
        const Tour = require('./tour');
        await Tour.findOneAndUpdate({ _id: tourId }, updateInfo, { runValidators: true });

    } catch (error) {
        throw error;
    }
};

reviewSchema.pre(/^find/, function(next) {
    this.populate({ path: 'user', select: 'name' });
    next();
});

// this points to current review about to be saved
reviewSchema.post('save', async function(doc, next) {
    // we need name of the model (Review) to call its static method
    // but it cannot be directly accessed in pre and post middlewares.
    // to get Review model, access the 'constructor' property of the
    // current review which is equal to the Review model
    try {
        this.constructor.calcRatingsCountAndAvg(this.tour);
        next();
    } catch (error) {
        next(error);
    }
});

/**
 * add current review to current update and delete query
 * so that it can later be accessed in post update or delete
 * middleware to update tour ratings that current review belongs to.
 *
 * pre update and delete middlewares are used because getting current
 * review from current query is not possible in post query middleware
 */
reviewSchema.pre('updateOne', addReviewToCurrentQuery);
reviewSchema.pre('deleteOne', addReviewToCurrentQuery);

reviewSchema.post('updateOne', updateRelatedTourRatings);
reviewSchema.post('deleteOne', updateRelatedTourRatings);

// callback function passed to updateOne and deleteOne
// pre middlewares
// adds current review to current update or delete query
// so that it can later be accessed in post update or delete
// middleware to update the ratings quantity and average ratings in
// tour associated with current review that is updated or deleted
async function addReviewToCurrentQuery(next) {
    try {
        // get the current review in query middleware
        // this is not possible in 'post' query middleware
        // that's why 'pre' query middleware is used
        const review = await this.findOne();

        // if no review found
        // no review will be found when id provided
        // when updating or deleting review doesn't exists
        if (!review) {
            return next();
        }

        // add review to current query object so that
        // it can be accessed in post query middlware
        this.review = review;
        next();

    } catch(error) {
        throw error;
    }
}

/**
 * callback function, passed to post update and delete middlewares
 *
 * gets the tour id of the current review added on current review
 * by pre update or pre delete middlware and then calls the function
 * to update average ratings and ratings quantity of the tour that
 * current review belongs to
 */
async function updateRelatedTourRatings(doc, next) {
    // if pre update or delete middleware didn't find the review
    if (!this.review) {
        next();
        return;
    }

    try {
        // get current review's tour id from current current review
        const tourId = this.review.tour;
        // to call the static method of Review model,
        // access the constructor property on current review
        // constructor property refers to Review model
        this.review.constructor.calcRatingsCountAndAvg(tourId);
        next();
    } catch (error) {
        next(error);
    }
}

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;