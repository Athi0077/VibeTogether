const youtubeService = require('./youtube.service');

// Simple in-memory playlist for isolated feature
const playlists = new Map(); // conversationId -> array of songs

const validateUrl = async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const videoId = youtubeService.extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const details = await youtubeService.fetchVideoDetails(videoId);
    res.json(details);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const addToPlaylist = async (req, res, next) => {
  try {
    const { conversationId, videoDetails } = req.body;
    if (!conversationId || !videoDetails) {
      return res.status(400).json({ error: 'Missing conversationId or videoDetails' });
    }

    if (!playlists.has(conversationId)) {
      playlists.set(conversationId, []);
    }

    const song = {
      _id: `yt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...videoDetails,
      addedBy: req.user._id,
      createdAt: new Date()
    };

    playlists.get(conversationId).push(song);
    res.status(201).json(song);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPlaylist = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const list = playlists.get(conversationId) || [];
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  validateUrl,
  addToPlaylist,
  getPlaylist
};
