const crypto = require('crypto');

const Conversation = require('../../models/Conversation');
const User = require('../../models/User');

const ytPlaybackStates = new Map();

const verifyMembership = async (conversationId, userId) => {
  try {
    const conv = await Conversation.findById(conversationId);
    if (!conv) return false;
    return conv.members.some(m => m.toString() === userId.toString());
  } catch (e) {
    return false;
  }
};

module.exports = (io, socket) => {
  const user = socket.user;

  socket.on('yt:play', async (data) => {
    const { conversationId, videoId, videoDetails, playbackPosition } = data;
    if (!conversationId || (!videoId && !videoDetails)) return;
    
    const isMember = await verifyMembership(conversationId, user._id);
    if (!isMember) return;

    const actualVideoId = videoId || videoDetails?.videoId;

    let state = ytPlaybackStates.get(conversationId) || { status: 'idle' };
    const requestId = crypto.randomUUID();

    const newState = {
      ...state,
      status: 'pending',
      requestId,
      pendingVideoId: actualVideoId,
      videoDetails: videoDetails || {},
      initiatorId: user._id,
      initiatorName: user.name,
      conversationId,
      playbackPosition: playbackPosition || 0,
      timestamp: Date.now()
    };
    ytPlaybackStates.set(conversationId, newState);

    socket.to(`conv:${conversationId}`).emit('yt:request_accept', {
      requestId,
      initiatorId: user._id,
      initiatorName: user.name,
      videoId: actualVideoId,
      videoDetails: newState.videoDetails,
      conversationId,
      playbackPosition: newState.playbackPosition
    });

    socket.emit('yt:pending', { requestId, videoId: actualVideoId, conversationId });
  });

  socket.on('yt:accept', async (data) => {
    const { conversationId, requestId } = data;
    if (!conversationId || !requestId) return;

    const isMember = await verifyMembership(conversationId, user._id);
    if (!isMember) return;

    let state = ytPlaybackStates.get(conversationId);
    if (!state || state.status !== 'pending' || state.requestId !== requestId) return;

    // Prevent initiator from accepting their own request
    if (state.initiatorId.toString() === user._id.toString()) return;

    ytPlaybackStates.set(conversationId, {
      ...state,
      status: 'preparing',
      videoId: state.pendingVideoId,
      pendingVideoId: null,
      initiatorId: null,
      playbackPosition: state.playbackPosition,
      isPlaying: false,
      serverTimestamp: Date.now(),
      readyUsers: [],
      updatedBy: user._id,
      version: (state.version || 0) + 1
    });
    
    io.to(`conv:${conversationId}`).emit('yt:state', ytPlaybackStates.get(conversationId));

    setTimeout(() => {
      const currentState = ytPlaybackStates.get(conversationId);
      if (currentState && currentState.status === 'preparing' && currentState.version === (state.version || 0) + 1) {
         ytPlaybackStates.set(conversationId, {
            ...currentState,
            status: 'failed',
            error: 'Partner failed to load the video in time.',
            version: currentState.version + 1
         });
         io.to(`conv:${conversationId}`).emit('yt:state', ytPlaybackStates.get(conversationId));
      }
    }, 10000);
  });

  socket.on('yt:ready', async (data) => {
    const { conversationId, version } = data;
    if (!conversationId) return;

    const isMember = await verifyMembership(conversationId, user._id);
    if (!isMember) return;

    let state = ytPlaybackStates.get(conversationId);
    if (!state || state.status !== 'preparing' || state.version !== version) return;

    if (!state.readyUsers.includes(user._id.toString())) {
      state.readyUsers.push(user._id.toString());
    }

    if (state.readyUsers.length >= 2) {
       const startAt = Date.now() + 3000;
       ytPlaybackStates.set(conversationId, {
         ...state,
         status: 'playing',
         isPlaying: true,
         startAt,
         serverTimestamp: startAt,
         version: state.version + 1
       });
       io.to(`conv:${conversationId}`).emit('yt:state', ytPlaybackStates.get(conversationId));
    }
  });

  socket.on('yt:reject', async (data) => {
    const { conversationId, requestId } = data;
    if (!conversationId || !requestId) return;

    const isMember = await verifyMembership(conversationId, user._id);
    if (!isMember) return;

    let state = ytPlaybackStates.get(conversationId);
    if (!state || state.status !== 'pending' || state.requestId !== requestId) return;

    ytPlaybackStates.set(conversationId, {
      ...state,
      status: 'rejected',
      pendingVideoId: null,
      initiatorId: null
    });
    
    io.to(`conv:${conversationId}`).emit('yt:rejected', {
      requestId,
      userId: user._id,
      conversationId
    });
  });

  socket.on('yt:pause', async (data) => {
    const { conversationId, playbackPosition } = data;
    if (!conversationId) return;

    const isMember = await verifyMembership(conversationId, user._id);
    if (!isMember) return;

    let state = ytPlaybackStates.get(conversationId);
    if (!state || state.status !== 'playing') return;

    ytPlaybackStates.set(conversationId, {
      ...state,
      playbackPosition,
      isPlaying: false,
      serverTimestamp: Date.now(),
      updatedBy: user._id,
      version: (state.version || 0) + 1
    });

    io.to(`conv:${conversationId}`).emit('yt:state', ytPlaybackStates.get(conversationId));
  });

  socket.on('yt:seek', async (data) => {
    const { conversationId, playbackPosition } = data;
    if (!conversationId) return;

    const isMember = await verifyMembership(conversationId, user._id);
    if (!isMember) return;

    let state = ytPlaybackStates.get(conversationId);
    if (!state || state.status !== 'playing') return;

    ytPlaybackStates.set(conversationId, {
      ...state,
      playbackPosition,
      serverTimestamp: Date.now(),
      updatedBy: user._id,
      version: (state.version || 0) + 1
    });

    io.to(`conv:${conversationId}`).emit('yt:state', ytPlaybackStates.get(conversationId));
  });

  socket.on('yt:stop', async (data) => {
    const { conversationId } = data;
    if (!conversationId) return;

    const isMember = await verifyMembership(conversationId, user._id);
    if (!isMember) return;

    ytPlaybackStates.set(conversationId, {
      status: 'idle',
      videoId: null,
      pendingVideoId: null,
      initiatorId: null,
      isPlaying: false,
      playbackPosition: 0,
      serverTimestamp: Date.now(),
      updatedBy: user._id,
      version: 0
    });

    io.to(`conv:${conversationId}`).emit('yt:stopped', { conversationId });
  });

  socket.on('yt:request-state', async (conversationId, callback) => {
    if (!conversationId) return;
    const isMember = await verifyMembership(conversationId, user._id);
    if (!isMember) return;

    const state = ytPlaybackStates.get(conversationId) || { status: 'idle' };
    if (callback) callback({ state });
  });
};
