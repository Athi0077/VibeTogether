const express = require('express');
const router = express.Router();
const { getMe, updateProfile, searchUsers, blockUser, unblockUser } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/me', getMe);
router.put('/me', updateProfile);
router.get('/search', searchUsers);
router.post('/block/:id', blockUser);
router.post('/unblock/:id', unblockUser);

module.exports = router;
