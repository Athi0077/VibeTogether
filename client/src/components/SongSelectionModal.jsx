import { useState, useEffect } from 'react';
import { X, Search, Upload, Music, Plus } from 'lucide-react';
import api from '../services/api';
import AddSongModal from './AddSongModal';

export default function SongSelectionModal({ isOpen, onClose, onAdd, conversationId }) {
  const [songs, setSongs] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchLibrary = async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get('/songs/library');
        setSongs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLibrary();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) || 
    s.artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-glass-card w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-white/5">
          <h3 className="text-xl font-bold">Add to Playlist</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-white/5 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search your library..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 transition"
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-purple-500 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition text-purple-300"
          >
            <Upload size={16} /> Upload New Song
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {search ? 'No songs match your search.' : 'Your library is empty.'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSongs.map(song => (
                <div key={song._id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                      <Music size={20} className="text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium truncate text-gray-200">{song.title}</h4>
                      <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      onAdd(song._id);
                      onClose();
                    }}
                    className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shrink-0 shadow-lg"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddSongModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        conversationId={conversationId}
        onAdd={(newSong) => {
          setSongs(prev => [newSong, ...prev]);
          setIsAddModalOpen(false);
          onAdd(newSong._id);
          onClose();
        }}
      />
    </div>
  );
}
