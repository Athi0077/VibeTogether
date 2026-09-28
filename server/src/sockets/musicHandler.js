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

    let state = playbackStates.get(conversationId) || { revision: 0, status: 'inactive' };
    
    // First-Time Play - Acceptance Required
    if (state.status === 'inactive' || !state.status) {
      playbackStates.set(conversationId, {
        ...state,
        status: 'pending',
        pendingSongId: songId,
        initiatorId: user._id,
        conversationId
      });
      // Emit request_accept to others in the room
      socket.to(`conv:${conversationId}`).emit('music:request_accept', {
        initiatorId: user._id,
        songId,
        conversationId
      });
      // Notify the initiator that they are pending acceptance
      socket.emit('music:pending', { songId, conversationId });
      return;
    }

    // If active, just play the new song
    if (state.status === 'active') {
      playbackStates.set(conversationId, {
        ...state,
        songId,
        playbackPosition: playbackPosition || 0, // Reset to 0 on new song
        isPlaying: true,
        serverTimestamp: Date.now(),
        revision: state.revision + 1,
        updatedBy: user._id
      });
      broadcastState(conversationId);
    }
  });

  socket.on('music:accept', async (data) => {
    const { conversationId } = data;
    if (!conversationId) return;
    if (!(await checkMembership(conversationId))) return;

    let state = playbackStates.get(conversationId);
    if (!state || state.status !== 'pending') return;

    // Transition to active and start playing the pending song
    playbackStates.set(conversationId, {
      ...state,
      status: 'active',
      songId: state.pendingSongId,
      pendingSongId: null,
      initiatorId: null,
      playbackPosition: 0,
      isPlaying: true,
      serverTimestamp: Date.now(),
      revision: state.revision + 1,
      updatedBy: user._id
    });
    
    broadcastState(conversationId);
  });

  socket.on('music:reject', async (data) => {
    const { conversationId } = data;
    if (!conversationId) return;
    if (!(await checkMembership(conversationId))) return;

    let state = playbackStates.get(conversationId);
    if (!state || state.status !== 'pending') return;

    // Reset to inactive
    playbackStates.set(conversationId, {
      ...state,
      status: 'inactive',
      pendingSongId: null,
      initiatorId: null
    });
    
    io.to(`conv:${conversationId}`).emit('music:rejected', {
      userId: user._id,
      conversationId
    });
  });

  socket.on('music:sync_playlist', async (data) => {
    const { conversationId, action, payload } = data;
    if (!conversationId) return;
    if (!(await checkMembership(conversationId))) return;
    
    // Broadcast playlist change to partner
    socket.to(`conv:${conversationId}`).emit('music:playlist_updated', {
      action,
      payload,
      updatedBy: user._id
    });
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

  socket.on('music:stop', async (data) => {
    const { conversationId } = data;
    if (!conversationId) return;
    if (!(await checkMembership(conversationId))) return;

    playbackStates.set(conversationId, {
      status: 'inactive',
      songId: null,
      pendingSongId: null,
      initiatorId: null,
      isPlaying: false,
      playbackPosition: 0,
      revision: 0,
      serverTimestamp: Date.now(),
      updatedBy: user._id
    });

    io.to(`conv:${conversationId}`).emit('music:stopped', { conversationId });
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
      if (state.status === 'active') {
        socket.emit('music:state', state);
      } else if (state.status === 'pending') {
        if (state.initiatorId === user._id) {
          socket.emit('music:pending', { songId: state.pendingSongId, conversationId });
        } else {
          socket.emit('music:request_accept', {
            initiatorId: state.initiatorId,
            songId: state.pendingSongId,
            conversationId
          });
        }
      }
    }
  });
};
