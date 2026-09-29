import React from 'react';
import { useYouTube } from '../context/YouTubeContext';
import { YouTubePlayer, YouTubeMiniPlayer } from '../features/youtube-player';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X, Bookmark, BookmarkCheck, Volume2, MonitorPlay } from 'lucide-react';

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
            <div className="absolute -top-14 left-4 right-4 flex items-center justify-between">
              <div className="flex flex-col min-w-0 pr-4">
                <h3 className="font-bold text-lg text-white truncate">{yt.currentVideo.title || 'YouTube Video'}</h3>
                <p className="text-sm text-gray-400 truncate">{yt.currentVideo.author || 'Unknown'}</p>
                {!yt.isSoloMode && yt.sessionStatus !== 'idle' && (
                   <span className="text-xs text-purple-400 mt-1 font-medium bg-purple-500/20 px-2 py-0.5 rounded w-max">
                     Shared Session • {yt.sessionStatus === 'playing' ? (yt.isPlaying ? 'Playing' : 'Paused') : 'Syncing...'}
                   </span>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <div className="hidden sm:flex items-center gap-2 mr-2 w-24">
                  <Volume2 size={16} className="text-gray-400" />
                  <input 
                    type="range" min="0" max="100" step="1" 
                    value={yt.musicVolume}
                    onChange={(e) => yt.setMusicVolume(parseInt(e.target.value, 10))}
                    className="w-full accent-red-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
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
            </div>
            <YouTubePlayer 
              videoId={yt.currentVideo.videoId} 
              playerRef={yt.playerRef} 
            />
          </div>
        )}
      </div>
      
      {/* Global Incoming Request Banner */}
      <AnimatePresence>
        {yt.incomingRequest && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 bg-[#1a1721] border-2 border-red-500 p-4 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.3)] max-w-md w-[90%] z-[9999] flex flex-col gap-4"
          >
            <div className="flex items-center gap-3 border-b border-red-500/20 pb-3">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center shrink-0">
                <MonitorPlay className="text-red-500" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-bold truncate">YouTube Request from {yt.incomingRequest.initiatorName || 'Partner'}</p>
                <p className="text-gray-400 text-xs">Wants to watch a video with you</p>
              </div>
            </div>

            {yt.incomingRequest.videoDetails && (
              <div className="flex gap-3 items-center bg-black/40 rounded-xl p-2">
                {yt.incomingRequest.videoDetails.thumbnail && (
                  <img src={yt.incomingRequest.videoDetails.thumbnail} className="w-16 aspect-video rounded object-cover shrink-0" alt="thumb" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold truncate">{yt.incomingRequest.videoDetails.title || 'YouTube Video'}</p>
                  <p className="text-gray-400 text-xs truncate">{yt.incomingRequest.videoDetails.author}</p>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 mt-1">
              <button onClick={yt.rejectRequest} className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition">
                Decline
              </button>
              <button onClick={yt.acceptRequest} className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-white text-sm font-medium transition flex items-center justify-center gap-2">
                Accept
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Player */}
      <AnimatePresence>
        {yt.isMinimized && !yt.incomingRequest && (
          <YouTubeMiniPlayer {...yt} onRestore={() => yt.setIsMinimized(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
