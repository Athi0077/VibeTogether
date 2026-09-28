import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Loader, Maximize2, Minimize2, Minus, X } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

const formatTime = (time) => {
  if (isNaN(time)) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function MusicPlayer() {
  const { currentSong, isPlaying, isLoading, progress, duration, togglePlay, seek, stopSong } = useAudio();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasInitPos, setHasInitPos] = useState(false);
  
  const playerRef = useRef(null);
  const progressRef = useRef(null);
  const expandedProgressRef = useRef(null);
  
  // Dragging state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const elemStart = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    if (currentSong && !hasInitPos) {
      // Set initial position: bottom right, above mobile nav if any
      const isMobile = window.innerWidth < 768;
      setPosition({
        x: Math.max(10, window.innerWidth - (isMobile ? window.innerWidth - 20 : 340) - 20),
        y: Math.max(10, window.innerHeight - 80 - (isMobile ? 70 : 20))
      });
      setHasInitPos(true);
    }
  }, [currentSong, hasInitPos]);

  useEffect(() => {
    const handleResize = () => {
      // Ensure player stays within bounds on resize
      if (!playerRef.current || isExpanded) return;
      const rect = playerRef.current.getBoundingClientRect();
      setPosition(prev => ({
        x: Math.max(10, Math.min(prev.x, window.innerWidth - rect.width - 10)),
        y: Math.max(10, Math.min(prev.y, window.innerHeight - rect.height - 10))
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded]);

  if (!currentSong) return null;

  const handleSeek = (e, ref) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(percent * duration);
  };

  const handlePointerDown = (e) => {
    if (isExpanded) return;
    // Don't drag if clicking buttons or progress bar (unless it's an allow-drag button)
    if ((e.target.closest('button') && !e.target.closest('.allow-drag')) || e.target.closest('.no-drag')) return;
    
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    elemStart.current = { ...position };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current || isExpanded || !playerRef.current) return;
    
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    // Only set hasMoved if they actually drag more than a few pixels
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
       hasMoved.current = true;
    }
    
    const rect = playerRef.current.getBoundingClientRect();
    const newX = Math.max(10, Math.min(elemStart.current.x + dx, window.innerWidth - rect.width - 10));
    const newY = Math.max(10, Math.min(elemStart.current.y + dy, window.innerHeight - rect.height - 10));
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-glass-card border border-white/10 rounded-3xl w-full max-w-md flex flex-col p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button 
              onClick={() => setIsExpanded(false)}
              className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition"
            >
              <Minimize2 size={20} />
            </button>
            <button 
              onClick={stopSong}
              className="p-2 text-gray-400 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded-full transition"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/10 mt-6">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-purple-500/40">
               <span className="text-white font-bold text-5xl">
                 {currentSong.title ? currentSong.title.charAt(0).toUpperCase() : '?'}
               </span>
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-white mb-1 truncate">{currentSong.title}</h3>
            <p className="text-purple-400 text-sm truncate">{currentSong.artist}</p>
          </div>
          
          <div className="flex flex-col gap-2 mb-6">
             <div 
               ref={expandedProgressRef}
               className="h-2 w-full bg-gray-800 rounded-full cursor-pointer relative no-drag group"
               onClick={(e) => handleSeek(e, expandedProgressRef)}
             >
               <div 
                 className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full pointer-events-none"
                 style={{ width: `${(progress / (duration || 1)) * 100}%` }}
               />
               <div 
                 className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 pointer-events-none"
                 style={{ left: `calc(${(progress / (duration || 1)) * 100}% - 8px)` }}
               />
             </div>
             <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
               <span>{formatTime(progress)}</span>
               <span>{formatTime(duration)}</span>
             </div>
          </div>
          
          <div className="flex items-center justify-center gap-6">
            <button className="p-3 text-gray-400 hover:text-white transition">
              <SkipBack size={28} />
            </button>
            <button 
              onClick={togglePlay}
              disabled={isLoading}
              className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-xl disabled:opacity-50"
            >
              {isLoading ? <Loader size={28} className="animate-spin text-black" /> : 
               isPlaying ? <Pause size={28} className="fill-black" /> : <Play size={28} className="fill-black ml-1" />}
            </button>
            <button className="p-3 text-gray-400 hover:text-white transition">
              <SkipForward size={28} />
            </button>
          </div>
        </div>
      </div>
    );
  }



  // Circular Minimized Mode
  if (isMinimized) {
    return (
      <div 
        ref={playerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          visibility: hasInitPos ? 'visible' : 'hidden'
        }}
        className="fixed top-0 left-0 z-50 w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none animate-in zoom-in duration-200"
      >
        <button 
          onClick={(e) => {
             if (hasMoved.current) {
                e.preventDefault();
                return;
             }
             setIsMinimized(false);
          }}
          className="w-full h-full flex items-center justify-center rounded-full relative group overflow-hidden allow-drag"
        >
          {/* Progress ring or simple pulsing effect */}
          {isPlaying && (
            <div className="absolute inset-0 rounded-full border-2 border-white/30 border-t-white animate-spin pointer-events-none" />
          )}
          <span className="text-white font-bold text-xl relative z-10">
            {currentSong.title ? currentSong.title.charAt(0).toUpperCase() : '🎵'}
          </span>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </button>
      </div>
    );
  }

  // Mini Player Mode
  return (
    <div 
      ref={playerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        visibility: hasInitPos ? 'visible' : 'hidden'
      }}
      className="fixed top-0 left-0 z-50 w-[calc(100vw-20px)] md:w-80 bg-glass-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden touch-none"
    >
      {/* Drag handle / Progress bar combo */}
      <div className="h-2 w-full bg-black/40 relative cursor-pointer hover:bg-black/60 transition group no-drag"
           ref={progressRef}
           onClick={(e) => handleSeek(e, progressRef)}>
        <div 
          className="absolute top-0 left-0 h-full bg-purple-500 rounded-r-full pointer-events-none"
          style={{ width: `${(progress / (duration || 1)) * 100}%` }}
        />
      </div>
      
      <div className="flex items-center gap-3 p-3 cursor-grab active:cursor-grabbing">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">
            {currentSong.title ? currentSong.title.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
        
        <div className="flex-1 min-w-0 pointer-events-none">
          <h4 className="text-white font-medium text-sm truncate">{currentSong.title}</h4>
          <p className="text-gray-400 text-xs truncate">{currentSong.artist}</p>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={togglePlay}
            disabled={isLoading}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition disabled:opacity-50"
          >
            {isLoading ? <Loader size={16} className="animate-spin" /> : 
             isPlaying ? <Pause size={16} className="fill-white" /> : <Play size={16} className="fill-white ml-0.5" />}
          </button>
          
          <button 
            onClick={() => setIsMinimized(true)}
            className="w-8 h-8 rounded-full hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
          >
            <Minus size={20} />
          </button>

          <button 
            onClick={() => setIsExpanded(true)}
            className="w-8 h-8 rounded-full hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
          >
            <Maximize2 size={16} />
          </button>

          <button 
            onClick={stopSong}
            className="w-8 h-8 rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-400 flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
