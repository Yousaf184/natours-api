const mongoose = require('mongoose');
const Review = require('./review');

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'tour must have a name'],
        unique: true,
        trim: true,
        maxlength: [50, 'tour name cannot contain more than 50 characters'],
        minlength: [8, 'tour name must contain atleast 8 characters']
    },
    duration: {
        type: Number,
        required: [true, 'tour must have a duration']
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'tour must have a max group size']
    },
    difficulty: {
        type: String,
        required: [true, 'tour must have difficulty level'],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            message: 'difficulty can only be easy, medium or difficult'
        }
    },
    price: {
        type: Number,
        required: [true, 'tour must have a price']
    },
    priceDiscount: {
        type: Number,
        validate: {    // priceDiscount should be less than price
            validator: function(val) {
                // this refers to current document
                // this points to current document only when creating a new document
                // validator with 'this' keyword won't run on update
                return val < this.price;
            },
            message: 'discount value {{VALUE}} should be less than regular price'
        }
    },
    ratingsAverage: {
        type: Number,
        default: 0
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    summary: {
        type: String,
        required: [true, 'tour must have a summary'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'tour must have a description'],
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, 'tour must have a cover image']
    },
    images: [String],
    startDates: [Date],
    startLocation: { // geospatial data (geoJSON)
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    guides: [
        { type: mongoose.Schema.ObjectId, ref: 'User' }
    ]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// compound index on price and ratingsAverage field
// 1 => ascending order, -1 => descending order
tourSchema.index({ price: 1, ratingsAverage: -1 });
// index for geospatial data
// 2dsphere index means index startLocation to earth like sphere
// where all our data is located
tourSchema.index({ startLocation: '2dsphere' });

// add virtual property 'durationWeeks' on Tour model
// 'this' points to current document
tourSchema.virtual('durationWeeks').get(function() {
    return Math.ceil(this.duration / 7);
});

// virtual populate
// populate reviews belonging to current tour.
// virtual populate is used here because tour doesn't
// knows anything about its reviews.
// each review knows about the tour it belongs to
// because we used parent referencing
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',        // tour's id field in Review model
    localField: '_id',            // tour's id field in tour model
});

tourSchema.pre(/^find/, function(next) {
    // this points to current query
    this.populate({ path: 'guides', select: '-__v -passwordChangedAt' });
    next();
});

/**
 * when a tour is deleted, remove all of its reviews
 *
 * query middleware, this refers to current query
 * value of the tour id will be extracted from current query object
 *
 * id of the deleted tour can be extracted from query only when
 * 'deleteOne' function is used to delete the tour
 */
tourSchema.post('deleteOne', async function(deleteOpInfo, next) {
    // if no document was deleted, return
    if (deleteOpInfo.deletedCount == 0) {
        return;
    }

    try {
        // extract id of the tour that was deleted from query object
        const tourId = this._conditions._id;
        await Review.deleteMany({ tour: tourId });
        next();
    } catch (error) {
        throw error;
    }
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;