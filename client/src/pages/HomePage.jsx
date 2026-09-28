import { useState, useEffect } from 'react';
import { Play, Search, MessageSquare, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function HomePage() {
  const navigate = useNavigate();
  const { library, playSong, currentSong, isPlaying, togglePlay } = useAudio();
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const { data } = await api.get('/friends');
        setFriends(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchFriends();
  }, []);

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

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name || 'User'}! 👋</h1>
        <p className="text-gray-400">Ready to listen to some music?</p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Search for songs, artists, or friends..." 
          className="w-full bg-glass-card rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
      </div>

      <section className="mb-10">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold">Recently Played</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
          {library.length > 0 ? library.slice(0, 5).map((song) => (
            <div key={song._id} className="min-w-[140px] md:min-w-[160px] bg-glass-card p-3 rounded-2xl snap-start group relative">
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
              </div>
              <h3 className="font-semibold text-sm truncate">{song.title}</h3>
              <p className="text-gray-400 text-xs truncate">{song.artist}</p>
            </div>
          )) : (
            <div className="text-gray-500 text-sm italic">Add some songs to your library to see them here.</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Your Friends</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {friends.length > 0 ? (
            friends.map(friend => (
              <div key={friend._id} onClick={() => navigate('/chat')} className="bg-glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition">
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
                    <h4 className="font-semibold">{friend.name}</h4>
                    <p className="text-xs text-purple-400">@{friend.username || 'user'}</p>
                  </div>
                </div>
                <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition">
                  <MessageSquare size={18} />
                </button>
              </div>
            ))
          ) : (
             <div className="text-gray-500 text-sm italic col-span-full">No friends yet. Head to the Friends tab to connect!</div>
          )}
        </div>
      </section>
    </div>
  );
}
