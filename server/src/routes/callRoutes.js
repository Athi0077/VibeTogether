const express = require('express');
const router = express.Router();
const { getCallHistory, getLiveKitToken } = require('../controllers/callController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/history/:conversationId', getCallHistory);
router.get('/token/:conversationId', getLiveKitToken);

module.exports = router;
