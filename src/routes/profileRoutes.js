const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { verifyJWT, checkRole } = require('../middleware/authMiddleware');

// All profile routes require authentication
router.use(verifyJWT);

router.get('/', profileController.getProfiles);
router.get('/export', checkRole(['admin']), profileController.exportProfiles);
router.get('/users', checkRole(['admin']), profileController.getUsers);
router.patch('/users/:userId/role', checkRole(['admin']), profileController.updateUserRole);
router.get('/:id', profileController.getProfileById);

module.exports = router;
