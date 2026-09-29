const axios = require('axios');

class YouTubeService {
  extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async fetchVideoDetails(videoId) {
    // In a real app, use YouTube Data API v3
    // For this isolated feature without adding new keys, we can use oEmbed
    try {
      const response = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      return {
        videoId,
        title: response.data.title,
        thumbnail: response.data.thumbnail_url,
        author: response.data.author_name
      };
    } catch (error) {
      throw new Error('Failed to fetch video details or video is private/unavailable.');
    }
  }
}

module.exports = new YouTubeService();
