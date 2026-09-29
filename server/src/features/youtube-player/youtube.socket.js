const crypto = require('crypto');

const ytPlaybackStates = new Map();

module.exports = (io, socket) => {
  const user = socket.user;

  socket.on('yt:play', (data) => {
    const { conversationId, videoId, playbackPosition } = data;
    if (!conversationId || !videoId) return;

    let state = ytPlaybackStates.get(conversationId) || { status: 'idle' };
    const requestId = crypto.randomUUID();

    const newState = {
      ...state,
      status: 'pending',
      requestId,
      pendingVideoId: videoId,
      initiatorId: user._id,
      conversationId,
      playbackPosition: playbackPosition || 0
    };
    ytPlaybackStates.set(conversationId, newState);

    socket.to(`conv:${conversationId}`).emit('yt:request_accept', {
      requestId,
      initiatorId: user._id,
      videoId,
      conversationId,
      playbackPosition: newState.playbackPosition
    });

    socket.emit('yt:pending', { requestId, videoId, conversationId });
  });

  socket.on('yt:accept', (data) => {
    const { conversationId, requestId } = data;
    if (!conversationId || !requestId) return;

    let state = ytPlaybackStates.get(conversationId);
    if (!state || state.status !== 'pending' || state.requestId !== requestId) return;

    const startAt = Date.now() + 1000;

    ytPlaybackStates.set(conversationId, {
      ...state,
      status: 'playing',
      videoId: state.pendingVideoId,
      pendingVideoId: null,
      initiatorId: null,
      playbackPosition: state.playbackPosition,
      isPlaying: true,
      serverTimestamp: startAt,
      startAt: startAt,
      updatedBy: user._id
    });
    
    io.to(`conv:${conversationId}`).emit('yt:state', ytPlaybackStates.get(conversationId));
  });

  socket.on('yt:reject', (data) => {
    const { conversationId, requestId } = data;
    if (!conversationId || !requestId) return;

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

  socket.on('yt:pause', (data) => {
    const { conversationId, playbackPosition } = data;
    if (!conversationId) return;

    let state = ytPlaybackStates.get(conversationId);
    if (!state) return;

    ytPlaybackStates.set(conversationId, {
      ...state,
      playbackPosition,
      isPlaying: false,
      serverTimestamp: Date.now(),
      updatedBy: user._id
    });

    io.to(`conv:${conversationId}`).emit('yt:state', ytPlaybackStates.get(conversationId));
  });

  socket.on('yt:seek', (data) => {
    const { conversationId, playbackPosition } = data;
    if (!conversationId) return;

    let state = ytPlaybackStates.get(conversationId);
    if (!state) return;

    ytPlaybackStates.set(conversationId, {
      ...state,
      playbackPosition,
      serverTimestamp: Date.now(),
      updatedBy: user._id
    });

    io.to(`conv:${conversationId}`).emit('yt:state', ytPlaybackStates.get(conversationId));
  });

  socket.on('yt:stop', (data) => {
    const { conversationId } = data;
    if (!conversationId) return;

    ytPlaybackStates.set(conversationId, {
      status: 'idle',
      videoId: null,
      pendingVideoId: null,
      initiatorId: null,
      isPlaying: false,
      playbackPosition: 0,
      serverTimestamp: Date.now(),
      updatedBy: user._id
    });

    io.to(`conv:${conversationId}`).emit('yt:stopped', { conversationId });
  });
};
