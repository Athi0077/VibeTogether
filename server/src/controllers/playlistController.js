const Playlist = require('../models/Playlist');
const Conversation = require('../models/Conversation');
const Song = require('../models/Song');
const { getIo } = require('../sockets');

const checkMembership = async (conversationId, userId) => {
  const conv = await Conversation.findById(conversationId);
  if (!conv) return false;
  return conv.members.includes(userId);
};

const emitPlaylistUpdate = (conversationId, playlist) => {
  try {
    const io = getIo();
    io.to(`conv:${conversationId}`).emit('playlist:updated', playlist);
  } catch (e) {
    console.error('Socket emit error:', e);
  }
};

exports.getPlaylist = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    if (!(await checkMembership(conversationId, req.user._id))) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    let playlist = await Playlist.findOne({ conversationId }).populate('songs').populate('currentSong');
    if (!playlist) {
      playlist = await Playlist.create({ conversationId, songs: [] });
      playlist = await Playlist.findOne({ conversationId }).populate('songs').populate('currentSong');
    }
    res.json(playlist);
  } catch (error) {
    next(error);
  }
};

exports.addSong = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { songId } = req.body;
    if (!(await checkMembership(conversationId, req.user._id))) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    let playlist = await Playlist.findOne({ conversationId });
    if (!playlist) {
      playlist = await Playlist.create({ conversationId, songs: [] });
    }

    if (!playlist.songs.includes(songId)) {
      playlist.songs.push(songId);
      await playlist.save();
    }
    
    playlist = await Playlist.findOne({ conversationId }).populate('songs').populate('currentSong');
    emitPlaylistUpdate(conversationId, playlist);
    res.json(playlist);
  } catch (error) {
    next(error);
  }
};

exports.removeSong = async (req, res, next) => {
  try {
    const { conversationId, songId } = req.params;
    if (!(await checkMembership(conversationId, req.user._id))) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const playlist = await Playlist.findOne({ conversationId });
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    playlist.songs = playlist.songs.filter(id => id.toString() !== songId);
    if (playlist.currentSong && playlist.currentSong.toString() === songId) {
      playlist.currentSong = null; // Next song should be played by client logic and then updated
    }
    await playlist.save();
    
    const updated = await Playlist.findOne({ conversationId }).populate('songs').populate('currentSong');
    emitPlaylistUpdate(conversationId, updated);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.reorderPlaylist = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { newOrder } = req.body; // Array of song IDs
    if (!(await checkMembership(conversationId, req.user._id))) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const playlist = await Playlist.findOne({ conversationId });
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    playlist.songs = newOrder;
    await playlist.save();

    const updated = await Playlist.findOne({ conversationId }).populate('songs').populate('currentSong');
    emitPlaylistUpdate(conversationId, updated);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.setCurrentSong = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { songId } = req.body;
    if (!(await checkMembership(conversationId, req.user._id))) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const playlist = await Playlist.findOne({ conversationId });
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    playlist.currentSong = songId || null;
    await playlist.save();

    const updated = await Playlist.findOne({ conversationId }).populate('songs').populate('currentSong');
    emitPlaylistUpdate(conversationId, updated);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
