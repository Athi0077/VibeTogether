const Conversation = require('../models/Conversation');

const playbackStates = new Map();

module.exports = (io, socket) => {
  const user = socket.user;

  const checkMembership = async (conversationId) => {
    try {
      const conv = await Conversation.findById(conversationId);
      return conv && conv.members.includes(user._id);
    } catch {
      return false;
    }
  };

  const broadcastState = (conversationId) => {
    const state = playbackStates.get(conversationId);
    if (state) {
      io.to(`conv:${conversationId}`).emit('music:state', state);
    }
  };

  socket.on('music:play', async (data) => {
    const { conversationId, songId, playbackPosition } = data;
    if (!conversationId || !songId) return;

    if (!(await checkMembership(conversationId))) return;

    let state = playbackStates.get(conversationId) || { revision: 0 };
    
    playbackStates.set(conversationId, {
      conversationId,
      songId,
      playbackPosition: playbackPosition || state.playbackPosition || 0,
      isPlaying: true,
      serverTimestamp: Date.now(),
      revision: state.revision + 1,
      updatedBy: user._id
    });

    broadcastState(conversationId);
  });

  socket.on('music:pause', async (data) => {
    const { conversationId, playbackPosition } = data;
    if (!conversationId) return;

    if (!(await checkMembership(conversationId))) return;

    let state = playbackStates.get(conversationId);
    if (!state) return;

    playbackStates.set(conversationId, {
      ...state,
      playbackPosition: playbackPosition,
      isPlaying: false,
      serverTimestamp: Date.now(),
      revision: state.revision + 1,
      updatedBy: user._id
    });

    broadcastState(conversationId);
  });

  socket.on('music:seek', async (data) => {
    const { conversationId, playbackPosition } = data;
    if (!conversationId) return;

    if (!(await checkMembership(conversationId))) return;

    let state = playbackStates.get(conversationId);
    if (!state) return;

    playbackStates.set(conversationId, {
      ...state,
      playbackPosition: playbackPosition,
      serverTimestamp: Date.now(),
      revision: state.revision + 1,
      updatedBy: user._id
    });

    broadcastState(conversationId);
  });

  socket.on('music:request-state', async (conversationId, callback) => {
    if (!(await checkMembership(conversationId))) {
      if (typeof callback === 'function') callback({ error: 'Unauthorized' });
      return;
    }

    const state = playbackStates.get(conversationId);
    if (typeof callback === 'function') {
      callback({ state });
    } else if (state) {
      socket.emit('music:state', state);
    }
  });
};
