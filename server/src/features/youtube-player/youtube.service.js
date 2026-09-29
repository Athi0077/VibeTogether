// Removed axios dependency since it is not in package.json

class YouTubeService {
  extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async fetchVideoDetails(videoId) {
    // In a real app, use YouTube Data API v3
    // For this isolated feature without adding new keys, we can use oEmbed
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (!response.ok) throw new Error('Failed to fetch video details');
      const data = await response.json();
      
      return {
        videoId,
        title: data.title,
        thumbnail: data.thumbnail_url,
        author: data.author_name
      };
    } catch (error) {
      throw new Error('Failed to fetch video details or video is private/unavailable.');
    }
  }
}

module.exports = new YouTubeService();
