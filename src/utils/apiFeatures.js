const Tour = require('../models/tour');

class ApiFeatures {
    constructor(query, queryParams) {
        this.query = query;
        this.queryParams = queryParams;
    }

    filter() {
        let queryObj = {...this.queryParams};
        const excludedQueryParams = ['page', 'sort', 'limit', 'fields'];
        // remove exludedQueryParams from query object
        excludedQueryParams.forEach(param => delete queryObj[param]);

        // advance filtering (allow using greater than or less than in query strings)
        // example /tours?price[gte]=500
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, matchedStr => `$${matchedStr}`);
        queryObj = JSON.parse(queryStr);

        this.query = this.query.find(queryObj);

        return this;
    }

    sort() {
        if (this.queryParams.sort) {
            // to allow specifying multiple fields to sort by
            // example /tours?sort=price,duration. When price is same
            // for any 2 tours, results will be sorted by duration field
            this.queryParams.sort = this.queryParams.sort.split(',').join(' ');
            this.query = this.query.sort(this.queryParams.sort);
        }

        return this;
    }

    limitFields() {
        if (this.queryParams.fields) {
            // include fields in response that are specified
            // in fields query paramter
            // example: /tours?fields=price,duration,name
            this.queryParams.fields = this.queryParams.fields.split(',').join(' ');
            this.query = this.query.select(this.queryParams.fields);
        }

        return this;
    }

    async paginate() {
        const defaultPageNumber = 1;
        const defaultsResultsCountPerPage = 10;

        try {
            let pageNumber = parseInt(this.queryParams.page) || defaultPageNumber;
            const limit = parseInt(this.queryParams.limit) || defaultsResultsCountPerPage;
            const documentCount = await Tour.countDocuments();
            const lastPageNumber = Math.ceil(documentCount / limit);

            // if pageNumber is greater than lastPageNumber,
            // set pageNumber equal to last page number
            if (pageNumber >= lastPageNumber) {
                pageNumber = lastPageNumber;
            } else if (pageNumber < 1) {
                // if pageNumber less than 1, set it equal to 1
                pageNumber = 1;
            }

            const skip = (pageNumber - 1) * limit;
            this.query = this.query.skip(skip).limit(limit);

        } catch (error) {
            console.log(error);
        }

        return this;
    }
}

module.exports = ApiFeatures;