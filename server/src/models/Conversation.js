const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  name: { type: String },
  type: { type: String, enum: ['direct', 'group'], default: 'direct' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);
