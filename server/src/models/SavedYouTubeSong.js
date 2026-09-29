const mongoose = require('mongoose');

const savedYouTubeSongSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: String, required: true },
  title: { type: String, required: true },
  thumbnail: { type: String, required: true },
  author: { type: String, required: true }
}, { timestamps: true });

// Prevent duplicate saves for the same user and video
savedYouTubeSongSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('SavedYouTubeSong', savedYouTubeSongSchema);
