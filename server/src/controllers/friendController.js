const Friendship = require('../models/Friendship');
const User = require('../models/User');

exports.sendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (recipientId === req.user.id) return res.status(400).json({ message: 'Cannot friend yourself' });

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ message: 'User not found' });
    if (recipient.blockedUsers?.includes(req.user.id)) return res.status(403).json({ message: 'Blocked' });

    // Check if friendship already exists
    const existing = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: recipientId },
        { requester: recipientId, recipient: req.user.id }
      ]
    });

    if (existing) return res.status(400).json({ message: 'Friendship or request already exists' });

    const friendship = await Friendship.create({ requester: req.user.id, recipient: recipientId });
    res.status(201).json(friendship);
  } catch (error) {
    res.status(500).json({ message: 'Error sending request' });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
      status: 'accepted'
    }).populate('requester recipient', 'name username avatarUrl isOnline');

    const friends = friendships.map(f => f.requester._id.toString() === req.user.id ? f.recipient : f.requester);
    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching friends' });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await Friendship.find({ recipient: req.user.id, status: 'pending' })
      .populate('requester', 'name username avatarUrl');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching requests' });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const { id } = req.params; // Friendship ID
    const friendship = await Friendship.findOne({ _id: id, recipient: req.user.id, status: 'pending' });
    if (!friendship) return res.status(404).json({ message: 'Request not found' });

    friendship.status = 'accepted';
    await friendship.save();
    res.json({ message: 'Request accepted' });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting request' });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const friendship = await Friendship.findOne({ _id: id, recipient: req.user.id, status: 'pending' });
    if (!friendship) return res.status(404).json({ message: 'Request not found' });

    friendship.status = 'rejected';
    await friendship.save();
    res.json({ message: 'Request rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting request' });
  }
};

exports.removeFriend = async (req, res) => {
  try {
    const { id } = req.params; // ID of the friend to remove
    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { requester: req.user.id, recipient: id },
        { requester: id, recipient: req.user.id }
      ],
      status: 'accepted'
    });
    
    if (!friendship) return res.status(404).json({ message: 'Friendship not found' });
    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing friend' });
  }
};
