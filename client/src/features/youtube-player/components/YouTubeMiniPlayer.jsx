import React from 'react';
import { Play, Pause, X, Check, MonitorPlay } from 'lucide-react';

export default function YouTubeMiniPlayer({ 
  currentVideo, isPlaying, sessionStatus, incomingRequest, 
  togglePlay, stopVideo, acceptRequest, rejectRequest 
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-[400px] bg-[#1a1721] border border-red-500/20 rounded-2xl p-3 shadow-2xl z-50 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
          <MonitorPlay className="text-red-500" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">Watching YouTube</p>
          <p className="text-red-400 text-xs">Shared Session</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={togglePlay} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>
        <button onClick={stopVideo} className="p-2 text-gray-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
