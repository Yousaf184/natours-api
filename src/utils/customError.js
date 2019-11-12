class CustomError extends Error {
    constructor(errorName, errorMessage) {
        super(errorMessage);
        this.name = errorName;
    }
}

module.exports = CustomError;