import { useState, useEffect } from 'react';
import { Search, Music, Play, Pause, Library } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';

const formatTime = (time) => {
  if (isNaN(time)) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function MusicLibraryPage() {
  const { library, setLibraryData, currentSong, isPlaying, playSong, togglePlay } = useAudio();
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get('/songs/library');
        setLibraryData(data);
      } catch (err) {
        console.error("Failed to fetch library", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (library.length === 0) {
      fetchLibrary();
    } else {
      setIsLoading(false);
    }
  }, [library.length, setLibraryData]);

  return (
    <div className="p-4 md:p-8 flex flex-col h-full absolute inset-0">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Library className="text-purple-500" />
          Music Library
        </h1>
        <p className="text-gray-400 mt-1">Your local songs added to chats</p>
      </header>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Search library..." 
          className="w-full bg-glass-card rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pb-6">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={`skel-${i}`} className="flex items-center justify-between p-3 rounded-2xl border border-transparent animate-pulse bg-white/5">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl bg-gray-700/50 shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-700/50 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-700/50 rounded w-1/4"></div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="h-3 bg-gray-700/50 rounded w-12 hidden md:block"></div>
                <div className="h-3 bg-gray-700/50 rounded w-8 text-right"></div>
              </div>
            </div>
          ))
        ) : library.length > 0 ? (
          library.map((song) => {
            const isThisPlaying = currentSong?._id === song._id;
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={song._id} 
                className={`flex items-center justify-between p-3 rounded-2xl transition group ${isThisPlaying ? 'bg-purple-500/10 border border-purple-500/30' : 'hover:bg-white/5 border border-transparent hover:scale-[1.01]'}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div 
                    onClick={() => {
                      if (isThisPlaying) {
                        togglePlay();
                      } else {
                        playSong(song);
                      }
                    }}
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shrink-0 cursor-pointer relative overflow-hidden group-hover:shadow-lg"
                  >
                    {isThisPlaying && isPlaying ? (
                      <Pause size={20} className="text-purple-400" />
                    ) : (
                      <>
                        <Music size={20} className={`text-gray-500 ${isThisPlaying ? 'hidden' : 'group-hover:hidden'}`} />
                        <Play size={20} className={`text-white ml-1 ${isThisPlaying ? 'hidden group-hover:block' : 'hidden group-hover:block'}`} />
                      </>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-sm md:text-base truncate ${isThisPlaying ? 'text-purple-400' : 'text-white'}`}>{song.title}</h4>
                    <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm text-gray-500 hidden md:inline-block">
                    {song.fileSize ? `${(song.fileSize / (1024*1024)).toFixed(1)} MB` : ''}
                  </span>
                  <span className="text-sm text-gray-500 w-12 text-right">{formatTime(song.duration)}</span>
                </div>
              </motion.div>
            );
          })
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="flex flex-col items-center justify-center h-full text-center p-6 bg-glass-card rounded-2xl border border-dashed border-white/10"
          >
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Music size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Your library is empty</h3>
            <p className="text-gray-400 text-sm max-w-sm mb-6">
              Start building your collection by uploading songs to your chats or exploring trending tracks.
            </p>
            <button onClick={() => navigate('/')} className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all hover:scale-105 shadow-lg shadow-purple-500/20">
              Explore Trending
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
