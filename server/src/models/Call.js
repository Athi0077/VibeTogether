const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  callType: { type: String, enum: ['audio', 'video'], required: true },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startedAt: { type: Date },
  endedAt: { type: Date },
  duration: { type: Number },
  status: { type: String, enum: ['missed', 'completed', 'failed', 'declined'], required: true },
  endReason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Call', callSchema);
