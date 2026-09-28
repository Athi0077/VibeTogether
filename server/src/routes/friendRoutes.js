const express = require('express');
const router = express.Router();
const { sendRequest, getFriends, getPendingRequests, acceptRequest, rejectRequest, removeFriend } = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/request', sendRequest);
router.get('/', getFriends);
router.get('/pending', getPendingRequests);
router.post('/accept/:id', acceptRequest);
router.post('/reject/:id', rejectRequest);
router.delete('/:id', removeFriend);

module.exports = router;
