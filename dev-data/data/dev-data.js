const fs = require('fs');
const path = require('path');
const connectToDb = require('../../src/dbConnect');
const Tour = require('../../src/models/tour');
const User = require('../../src/models/user');
const Review = require('../../src/models/review');

const modelName = process.argv[2].toLowerCase();
const currentModel = getCurrentModel(modelName);
const pathToDevDataFile = path.join(__dirname, '..', 'data', `${modelName}.json`);

function getCurrentModel(modelName) {
    switch (modelName) {
        case 'tours':
            return Tour;
        case 'users':
            return User;
        case 'reviews':
            return Review;
    }
}

async function importData() {
    try {
        await connectToDb();
        const data = JSON.parse(fs.readFileSync(pathToDevDataFile, 'utf-8'));

        await currentModel.create(data);
        console.log('dev data imported successfully in ' + modelName + ' collection');
    } catch (error) {
        console.log(error.message);
    }
}

async function deleteData() {
    try {
        await connectToDb();
        await currentModel.deleteMany({});
        console.log('dev data deleted successfully from ' + modelName + ' collection');
    } catch (error) {
        console.log(error.message);
    }
}

if (process.argv[3] === 'import') {
    importData();
} else if (process.argv[3] === 'delete') {
    deleteData();
}