const express = require('express');
const router = express.Router();
const { getPlaylist, addSong, removeSong, reorderPlaylist, setCurrentSong } = require('../controllers/playlistController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/:conversationId', getPlaylist);
router.post('/:conversationId/add', addSong);
router.delete('/:conversationId/remove/:songId', removeSong);
router.put('/:conversationId/reorder', reorderPlaylist);
router.put('/:conversationId/current', setCurrentSong);

module.exports = router;
