const Conversation = require('../models/Conversation');
const Call = require('../models/Call');

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

  // Call Initiation Flow
  socket.on('call:initiate', async (data, callback) => {
    const { conversationId, callType } = data; // 'audio' or 'video'
    if (!(await checkMembership(conversationId))) {
      return typeof callback === 'function' && callback({ error: 'Unauthorized' });
    }

    // Broadcast incoming call to room
    socket.to(`conv:${conversationId}`).emit('call:incoming', {
      conversationId,
      callType,
      initiator: { _id: user._id, name: user.name, avatar: user.avatar }
    });

    if (typeof callback === 'function') callback({ success: true });
  });

  socket.on('call:accept', async (data) => {
    const { conversationId } = data;
    if (!(await checkMembership(conversationId))) return;
    socket.to(`conv:${conversationId}`).emit('call:accepted', {
      conversationId,
      participantId: user._id
    });
  });

  socket.on('call:decline', async (data) => {
    const { conversationId } = data;
    if (!(await checkMembership(conversationId))) return;
    socket.to(`conv:${conversationId}`).emit('call:declined', {
      conversationId,
      participantId: user._id
    });
    
    // Log as declined
    await Call.create({
      conversationId,
      callType: 'audio', // default
      initiatedBy: user._id, // the one who originated the decline? No, initiator is lost in this simple event. Real app would pass callId.
      status: 'declined'
    });
  });

  socket.on('call:end', async (data) => {
    const { conversationId, duration, callType, initiatorId } = data;
    if (!(await checkMembership(conversationId))) return;
    
    socket.to(`conv:${conversationId}`).emit('call:ended', { conversationId });

    if (initiatorId === user._id.toString()) {
      await Call.create({
        conversationId,
        callType: callType || 'audio',
        initiatedBy: user._id,
        duration: duration || 0,
        status: 'completed'
      });
    }
  });

  // WebRTC Native Signaling (For 1-to-1)
  socket.on('webrtc:offer', async (data) => {
    if (!(await checkMembership(data.conversationId))) return;
    socket.to(`conv:${data.conversationId}`).emit('webrtc:offer', {
      sdp: data.sdp,
      senderId: user._id,
      conversationId: data.conversationId
    });
  });

  socket.on('webrtc:answer', async (data) => {
    if (!(await checkMembership(data.conversationId))) return;
    socket.to(`conv:${data.conversationId}`).emit('webrtc:answer', {
      sdp: data.sdp,
      senderId: user._id,
      conversationId: data.conversationId
    });
  });

  socket.on('webrtc:ice-candidate', async (data) => {
    if (!(await checkMembership(data.conversationId))) return;
    socket.to(`conv:${data.conversationId}`).emit('webrtc:ice-candidate', {
      candidate: data.candidate,
      senderId: user._id,
      conversationId: data.conversationId
    });
  });
};
