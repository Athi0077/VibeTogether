import { useState, useEffect } from 'react';
import { X, Play, Users, Search, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

export default function SongActionModal({ isOpen, onClose, song, onPlaySolo, onShare }) {
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('options'); // 'options' | 'friends'
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen && view === 'friends' && friends.length === 0) {
      const fetchFriends = async () => {
        try {
          setIsLoading(true);
          const { data } = await api.get('/friends');
          setFriends(data);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchFriends();
    }
  }, [isOpen, view, friends.length]);

  if (!isOpen || !song) return null;

  const handleShare = async (friendId) => {
    setIsSending(true);
    try {
      await onShare(song, friendId);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (f.username && f.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={onClose} 
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-[#1a1721] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-white/5 relative shrink-0">
            <button 
              onClick={() => view === 'friends' ? setView('options') : onClose()} 
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition"
            >
              <X size={20} />
            </button>
            <div className="flex gap-4 items-center mt-2">
               <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
                 <Play className="text-purple-400 ml-1" size={24} />
               </div>
               <div className="min-w-0">
                 <h2 className="text-lg font-bold text-white truncate pr-6">{song.title}</h2>
                 <p className="text-sm text-gray-400 truncate">{song.artist}</p>
               </div>
            </div>
          </div>

          <div className="overflow-y-auto p-4 custom-scrollbar">
            {view === 'options' ? (
              <div className="space-y-3">
                <button 
                  onClick={() => { onPlaySolo(song); onClose(); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    <Play size={20} className="ml-0.5 fill-current" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">Solo Listening</h3>
                    <p className="text-xs text-gray-400">Play instantly just for you</p>
                  </div>
                </button>

                <button 
                  onClick={() => setView('friends')}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition group"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                    <Users size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">Share with Friends</h3>
                    <p className="text-xs text-gray-400">Start a synchronized listening party</p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="relative mb-4 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search friends..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                  />
                </div>
                
                <div className="space-y-2 flex-1">
                  {isLoading ? (
                    <div className="flex justify-center p-4"><Loader className="animate-spin text-purple-500" size={24} /></div>
                  ) : filteredFriends.length > 0 ? (
                    filteredFriends.map(friend => (
                      <div key={friend._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                            {friend.avatarUrl ? (
                              <img src={friend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-white">{friend.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{friend.name}</p>
                            <p className="text-xs text-green-400">{friend.isOnline ? 'Online' : 'Offline'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleShare(friend._id)}
                          disabled={isSending}
                          className="px-4 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-50 transition"
                        >
                          Invite
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-sm text-gray-500 p-4">No friends found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
