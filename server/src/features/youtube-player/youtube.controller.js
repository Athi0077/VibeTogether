const youtubeService = require('./youtube.service');
const SavedYouTubeSong = require('../../models/SavedYouTubeSong');

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

const saveSong = async (req, res, next) => {
  try {
    const { videoId, title, thumbnail, author } = req.body;
    
    // Check if already saved
    const existing = await SavedYouTubeSong.findOne({ userId: req.user._id, videoId });
    if (existing) {
      return res.status(400).json({ error: 'Song already saved' });
    }

    const savedSong = await SavedYouTubeSong.create({
      userId: req.user._id,
      videoId,
      title,
      thumbnail,
      author
    });

    res.status(201).json(savedSong);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Song already saved' });
    }
    next(error);
  }
};

const removeSavedSong = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    await SavedYouTubeSong.findOneAndDelete({ userId: req.user._id, videoId });
    res.json({ message: 'Saved song removed' });
  } catch (error) {
    next(error);
  }
};

const getSavedSongs = async (req, res, next) => {
  try {
    const savedSongs = await SavedYouTubeSong.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(savedSongs);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateUrl,
  addToPlaylist,
  getPlaylist,
  saveSong,
  removeSavedSong,
  getSavedSongs
};
