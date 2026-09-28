const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  bio: { type: String, maxLength: 150, default: '' },
  avatarUrl: { type: String, default: '' },
  isOnline: { type: Boolean, default: false },
  currentListeningTo: { type: String, default: null },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
  privacySettings: {
    profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    allowFriendRequests: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
