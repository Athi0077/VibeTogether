import { useAudio } from '../context/AudioContext';
import { Music, Check, X } from 'lucide-react';

export default function MusicRequestPopup() {
  const { incomingRequest, acceptMusicRequest, rejectMusicRequest } = useAudio();

  if (!incomingRequest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#120f18] border border-purple-500/20 p-6 rounded-2xl shadow-2xl shadow-purple-900/20 max-w-sm w-full animate-in zoom-in-95">
        <div className="flex flex-col items-center text-center space-y-4">
          
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30 animate-pulse">
            <Music size={32} className="text-white" />
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Listen Together?</h3>
            <p className="text-gray-400 text-sm">
              Your partner wants to start a shared music session with you. Do you want to listen together?
            </p>
          </div>

          <div className="flex items-center gap-3 w-full pt-4">
            <button
              onClick={rejectMusicRequest}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
            >
              <X size={18} />
              <span>Decline</span>
            </button>
            <button
              onClick={acceptMusicRequest}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white font-bold transition-all shadow-lg shadow-purple-500/25"
            >
              <Check size={18} />
              <span>Listen</span>
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
