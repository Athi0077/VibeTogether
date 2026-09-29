import { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Plus, Trash2, GripVertical, SkipBack, SkipForward, Clock, HardDrive, User as UserIcon } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAudio } from '../context/AudioContext';
import api from '../services/api';
import SongSelectionModal from './SongSelectionModal';

const formatTime = (time) => {
  if (isNaN(time)) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function SharedPlaylist({ conversationId, partnerName, onClose }) {
  const [playlist, setPlaylist] = useState(null);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const { socket } = useSocket();
  const { playSong, togglePlay, currentSong, isPlaying } = useAudio();
  const [activeTab, setActiveTab] = useState('playlist'); // 'playlist' | 'library'
  const [librarySongs, setLibrarySongs] = useState([]);
  
  const [draggedIdx, setDraggedIdx] = useState(null);

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const { data } = await api.get(`/playlists/${conversationId}`);
        setPlaylist(data);
      } catch (e) {
        console.error('Failed to fetch playlist', e);
      }
    };
    const fetchLibrary = async () => {
      try {
        const { data } = await api.get(`/songs/conversation/${conversationId}`);
        setLibrarySongs(data);
      } catch(e) {
        console.error(e);
      }
    };

    fetchPlaylist();
    fetchLibrary();

    if (socket) {
      const handleUpdate = (updatedPlaylist) => {
        setPlaylist(updatedPlaylist);
      };
      socket.on('playlist:updated', handleUpdate);
      
      const handleNewSong = (song) => {
        setLibrarySongs(prev => [song, ...prev]);
      };
      socket.on('music:uploaded', handleNewSong); // Optional if we emit this event
      
      return () => {
        socket.off('playlist:updated', handleUpdate);
        socket.off('music:uploaded', handleNewSong);
      };
    }
  }, [conversationId, socket]);

  useEffect(() => {
    // If the global audio player ends, auto-play next song
    const handleAudioEnded = async () => {
      if (!playlist || !playlist.songs || playlist.songs.length === 0) return;
      const currentIdx = playlist.songs.findIndex(s => s._id === currentSong?._id);
      if (currentIdx !== -1 && currentIdx < playlist.songs.length - 1) {
        const nextSong = playlist.songs[currentIdx + 1];
        playSong(nextSong);
        await api.put(`/playlists/${conversationId}/current`, { songId: nextSong._id });
      }
    };

    window.addEventListener('music:ended', handleAudioEnded);
    return () => window.removeEventListener('music:ended', handleAudioEnded);
  }, [currentSong, playlist, playSong, conversationId]);

  const handleAddSong = async (songId) => {
    try {
      await api.post(`/playlists/${conversationId}/add`, { songId });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveSong = async (songId) => {
    try {
      if (currentSong?._id === songId) {
        playNext();
      }
      await api.delete(`/playlists/${conversationId}/remove/${songId}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = async (e, dropIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIdx) return;
    
    const newSongs = [...playlist.songs];
    const [draggedItem] = newSongs.splice(draggedIdx, 1);
    newSongs.splice(dropIdx, 0, draggedItem);
    
    setPlaylist({ ...playlist, songs: newSongs });
    setDraggedIdx(null);
    
    try {
      await api.put(`/playlists/${conversationId}/reorder`, { newOrder: newSongs.map(s => s._id) });
    } catch (e) {
      console.error(e);
    }
  };

  const playPrevious = () => {
    if (!playlist || !playlist.songs) return;
    const currentIdx = playlist.songs.findIndex(s => s._id === currentSong?._id);
    if (currentIdx > 0) {
      const prevSong = playlist.songs[currentIdx - 1];
      playSong(prevSong);
      api.put(`/playlists/${conversationId}/current`, { songId: prevSong._id });
    }
  };

  const playNext = () => {
    if (!playlist || !playlist.songs) return;
    const currentIdx = playlist.songs.findIndex(s => s._id === currentSong?._id);
    if (currentIdx !== -1 && currentIdx < playlist.songs.length - 1) {
      const nextSong = playlist.songs[currentIdx + 1];
      playSong(nextSong);
      api.put(`/playlists/${conversationId}/current`, { songId: nextSong._id });
    }
  };

  const playSpecificSong = (song) => {
    if (currentSong?._id === song._id) {
      togglePlay();
    } else {
      playSong(song);
      api.put(`/playlists/${conversationId}/current`, { songId: song._id });
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg leading-tight">Our Playlist</h3>
          <p className="text-xs text-purple-400">with {partnerName}</p>
        </div>
        <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white rounded-full transition">
          <X size={20} />
        </button>
      </div>

      <div className="flex border-b border-white/5">
        <button 
          onClick={() => setActiveTab('playlist')}
          className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'playlist' ? 'text-purple-400 border-b-2 border-purple-400 bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          Queue
        </button>
        <button 
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'library' ? 'text-purple-400 border-b-2 border-purple-400 bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          Library
        </button>
      </div>

      {activeTab === 'playlist' ? (
        <>
          {/* Playlist Controls */}
      <div className="p-4 border-b border-white/5 bg-black/20 flex flex-col gap-3">
        <div className="flex items-center justify-center gap-6">
          <button onClick={playPrevious} className="p-2 text-gray-400 hover:text-white transition"><SkipBack size={20}/></button>
          <button onClick={() => {
            if (currentSong) togglePlay();
            else if (playlist?.songs?.length > 0) playSpecificSong(playlist.songs[0]);
          }} className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white hover:bg-purple-500 transition shadow-lg shadow-purple-500/20">
            {isPlaying && playlist?.songs?.some(s => s._id === currentSong?._id) ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </button>
          <button onClick={playNext} className="p-2 text-gray-400 hover:text-white transition"><SkipForward size={20}/></button>
        </div>
        <button 
          onClick={() => setIsSelectionModalOpen(true)}
          className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition"
        >
          <Plus size={16} /> Add Song
        </button>
      </div>

      {/* Song List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {!playlist?.songs || playlist.songs.length === 0 ? (
          <div className="text-center p-8 text-gray-500 text-sm">
            Playlist is empty.<br/>Add some songs to listen together!
          </div>
        ) : (
          playlist.songs.map((song, index) => {
            const isSelected = currentSong?._id === song._id;
            return (
              <div 
                key={song._id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex items-center gap-2 p-2 rounded-xl transition group ${isSelected ? 'bg-purple-600/20 border border-purple-500/30' : 'hover:bg-white/5 border border-transparent'}`}
              >
                <div className="cursor-grab active:cursor-grabbing text-gray-600 group-hover:text-gray-400 px-1">
                  <GripVertical size={16} />
                </div>
                
                <div onClick={() => playSpecificSong(song)} className="flex-1 min-w-0 cursor-pointer">
                  <h4 className={`text-sm font-medium truncate ${isSelected ? 'text-purple-400' : 'text-gray-200'}`}>{song.title}</h4>
                  <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                </div>
                
                <div className="text-xs text-gray-500 w-10 text-right shrink-0">
                  {formatTime(song.duration)}
                </div>

                <button 
                  onClick={() => handleRemoveSong(song._id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
      </>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {librarySongs.length === 0 ? (
             <div className="text-center p-8 text-gray-500 text-sm">
                No songs uploaded in this chat yet.
             </div>
          ) : (
             librarySongs.map((song) => (
               <div key={song._id} className="bg-white/5 p-3 rounded-xl border border-white/10 hover:border-purple-500/30 transition group">
                 <div className="flex items-start gap-3">
                   <div 
                     onClick={() => playSpecificSong(song)}
                     className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 cursor-pointer relative overflow-hidden"
                   >
                     <div className="absolute inset-0 bg-purple-500/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Play size={20} className="text-white fill-white ml-0.5" />
                     </div>
                     <Music size={20} className="text-gray-400 group-hover:opacity-0" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <h4 className="text-sm font-bold text-white truncate">{song.title}</h4>
                     <p className="text-xs text-gray-400 truncate mb-2">{song.artist}</p>
                     
                     <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><UserIcon size={10} /> {song.uploadedBy?.name || 'Unknown'}</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {formatTime(song.duration)}</span>
                        <span className="flex items-center gap-1"><HardDrive size={10} /> {(song.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                     </div>
                   </div>
                   
                   <button 
                     onClick={async () => {
                       if (window.confirm('Delete this song from the library?')) {
                         try {
                           await api.delete(`/songs/${song._id}`);
                           setLibrarySongs(prev => prev.filter(s => s._id !== song._id));
                         } catch (e) {
                           console.error(e);
                           alert(e.response?.data?.error || 'Failed to delete');
                         }
                       }
                     }}
                     className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                     title="Delete Song"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
               </div>
             ))
          )}
        </div>
      )}

      {isSelectionModalOpen && (
        <SongSelectionModal 
          isOpen={isSelectionModalOpen} 
          onClose={() => setIsSelectionModalOpen(false)}
          onAdd={handleAddSong}
          conversationId={conversationId}
        />
      )}
    </div>
  );
}
