import { useState, useEffect } from 'react';
import { Search, Music, Play, Pause, Library, MonitorPlay } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useYouTube } from '../context/YouTubeContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import SongActionModal from '../components/SongActionModal';

const formatTime = (time) => {
  if (isNaN(time)) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function MusicLibraryPage() {
  const { library, setLibraryData, currentSong, isPlaying, playSong, togglePlay } = useAudio();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState(null);
  const { socket } = useSocket();
  const yt = useYouTube();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('youtube'); // 'youtube' | 'legacy'

  const suggestedSongs = [
    { videoId: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', author: 'Rick Astley', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg' },
    { videoId: 'kJQP7kiw5Fk', title: 'Despacito', author: 'Luis Fonsi', thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg' },
    { videoId: 'RgKAFK5djSk', title: 'See You Again', author: 'Wiz Khalifa', thumbnail: 'https://img.youtube.com/vi/RgKAFK5djSk/mqdefault.jpg' }
  ];

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
    <div className="p-4 md:p-8 flex flex-col h-full absolute inset-0 overflow-y-auto custom-scrollbar">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Library className="text-purple-500" />
            Music Library
          </h1>
          <p className="text-gray-400 mt-1">Manage and discover songs</p>
        </div>
        <button 
          onClick={() => yt.setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-white font-medium transition"
        >
          <MonitorPlay size={18} />
          <span className="hidden sm:inline">Add YouTube URL</span>
        </button>
      </header>

      <div className="flex gap-4 mb-6 border-b border-white/10 pb-2">
        <button 
          onClick={() => setActiveTab('youtube')} 
          className={`font-medium pb-2 px-2 border-b-2 transition ${activeTab === 'youtube' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          YouTube Library
        </button>
        <button 
          onClick={() => setActiveTab('legacy')} 
          className={`font-medium pb-2 px-2 border-b-2 transition ${activeTab === 'legacy' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          Legacy Uploads
        </button>
      </div>

      {activeTab === 'youtube' && (
        <div className="space-y-8">
          {/* Global Suggested Songs */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
               Suggested Songs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedSongs.map((song) => (
                <div 
                  key={song.videoId} 
                  className="bg-glass-card p-3 rounded-2xl flex gap-4 cursor-pointer hover:bg-white/10 transition group border border-transparent hover:border-white/10"
                  onClick={() => setSelectedSong({ ...song, _id: song.videoId })}
                >
                  <div className="w-24 aspect-video rounded-lg overflow-hidden shrink-0 relative">
                    <img src={song.thumbnail} alt="thumb" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Play className="text-white fill-white" size={16} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-semibold text-sm text-white truncate">{song.title}</h3>
                    <p className="text-xs text-gray-400 truncate">{song.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Personal Library */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
               Personal Library
            </h2>
            {yt.savedSongs.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                <p className="text-gray-400 mb-4">No saved songs yet.</p>
                <button 
                  onClick={() => yt.setIsModalOpen(true)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition"
                >
                  Add your first song
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {yt.savedSongs.map((song) => (
                  <div 
                    key={song.videoId} 
                    className="bg-glass-card p-3 rounded-2xl flex gap-4 cursor-pointer hover:bg-white/10 transition group border border-transparent hover:border-white/10 relative"
                  >
                    <div 
                      className="flex-1 flex gap-4 min-w-0"
                      onClick={() => setSelectedSong({ ...song, _id: song.videoId })}
                    >
                      <div className="w-24 aspect-video rounded-lg overflow-hidden shrink-0 relative">
                        <img src={song.thumbnail} alt="thumb" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <Play className="text-white fill-white" size={16} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h3 className="font-semibold text-sm text-white truncate">{song.title}</h3>
                        <p className="text-xs text-gray-400 truncate">{song.author}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        yt.removeSavedSong(song.videoId);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
                      title="Remove from library"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'legacy' && (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search library..." 
              className="w-full bg-glass-card rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pb-6 custom-scrollbar">
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
                            setSelectedSong(song);
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
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center p-6 text-gray-400">No legacy uploads found.</div>
            )}
          </div>
        </>
      )}

      <YouTubeUrlModal 
        isOpen={yt.isModalOpen} 
        onClose={() => yt.setIsModalOpen(false)} 
        onAdd={async (video) => {
          try {
            await yt.saveSong({
              videoId: video.videoId,
              title: video.title,
              thumbnail: video.thumbnail,
              author: video.author
            });
            alert('Saved to your library!');
          } catch(e) {
            alert('Failed to save or already saved.');
          }
        }} 
      />

      <SongActionModal  
        isOpen={!!selectedSong}
        onClose={() => setSelectedSong(null)}
        song={selectedSong}
        onPlaySolo={(song) => {
          if (song.videoId) {
            // It's a YouTube song
            yt.playSolo(song);
          } else {
            // Legacy audio
            playSong(song);
          }
        }}
        onShare={async (song, friendId) => {
          try {
            const { data: conv } = await api.post(`/conversations/direct/${friendId}`);
            if (song.videoId) {
              // Share youtube song
              yt.setActiveConversationId(conv._id);
              yt.requestPlay(song);
              alert('Song shared to conversation!'); // Basic Phase 2 UI feedback
            } else {
              socket.emit('music:play', {
                conversationId: conv._id,
                songId: song._id,
                playbackPosition: 0
              });
            }
            navigate('/chat');
          } catch(e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
}
