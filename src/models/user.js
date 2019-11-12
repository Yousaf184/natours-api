const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'name is required'],
        minlength: [3, 'name should be atleast 3 characterss long'],
        maxlength: [40, 'name should not contain more than 40 characters']
    },
    email: {
        type: String,
        required: [true, 'email is required'],
        unique: true,
        lowercase: true,
        validate: {
            validator: validator.isEmail,
            message: 'invalid email provided'
        }
    },
    profileImage: String,
    password: {
        type: String,
        required: [true, 'password is required'],
        minlength: [8, 'password should be atleast 8 characters long'],
        validate: {
            // validator function with 'this' keyword only runs on
            // 'save' and 'create' operation
            validator: function(val) {
                return val === this.passwordConfirm;
            },
            message: 'password and confirm password do not match'
        },
        select: false // do not show this propery when this doc is queried
    },
    passwordConfirm: {
        type: String,
        required: [true, 'confirm password is missing']
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpiry: Date,
    role: {
        type: String,
        enum: {
            values: ['user', 'guide', 'lead guide', 'admin'],
            message: 'allowed values for role: [user, guide, lead guide, admin]'
        },
        default: 'user'
    }
});

userSchema.methods.verifyPassword = async function(providedPassword) {
    return await bcrypt.compare(providedPassword, this.password);
};

userSchema.methods.isPasswordChangedAfterTokenIssued = function(jwtIssuedTime) {
    if (this.passwordChangedAt) {
        // convert passwordChangedAt date in to time in milliseconds
        let passwordChangeTimestamp = this.passwordChangedAt.getTime() / 1000;
        // convert to base 10 integer
        passwordChangeTimestamp = parseInt(passwordChangeTimestamp, 10);

        return passwordChangeTimestamp > jwtIssuedTime;
    }

    return false;
};

userSchema.methods.createPasswordResetToken = async function() {
    try {
        const resetToken = crypto.randomBytes(32).toString('hex');
        // before saving the token in the database, encrypt it
        this.passwordResetToken = crypto
                                    .createHash('sha256')
                                    .update(resetToken)
                                    .digest('hex');

        // set reset token to expire in 10 minutes
        // add number of milliseconds in 10 minutes to current date
        this.passwordResetTokenExpiry = Date.now() + (10 * 60 * 1000);
        // save current document
        // validation should be off because all required
        // properties are not provided, we are just saving two
        // new properties on current document
        await this.save({ validateBeforeSave: false });

        return resetToken;

    } catch(error) {
        throw error;
    }
};

userSchema.methods.removePasswordResetToken = function() {
    this.passwordResetToken = undefined;
    this.passwordResetTokenExpiry = undefined;
};

userSchema.pre('save', async function(next) {
    const userDoc = this;
    if (!userDoc.isModified('password')) return;

    // if password is modified and document is not new
    // that means either user is updating password or resetting it
    // add 'passwordChangedAt' property to user document
    if (userDoc.isModified('password') && !userDoc.isNew) {
        // subtract 1 second from current data because there may be
        // a case where jwt is issued before 'passwordChangedAt'
        // property is set in database.
        // If that happens, user will not be able to login because
        // of 'protectRoute' middleware.
        // To avoid this situation, set 'passwordChangedAt' property
        // to 1 second in the past
        userDoc.passwordChangedAt = Date.now() - 1000;
    }

    userDoc.password = await bcrypt.hash(userDoc.password, 12);
    userDoc.passwordConfirm = undefined;
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;