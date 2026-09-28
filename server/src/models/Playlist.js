const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, unique: true },
  songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
  currentSong: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Playlist', playlistSchema);
