const express = require('express');
const router = express.Router();
const { getOrCreateDirectConversation, getUserConversations, getConversationMessages } = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getUserConversations);
router.post('/direct/:friendId', getOrCreateDirectConversation);
router.get('/:conversationId/messages', getConversationMessages);

module.exports = router;
