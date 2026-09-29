const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  uploadSong, 
  getSongsByConversation, 
  getPlayback, 
  deleteSong, 
  convertOnly, 
  getMyLibrary,
  toggleLikeSong,
  getTrendingSongs,
  getLikedSongs 
} = require('../controllers/songController');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({ dest: 'uploads/' });

router.use(protect);

router.get('/library', getMyLibrary);
router.get('/trending', getTrendingSongs);
router.get('/liked', getLikedSongs);
router.post('/:songId/like', toggleLikeSong);
router.post('/upload', upload.single('file'), uploadSong);
router.post('/convert-only', upload.single('file'), convertOnly);
router.get('/conversation/:conversationId', getSongsByConversation);
router.get('/:songId/playback-url', getPlayback);
router.delete('/:songId', deleteSong);

module.exports = router;
