const mongoose = require('mongoose');

mongoose.connection.on('connected', () => console.log('connected to mongoDB'));
mongoose.connection.on('disconnected', () => console.log('disconnected from mongoDB'));
mongoose.connection.on('error', (error) => console.log(error.message));

const connectToDb = async () => {
    try {
        const connectionOptions = {
            useNewUrlParser: true,
            useCreateIndex: true,
            useFindAndModify: false,
            useUnifiedTopology: true
        };

        await mongoose.connect(process.env.MONGODB_CONNECTION_STR, connectionOptions);
    } catch (error) {
        console.log('could not connect to mongoDB');
        throw error;
    }
}

module.exports = connectToDb;