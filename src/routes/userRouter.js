const express = require('express');
const userController = require('../controllers/userController');
const { protectRoute, restrictRouteTo } = require('../utils/middlewares');

const router = express.Router();

router.post('/update-password', protectRoute, userController.updatePassword);

// routes after following two statements are protected
// and restricted to user
router.use(protectRoute);
router.use(restrictRouteTo('user'));

router
    .route('/me')
    .get(userController.getUser)
    .patch(
        // multer should be first middleware because it will parse
        // multipart form data
        userController.uploadUserImage.single('profile-image'),
        userController.removepasswordOrRoleFromReqBody,
        userController.updateMe
    )
    .delete(userController.deleteMe);

module.exports = router;