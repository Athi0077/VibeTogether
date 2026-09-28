const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  isSong: { type: Boolean, default: false },
  songId: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
  clientMessageId: { type: String, required: true }, // For idempotency
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ clientMessageId: 1 }, { unique: true });

module.exports = mongoose.model('Message', messageSchema);
