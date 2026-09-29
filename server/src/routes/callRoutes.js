const express = require('express');
const router = express.Router();
const { getCallHistory, getLiveKitToken, getTurnCredentials } = require('../controllers/callController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/history/:conversationId', getCallHistory);
router.get('/token/:conversationId', getLiveKitToken);
router.get('/turn', getTurnCredentials);

module.exports = router;
