import { Search, Music, Play, Pause, Library } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

const formatTime = (time) => {
  if (isNaN(time)) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function MusicLibraryPage() {
  const { library, currentSong, isPlaying, playSong, togglePlay } = useAudio();

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
        {library.length > 0 ? (
          library.map((song) => {
            const isThisPlaying = currentSong?._id === song._id;
            return (
              <div 
                key={song._id} 
                className={`flex items-center justify-between p-3 rounded-2xl transition group ${isThisPlaying ? 'bg-purple-500/10 border border-purple-500/30' : 'hover:bg-white/5 border border-transparent'}`}
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
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-glass-card rounded-2xl border border-dashed border-white/10">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-500 mb-4">
              <Music size={32} />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Songs Yet</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              Songs you add to chats will appear here. Go to a chat and add some local music files!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
