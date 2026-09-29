import React from 'react';
import { useYouTube } from '../context/YouTubeContext';
import { YouTubePlayer, YouTubeMiniPlayer } from '../features/youtube-player';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X, Bookmark, BookmarkCheck } from 'lucide-react';

export default function GlobalYouTubePlayer() {
  const yt = useYouTube();

  if (yt.sessionStatus === 'idle' && !yt.incomingRequest && !yt.currentVideo) return null;

  const isSaved = yt.currentVideo ? yt.savedSongs.some(s => s.videoId === yt.currentVideo.videoId) : false;

  const handleSaveToggle = async () => {
    if (!yt.currentVideo) return;
    try {
      if (isSaved) {
        await yt.removeSavedSong(yt.currentVideo.videoId);
      } else {
        await yt.saveSong({
          videoId: yt.currentVideo.videoId,
          title: yt.currentVideo.title || 'YouTube Video',
          thumbnail: yt.currentVideo.thumbnail || '',
          author: yt.currentVideo.author || 'Unknown'
        });
      }
    } catch (e) {
      console.error('Failed to toggle save state', e);
    }
  };

  return (
    <>
      {/* Invisible container when minimized, keeps iframe mounted */}
      <div className={`fixed z-[100] transition-all duration-300 ${yt.isMinimized ? 'opacity-0 pointer-events-none scale-0 -bottom-full right-0' : 'inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm'}`}>
        {yt.currentVideo && (
          <div className="w-full max-w-4xl p-4 relative">
            <div className="absolute -top-12 right-4 flex items-center gap-4">
              <button onClick={handleSaveToggle} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition" title="Save to Library">
                {isSaved ? <BookmarkCheck className="text-red-500" size={20} /> : <Bookmark size={20} />}
              </button>
              <button onClick={() => yt.setIsMinimized(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition" title="Minimize">
                <Maximize2 size={20} className="rotate-180" />
              </button>
              <button onClick={() => yt.stopVideo()} className="p-2 bg-red-600 hover:bg-red-700 rounded-full text-white transition" title="Close">
                <X size={20} />
              </button>
            </div>
            <YouTubePlayer 
              videoId={yt.currentVideo.videoId} 
              playerRef={yt.playerRef} 
            />
          </div>
        )}
      </div>
      
      {/* Mini Player */}
      <AnimatePresence>
        {yt.isMinimized && (
          <YouTubeMiniPlayer {...yt} onRestore={() => yt.setIsMinimized(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
