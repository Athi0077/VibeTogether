import React, { useState } from 'react';
import { Youtube, X, Loader } from 'lucide-react';
import api from '../../../services/api';

export default function YouTubeUrlModal({ isOpen, onClose, onAdd }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/youtube-player/validate-url', { url });
      onAdd(res.data);
      setUrl('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to validate URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#120f18] border border-red-500/20 p-6 rounded-2xl shadow-2xl shadow-red-900/20 max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
            <Youtube className="text-red-500" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Add YouTube Video</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">YouTube URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !url}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {loading ? <Loader className="animate-spin" size={18} /> : 'Add Video'}
          </button>
        </form>
      </div>
    </div>
  );
}
