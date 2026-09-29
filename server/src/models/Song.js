const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, default: 'Unknown Artist' },
  originalFileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  duration: { type: Number, default: 0 },
  publicId: { type: String, required: true, unique: true },
  secureUrl: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  likesCount: { type: Number, default: 0 },
  visibility: { type: String, enum: ['public', 'private', 'friends'], default: 'public' },
}, { timestamps: true });

module.exports = mongoose.model('Song', songSchema);
