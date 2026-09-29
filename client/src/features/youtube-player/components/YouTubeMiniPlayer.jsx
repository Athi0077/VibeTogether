import React from 'react';
import { Play, Pause, X, Check, MonitorPlay } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function YouTubeMiniPlayer({ 
  currentVideo, isPlaying, sessionStatus, incomingRequest, 
  togglePlay, stopVideo, acceptRequest, rejectRequest, onRestore
}) {
  
  if (sessionStatus === 'idle' && !incomingRequest && !currentVideo) return null;

  if (incomingRequest) {
    return (
      <div className="fixed bottom-24 right-4 md:right-8 bg-[#120f18] border border-red-500/20 p-4 rounded-2xl shadow-2xl shadow-red-900/20 max-w-sm w-full z-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MonitorPlay className="text-red-500" size={24} />
          <div>
            <p className="text-white text-sm font-medium">YouTube Request</p>
            <p className="text-gray-400 text-xs">Partner wants to watch a video</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={rejectRequest} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">
            <X size={16} />
          </button>
          <button onClick={acceptRequest} className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white">
            <Check size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'pending') {
    return (
      <div className="fixed bottom-24 right-4 md:right-8 bg-[#120f18] border border-gray-700 p-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3">
        <MonitorPlay className="text-gray-400" size={24} />
        <p className="text-gray-300 text-sm">Waiting for partner to accept...</p>
      </div>
    );
  }

  if (!currentVideo) return null;

  return (
    <motion.div 
      drag 
      dragConstraints={{ left: -window.innerWidth + 80, right: 0, top: -window.innerHeight + 120, bottom: 0 }}
      dragElastic={0.1}
      dragMomentum={false}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed bottom-24 right-4 z-[99] flex items-center justify-center cursor-grab active:cursor-grabbing group"
    >
      <div className="relative w-16 h-16 rounded-full overflow-hidden shadow-2xl shadow-red-900/30 border-2 border-red-500/50">
        {/* Animated ring when playing */}
        {isPlaying && (
          <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-50 z-0"></div>
        )}
        
        {/* Thumbnail */}
        {currentVideo.thumbnail ? (
          <img src={currentVideo.thumbnail} alt="Thumbnail" className="w-full h-full object-cover z-10 relative pointer-events-none" />
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center z-10 relative pointer-events-none">
            <MonitorPlay className="text-red-500" size={24} />
          </div>
        )}

        {/* Hover overlay controls */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
            className="p-1.5 text-white hover:text-red-400 transition"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onRestore && onRestore(); }} 
            className="p-1.5 text-white hover:text-blue-400 transition"
          >
            <MonitorPlay size={14} />
          </button>
        </div>
      </div>

      {/* Close button outside circle */}
      <button 
        onClick={(e) => { e.stopPropagation(); stopVideo(); }}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition shadow-lg z-30"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}
