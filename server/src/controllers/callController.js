const { AccessToken } = require('livekit-server-sdk');
const Call = require('../models/Call');
const Conversation = require('../models/Conversation');

exports.getCallHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Check membership
    const conv = await Conversation.findById(conversationId);
    if (!conv || !conv.members.includes(req.user.id)) {
      return res.status(403).json({ message: 'Unauthorized access to conversation' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const calls = await Call.find({ conversationId })
      .populate('initiatedBy', 'name avatar')
      .populate('participants', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(calls);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching call history' });
  }
};

exports.getLiveKitToken = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const roomName = `conv_${conversationId}`;
    const participantName = req.user.id;

    // Check membership
    const conv = await Conversation.findById(conversationId);
    if (!conv || !conv.members.includes(req.user.id)) {
      return res.status(403).json({ message: 'Unauthorized access to conversation' });
    }

    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return res.status(503).json({ message: 'LiveKit is not configured' });
    }

    const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: participantName,
    });
    
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

    const token = await at.toJwt();
    res.json({ token, roomName });
  } catch (error) {
    res.status(500).json({ message: 'Error generating token' });
  }
};

exports.getTurnCredentials = async (req, res) => {
  try {
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    if (process.env.TURN_URL) {
      iceServers.push({
        urls: process.env.TURN_URL,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD
      });
    }
    res.json({ iceServers });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching TURN credentials' });
  }
};
