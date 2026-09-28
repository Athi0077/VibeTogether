const Conversation = require('../models/Conversation');
const User = require('../models/User');

exports.getOrCreateDirectConversation = async (req, res) => {
  try {
    const { friendId } = req.params;
    
    // Check if user exists
    const friend = await User.findById(friendId);
    if (!friend) return res.status(404).json({ message: 'User not found' });

    // Find existing direct conversation between the two users
    let conv = await Conversation.findOne({
      type: 'direct',
      members: { $all: [req.user.id, friendId] }
    });

    if (!conv) {
      conv = await Conversation.create({
        type: 'direct',
        members: [req.user.id, friendId],
        createdBy: req.user.id
      });
    }

    res.json(conv);
  } catch (error) {
    res.status(500).json({ message: 'Error getting conversation' });
  }
};

exports.getUserConversations = async (req, res) => {
  try {
    const convs = await Conversation.find({ members: req.user.id })
      .populate('members', 'name username avatarUrl isOnline');
    res.json(convs);
  } catch (error) {
    res.status(500).json({ message: 'Error getting conversations' });
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conv = await Conversation.findById(conversationId);
    if (!conv || !conv.members.includes(req.user.id)) {
      return res.status(403).json({ message: 'Unauthorized access to conversation' });
    }
    
    // Also mark user presence correctly from DB
    const Message = require('../models/Message');
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name avatarUrl');
      
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error getting messages' });
  }
};
