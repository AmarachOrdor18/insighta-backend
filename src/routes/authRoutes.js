const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.post('/github', authController.githubLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', verifyJWT, authController.getMe);

module.exports = router;
