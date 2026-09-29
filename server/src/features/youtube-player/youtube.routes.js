const express = require('express');
const router = express.Router();
const youtubeController = require('./youtube.controller');
const { protect } = require('../../middleware/authMiddleware');

router.use(protect);

router.post('/validate-url', youtubeController.validateUrl);
router.post('/playlist', youtubeController.addToPlaylist);
router.get('/playlist/:conversationId', youtubeController.getPlaylist);

// Saved YouTube Songs routes
router.get('/saved', youtubeController.getSavedSongs);
router.post('/saved', youtubeController.saveSong);
router.delete('/saved/:videoId', youtubeController.removeSavedSong);

module.exports = router;
