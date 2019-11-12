const app = require('./app');
const connectToDb = require('./utils/dbConnect');

const PORT = process.env.PORT;
let server;

process.on('unhandledRejection', (error) => {
    closeServer('Unhandled Rejection', error);
});

process.on('uncaughtException', (error) => {
    closeServer('Uncaught Exception', error);
});

function closeServer(message, error) {
    console.log(message);
    console.log('Error name = ' + error.name);
    console.log('Error message = ' + error.message);
    server.close(() => process.exit(1));
}

(async () => {
    try {
        await connectToDb();
        server = app.listen(PORT, () => console.log('server started on port ' + PORT));
    } catch (error) {
        console.log('failed to restart server');
    }
})();