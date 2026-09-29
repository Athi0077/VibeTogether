const Conversation = require('../models/Conversation');
const crypto = require('crypto');

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

    let state = playbackStates.get(conversationId) || { revision: 0, status: 'idle' };
    const requestId = crypto.randomUUID();

    // Always require acceptance for a new play request
    const newState = {
      ...state,
      status: 'pending',
      requestId,
      pendingSongId: songId,
      initiatorId: user._id,
      conversationId,
      playbackPosition: playbackPosition || 0
    };
    playbackStates.set(conversationId, newState);

    socket.to(`conv:${conversationId}`).emit('music:request_accept', {
      requestId,
      initiatorId: user._id,
      songId,
      conversationId,
      playbackPosition: newState.playbackPosition
    });

    socket.emit('music:pending', { requestId, songId, conversationId });
  });

  socket.on('music:accept', async (data) => {
    const { conversationId, requestId } = data;
    if (!conversationId || !requestId) return;
    if (!(await checkMembership(conversationId))) return;

    let state = playbackStates.get(conversationId);
    if (!state || state.status !== 'pending' || state.requestId !== requestId) return;

    const startAt = Date.now() + 1000; // 1 second buffer for sync

    playbackStates.set(conversationId, {
      ...state,
      status: 'playing', // using 'playing' instead of 'active'
      songId: state.pendingSongId,
      pendingSongId: null,
      initiatorId: null,
      playbackPosition: state.playbackPosition,
      isPlaying: true,
      serverTimestamp: startAt,
      startAt: startAt,
      revision: state.revision + 1,
      updatedBy: user._id
    });
    
    io.to(`conv:${conversationId}`).emit('music:accepted', { conversationId, requestId, startAt });
    broadcastState(conversationId);
  });

  socket.on('music:reject', async (data) => {
    const { conversationId, requestId } = data;
    if (!conversationId || !requestId) return;
    if (!(await checkMembership(conversationId))) return;

    let state = playbackStates.get(conversationId);
    if (!state || state.status !== 'pending' || state.requestId !== requestId) return;

    playbackStates.set(conversationId, {
      ...state,
      status: 'rejected',
      pendingSongId: null,
      initiatorId: null
    });
    
    io.to(`conv:${conversationId}`).emit('music:rejected', {
      requestId,
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

  socket.on('music:resume', async (data) => {
    const { conversationId, playbackPosition } = data;
    if (!conversationId) return;

    if (!(await checkMembership(conversationId))) return;

    let state = playbackStates.get(conversationId);
    if (!state || state.status !== 'playing') return;

    playbackStates.set(conversationId, {
      ...state,
      playbackPosition: playbackPosition,
      isPlaying: true,
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
      status: 'idle',
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
      if (state.status === 'playing') {
        socket.emit('music:state', state);
      } else if (state.status === 'pending') {
        if (state.initiatorId === user._id) {
          socket.emit('music:pending', { requestId: state.requestId, songId: state.pendingSongId, conversationId });
        } else {
          socket.emit('music:request_accept', {
            requestId: state.requestId,
            initiatorId: state.initiatorId,
            songId: state.pendingSongId,
            conversationId,
            playbackPosition: state.playbackPosition
          });
        }
      }
    }
  });
};
