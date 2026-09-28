const User = require('../models/User');

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, username, bio, privacySettings } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ message: 'Username is already taken' });
      user.username = username;
    }
    if (bio !== undefined) user.bio = bio;
    if (privacySettings) {
      user.privacySettings = { ...user.privacySettings, ...privacySettings };
    }

    await user.save();
    res.json({ message: 'Profile updated successfully', user: { name: user.name, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl }});
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const currentUser = await User.findById(req.user.id);
    
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.id } },
        { _id: { $nin: currentUser.blockedUsers || [] } },
        { 
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { name: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    }).select('name username avatarUrl').limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error searching users' });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);
    if (!user.blockedUsers) user.blockedUsers = [];
    if (!user.blockedUsers.includes(id)) {
      user.blockedUsers.push(id);
      await user.save();
    }
    res.json({ message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ message: 'Error blocking user' });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);
    if (user.blockedUsers) {
      user.blockedUsers = user.blockedUsers.filter(bId => bId.toString() !== id);
      await user.save();
    }
    res.json({ message: 'User unblocked' });
  } catch (error) {
    res.status(500).json({ message: 'Error unblocking user' });
  }
};
