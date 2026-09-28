import { useState, useEffect } from 'react';
import { Play, Search, MessageSquare, Music, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { motion } from 'framer-motion';

export default function HomePage() {
  const navigate = useNavigate();
  const { library, playSong, currentSong, togglePlay } = useAudio();
  const { user } = useAuth();
  const { initiateCall } = useCall();
  const { socket } = useSocket();
  const [friends, setFriends] = useState([]);
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [friendsRes, trendingRes, likedRes] = await Promise.all([
          api.get('/friends'),
          api.get('/songs/trending'),
          api.get('/songs/liked')
        ]);
        setFriends(friendsRes.data);
        setTrendingSongs(trendingRes.data);
        setLikedSongs(likedRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handlePresence = ({ userId, isOnline, currentListeningTo }) => {
      setFriends(prev => prev.map(f => f._id === userId ? { ...f, isOnline, currentListeningTo } : f));
    };
    socket.on('user:presence', handlePresence);
    return () => socket.off('user:presence', handlePresence);
  }, [socket]);

  const handleLike = async (songId) => {
    try {
      await api.post(`/songs/${songId}/like`);
      // Re-fetch liked songs and trending
      const [trendingRes, likedRes] = await Promise.all([
        api.get('/songs/trending'),
        api.get('/songs/liked')
      ]);
      setTrendingSongs(trendingRes.data);
      setLikedSongs(likedRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartParty = async (e, friendId) => {
    e.stopPropagation();
    try {
      const { data: conv } = await api.post(`/conversations/direct/${friendId}`);
      initiateCall(conv._id, 'audio', true);
    } catch (err) {
      console.error("Failed to start party mode", err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const renderSongCard = (song, index) => {
    const isLiked = likedSongs.some(ls => ls._id === song._id);
    return (
      <motion.div variants={itemVariants} key={song._id + index} className="min-w-[140px] md:min-w-[160px] bg-glass-card p-3 rounded-2xl snap-start group relative hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
        <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 mb-3 flex items-center justify-center relative overflow-hidden">
          <Music size={32} className="text-gray-600" />
          <button 
            onClick={() => {
              if (currentSong?._id === song._id) {
                togglePlay();
              } else {
                playSong(song);
              }
            }}
            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Play size={20} className="text-white ml-1 fill-white" />
            </div>
          </button>
          <button 
            onClick={() => handleLike(song._id)}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-black/60"
          >
            <Heart size={16} className={`${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
        </div>
        <h3 className="font-semibold text-sm truncate">{song.title}</h3>
        <p className="text-gray-400 text-xs truncate">{song.artist}</p>
        <p className="text-gray-500 text-xs mt-1">{song.likesCount || 0} likes</p>
      </motion.div>
    );
  };

  const renderSkeletonCard = (key) => (
    <div key={key} className="min-w-[140px] md:min-w-[160px] bg-glass-card p-3 rounded-2xl snap-start animate-pulse">
      <div className="w-full aspect-square rounded-xl bg-gray-700/50 mb-3"></div>
      <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
    </div>
  );

  return (
    <div className="p-4 md:p-8">
      <header className="flex justify-between items-center mb-8 md:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Play size={16} className="fill-white text-white ml-0.5" />
          </div>
          <h1 className="text-xl font-bold text-gradient">VibeTogether</h1>
        </div>
        <button onClick={() => navigate('/profile')} className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden border border-white/10">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Athi'}`} alt="User Avatar" className="w-full h-full object-cover" />
        </button>
      </header>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name || 'User'}! 👋</h1>
        <p className="text-gray-400">Ready to discover new music?</p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Search for songs, artists, or friends..." 
          className="w-full bg-glass-card rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        />
      </motion.div>

      <motion.section variants={containerVariants} initial="hidden" animate="show" className="mb-10">
        <h2 className="text-xl font-bold mb-4">Trending Now 🔥</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x custom-scrollbar">
          {isLoading 
            ? Array(5).fill(0).map((_, i) => renderSkeletonCard(`trend-skel-${i}`))
            : trendingSongs.length > 0 ? trendingSongs.map(renderSongCard) : (
            <div className="text-gray-500 text-sm italic">No trending songs yet.</div>
          )}
        </div>
      </motion.section>

      <motion.section variants={containerVariants} initial="hidden" animate="show" className="mb-10">
        <h2 className="text-xl font-bold mb-4">Your Liked Songs ❤️</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x custom-scrollbar">
          {isLoading 
            ? Array(4).fill(0).map((_, i) => renderSkeletonCard(`like-skel-${i}`))
            : likedSongs.length > 0 ? likedSongs.map(renderSongCard) : (
            <div className="text-gray-500 text-sm italic">You haven't liked any songs yet. Discover some in Trending!</div>
          )}
        </div>
      </motion.section>

      <motion.section variants={containerVariants} initial="hidden" animate="show">
        <h2 className="text-xl font-bold mb-4">Your Friends</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={`friend-skel-${i}`} className="bg-glass-card p-4 rounded-2xl flex items-center justify-between animate-pulse">
                 <div className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-full bg-gray-700/50"></div>
                   <div>
                     <div className="h-4 bg-gray-700/50 rounded w-24 mb-2"></div>
                     <div className="h-3 bg-gray-700/50 rounded w-16"></div>
                   </div>
                 </div>
              </div>
            ))
          ) : friends.length > 0 ? (
            friends.map(friend => (
              <motion.div variants={itemVariants} key={friend._id} onClick={() => navigate('/chat')} className="bg-glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition group">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-white">{friend.name.charAt(0)}</span>
                      )}
                    </div>
                    {friend.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#050308] rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold group-hover:text-purple-400 transition-colors">{friend.name}</h4>
                    {friend.currentListeningTo ? (
                      <p className="text-xs text-green-400 truncate max-w-[150px]">
                        🎵 {friend.currentListeningTo}
                      </p>
                    ) : (
                      <p className="text-xs text-purple-400/70">@{friend.username || 'user'}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleStartParty(e, friend._id)}
                    className="h-10 px-3 rounded-full bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white flex items-center gap-2 transition-all hover:scale-105"
                    title="Start Listening Party"
                  >
                    <Music size={16} />
                    <span className="text-xs font-semibold hidden md:inline">Party</span>
                  </button>
                  <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all">
                    <MessageSquare size={18} />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
             <div className="col-span-full flex flex-col items-center justify-center p-8 bg-glass-card rounded-2xl border border-dashed border-white/10">
               <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                 <MessageSquare size={32} />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">No friends yet</h3>
               <p className="text-gray-400 text-sm mb-6 text-center max-w-sm">
                 Music is better with friends! Add someone to start chatting and listening together.
               </p>
               <button onClick={() => navigate('/friends')} className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all hover:scale-105">
                 Find Friends
               </button>
             </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}
