const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

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

  socket.on('conversation:join', async (conversationId, callback) => {
    const isMember = await checkMembership(conversationId);
    if (!isMember) {
      if (typeof callback === 'function') callback({ error: 'Unauthorized' });
      return;
    }

    socket.join(`conv:${conversationId}`);
    
    socket.to(`conv:${conversationId}`).emit('conversation:members', {
      userId: user._id,
      status: 'online'
    });
    
    if (typeof callback === 'function') callback({ success: true });
  });

  socket.on('conversation:leave', (conversationId) => {
    socket.leave(`conv:${conversationId}`);
    socket.to(`conv:${conversationId}`).emit('conversation:members', {
      userId: user._id,
      status: 'offline'
    });
  });

  socket.on('message:send', async (data, callback) => {
    try {
      const { conversationId, content, clientMessageId } = data;
      
      const isMember = await checkMembership(conversationId);
      if (!isMember) {
        return typeof callback === 'function' && callback({ error: 'Unauthorized' });
      }

      if (!conversationId || !content || !clientMessageId) {
        return typeof callback === 'function' && callback({ error: 'Missing fields' });
      }

      let message = await Message.findOne({ clientMessageId });
      
      if (!message) {
        message = await Message.create({
          conversationId,
          senderId: user._id,
          content,
          clientMessageId
        });
      }

      const populatedMessage = await Message.findById(message._id).populate('senderId', 'name avatar');

      // Emit to conversation room (so sender gets it if they have other tabs open)
      io.to(`conv:${conversationId}`).emit('message:new', populatedMessage);
      
      // Also emit to user-specific room of the receiver
      const conv = await Conversation.findById(conversationId);
      if (conv) {
        const receiverId = conv.members.find(id => id.toString() !== user._id.toString());
        if (receiverId) {
          io.to(`user:${receiverId.toString()}`).emit('message:new', populatedMessage);
        }
      }

      if (typeof callback === 'function') {
        callback({ success: true, message: populatedMessage });
      }

    } catch (error) {
      console.error('message:send error', error);
      if (typeof callback === 'function') {
        callback({ error: error.message });
      }
    }
  });

  socket.on('typing:start', async (conversationId) => {
    if (await checkMembership(conversationId)) {
      socket.to(`conv:${conversationId}`).emit('typing:update', { userId: user._id, isTyping: true });
    }
  });

  socket.on('typing:stop', async (conversationId) => {
    if (await checkMembership(conversationId)) {
      socket.to(`conv:${conversationId}`).emit('typing:update', { userId: user._id, isTyping: false });
    }
  });
};
