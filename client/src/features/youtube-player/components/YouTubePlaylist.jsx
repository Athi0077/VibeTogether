import React, { useEffect } from 'react';
import { Play } from 'lucide-react';
import api from '../../../services/api';

export default function YouTubePlaylist({ conversationId, playlist, setPlaylist, onPlay }) {
  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const res = await api.get(`/youtube-player/playlist/${conversationId}`);
        setPlaylist(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (conversationId) fetchPlaylist();
  }, [conversationId, setPlaylist]);

  if (playlist.length === 0) {
    return <div className="text-gray-500 text-center py-8">No YouTube videos added yet.</div>;
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
      {playlist.map((video) => (
        <div key={video._id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl group transition-colors">
          <div className="relative w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
            {video.thumbnail ? (
              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-red-900/20" />
            )}
            <button 
              onClick={() => onPlay(video)}
              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Play className="text-white" size={16} fill="currentColor" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white truncate">{video.title}</h4>
            <p className="text-xs text-gray-400 truncate">{video.author}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
