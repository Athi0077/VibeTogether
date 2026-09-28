const cloudinary = require('../config/cloudinary');
const Song = require('../models/Song');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs');

// Utility to check conversation membership
const checkMembership = async (conversationId, userId) => {
  const conv = await Conversation.findById(conversationId);
  if (!conv) return false;
  return conv.members.includes(userId);
};

const uploadSong = async (req, res, next) => {
  try {
    const { conversationId, title, artist, duration, originalFileName, contentType } = req.body;
    const file = req.file;

    if (!conversationId || !file) {
      res.status(400);
      throw new Error('Missing required fields or file');
    }

    if (file.size > 25 * 1024 * 1024) { // 25 MB
      res.status(400);
      throw new Error('File size exceeds 25MB limit');
    }

    // Verify conversation access
    const isMember = await checkMembership(conversationId, req.user._id);
    if (!isMember) {
      res.status(403);
      throw new Error('Not authorized to access this conversation');
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: 'video', // for audio files
      folder: `music_partner/songs/${conversationId}`,
    });

    // Clean up local temp file
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    const song = await Song.create({
      title,
      artist: artist || 'Unknown Artist',
      originalFileName: originalFileName || file.originalname,
      mimeType: contentType || file.mimetype,
      fileSize: file.size,
      duration: duration || 0,
      publicId: result.public_id,
      secureUrl: result.secure_url,
      uploadedBy: req.user._id,
      conversationId
    });

    res.status(201).json(song);
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
};

const getSongsByConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    
    const isMember = await checkMembership(conversationId, req.user._id);
    if (!isMember) {
      res.status(403);
      throw new Error('Not authorized to access this conversation');
    }

    const songs = await Song.find({ conversationId })
      .populate('uploadedBy', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(songs);
  } catch (error) {
    next(error);
  }
};

const getPlayback = async (req, res, next) => {
  try {
    const { songId } = req.params;
    const song = await Song.findById(songId);
    if (!song) {
      res.status(404);
      throw new Error('Song not found');
    }

    if (song.conversationId) {
      const isMember = await checkMembership(song.conversationId, req.user._id);
      if (!isMember) {
        res.status(403);
        throw new Error('Not authorized to play this song');
      }
    }

    // Cloudinary URLs are already public and secure
    res.json({ playbackUrl: song.secureUrl, song });
  } catch (error) {
    next(error);
  }
};

const deleteSong = async (req, res, next) => {
  try {
    const { songId } = req.params;
    const song = await Song.findById(songId);
    
    if (!song) {
      res.status(404);
      throw new Error('Song not found');
    }

    if (song.uploadedBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this song');
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(song.publicId, { resource_type: 'video' });

    // Delete from Mongo
    await Song.deleteOne({ _id: songId });

    res.json({ message: 'Song deleted' });
  } catch (error) {
    next(error);
  }
};


const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

const convertOnly = async (req, res, next) => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400);
      throw new Error('Missing audio file');
    }

    if (file.size > 25 * 1024 * 1024) {
      res.status(413);
      throw new Error('File size exceeds the 25MB upload limit');
    }

    const uniqueId = crypto.randomBytes(8).toString('hex');
    const outputPath = `temp_${uniqueId}.mp3`;

    // Convert using FFmpeg
    try {
      await new Promise((resolve, reject) => {
        ffmpeg(file.path)
          .toFormat('mp3')
          .audioBitrate(128)
          .on('end', resolve)
          .on('error', (err) => {
            console.error('FFmpeg error:', err);
            reject(new Error('Invalid or unsupported audio file format.'));
          })
          .save(outputPath);
      });
    } catch (ffmpegError) {
      res.status(400);
      throw ffmpegError;
    }

    // Send the converted file directly to the client
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="converted.mp3"`);
    
    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);

    stream.on('end', () => {
      // Cleanup temp files after stream ends
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).end();
    });

  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    if (res.statusCode === 200) res.status(500);
    next(error);
  }
};

const getMyLibrary = async (req, res, next) => {
  try {
    const songs = await Song.find({ uploadedBy: req.user._id })
      .populate('uploadedBy', 'name avatar')
      .sort({ createdAt: -1 });

    // Deduplicate by secureUrl or title to avoid showing the same song multiple times if they uploaded it to multiple chats
    const uniqueSongs = [];
    const seenTitles = new Set();
    for (const song of songs) {
      if (!seenTitles.has(song.title.toLowerCase())) {
        seenTitles.add(song.title.toLowerCase());
        uniqueSongs.push(song);
      }
    }
    
    res.json(uniqueSongs);
  } catch (error) {
    next(error);
  }
};

const toggleLikeSong = async (req, res, next) => {
  try {
    const { songId } = req.params;
    const user = req.user;
    
    const song = await Song.findById(songId);
    if (!song) {
      res.status(404);
      throw new Error('Song not found');
    }

    const isLiked = user.likedSongs.includes(songId);

    if (isLiked) {
      user.likedSongs = user.likedSongs.filter(id => id.toString() !== songId.toString());
      song.likesCount = Math.max(0, song.likesCount - 1);
    } else {
      user.likedSongs.push(songId);
      song.likesCount += 1;
    }

    await user.save();
    await song.save();

    res.json({ isLiked: !isLiked, likesCount: song.likesCount });
  } catch (error) {
    next(error);
  }
};

const getTrendingSongs = async (req, res, next) => {
  try {
    const trending = await Song.find()
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(10)
      .populate('uploadedBy', 'name avatar');
    
    // Deduplicate by title to ensure a diverse trending list
    const uniqueSongs = [];
    const seenTitles = new Set();
    for (const song of trending) {
      if (!seenTitles.has(song.title.toLowerCase())) {
        seenTitles.add(song.title.toLowerCase());
        uniqueSongs.push(song);
      }
    }

    res.json(uniqueSongs);
  } catch (error) {
    next(error);
  }
};

const getLikedSongs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'likedSongs',
      populate: { path: 'uploadedBy', select: 'name avatar' }
    });
    res.json(user.likedSongs);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadSong,
  getSongsByConversation,
  getPlayback,
  deleteSong,
  convertOnly,
  getMyLibrary,
  toggleLikeSong,
  getTrendingSongs,
  getLikedSongs,
};
