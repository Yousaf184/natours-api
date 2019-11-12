const multer = require('multer');
const { DISK_STORAGE, MEMORY_STORAGE, FILE_UPLOAD_ERROR } = require('./constants');
const CustomError = require('./customError');

class MulterConfig {
    /**
     * @param {string} destination - path where to store uploaded file/files
     * @param {number} maxFileSize - max file size to allowed to be uploaded (in bytes)
     * @param {array[string]} allowedMimeTypes - type of files user is allowed to upload
     * @param {string} storageType - can only have one of the two values,
     * either 'memory' or 'file
     */
    constructor(destination, maxFileSize, allowedMimeTypes, storageType) {
        this.destination = destination;
        this.maxFileSize = maxFileSize;
        this.allowedMimeTypes = allowedMimeTypes;
        this.storageType = storageType;

        // return multer configuration object
        return this.multerInit();
    }

    // returns an object specifying how uploaded file is stored
    multerStorageConfig() {
        switch(this.storageType) {
            case MEMORY_STORAGE:
                return multer.memoryStorage();

            case DISK_STORAGE:
                return multer.diskStorage({
                    destination: (req, file, cb) => {
                        cb(null, this.destination);
                    },
                    filename: (req, file, cb) => {
                        cb(null, req.user._id + '-' + file.originalname);
                    }
                });
        }
    }

    multerInit() {
        const multerConfig = {
            storage: this.multerStorageConfig(),
            limits: {
                fileSize: this.maxFileSize
            },
            fileFilter: (req, file, cb) => {
                for (let i=0; i<this.allowedMimeTypes.length; i++) {
                    if (file.mimetype === this.allowedMimeTypes[i]) {
                        cb(null, true);
                        return;
                    }
                }

                cb(
                    new CustomError(
                        FILE_UPLOAD_ERROR,
                        `invalid file type. Allowed file types are [${this.allowedMimeTypes}]`
                    )
                );
            }
        };

        return multerConfig;
    }
}

module.exports = MulterConfig;