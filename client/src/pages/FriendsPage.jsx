import { useState, useEffect } from 'react';
import { Search, UserPlus, Check, X, UserMinus } from 'lucide-react';
import api from '../services/api';

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState('friends'); // friends, pending, search
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState('');
  const [abortController, setAbortController] = useState(null);

  useEffect(() => {
    if (activeTab === 'friends') fetchFriends();
    if (activeTab === 'pending') fetchPending();
  }, [activeTab]);

  const fetchFriends = async () => {
    try {
      const { data } = await api.get('/friends');
      setFriends(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPending = async () => {
    try {
      const { data } = await api.get('/friends/pending');
      setPending(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (activeTab !== 'search') return;

    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      setRateLimitMsg('');
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      executeSearch(trimmedQuery);
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab]);

  const executeSearch = async (queryToSearch) => {
    if (abortController) {
      abortController.abort();
    }
    const controller = new AbortController();
    setAbortController(controller);
    
    setIsSearching(true);
    setRateLimitMsg('');

    try {
      const { data } = await api.get('/users/search', {
        params: { q: queryToSearch },
        signal: controller.signal
      });
      setSearchResults(data);
    } catch (e) {
      if (api.isCancel?.(e) || e.name === 'CanceledError') {
        return; // Ignore cancelled requests
      }
      if (e.response?.status === 429) {
        setRateLimitMsg(e.response.data?.message || 'Too many requests. Please slow down.');
      }
      setSearchResults([]);
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Handled by debounce
  };

  const sendRequest = async (userId) => {
    try {
      await api.post('/friends/request', { recipientId: userId });
      alert('Request sent!');
    } catch (e) {
      alert(e.response?.data?.message || 'Error sending request');
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await api.post(`/friends/accept/${requestId}`);
      setPending(pending.filter(p => p._id !== requestId));
    } catch (e) {
      alert('Error accepting request');
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await api.post(`/friends/reject/${requestId}`);
      setPending(pending.filter(p => p._id !== requestId));
    } catch (e) {
      alert('Error rejecting request');
    }
  };

  const removeFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      await api.delete(`/friends/${friendId}`);
      setFriends(friends.filter(f => f._id !== friendId));
    } catch (e) {
      alert('Error removing friend');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 h-full flex flex-col">
      <div className="flex gap-4 mb-6 border-b border-white/10">
        <button 
          onClick={() => setActiveTab('friends')}
          className={`pb-4 px-2 text-sm font-medium transition ${activeTab === 'friends' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}
        >
          My Friends
        </button>
        <button 
          onClick={() => setActiveTab('pending')}
          className={`pb-4 px-2 text-sm font-medium transition ${activeTab === 'pending' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}
        >
          Pending Requests
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          className={`pb-4 px-2 text-sm font-medium transition ${activeTab === 'search' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}
        >
          Find Friends
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'search' && (
          <div>
            <form onSubmit={handleSearch} className="mb-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or username..." 
                className="w-full bg-glass-card border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-purple-500 transition shadow-lg"
              />
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map(user => (
                <div key={user._id} className="bg-glass-card border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" /> : <span className="text-lg font-bold">{user.name.charAt(0)}</span>}
                    </div>
                    <div>
                      <h4 className="font-semibold">{user.name}</h4>
                      <p className="text-xs text-purple-400">@{user.username || 'user'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => sendRequest(user._id)}
                    className="p-2 bg-purple-600 hover:bg-purple-500 rounded-xl transition text-white"
                  >
                    <UserPlus size={18} />
                  </button>
                </div>
              ))}
              
              {isSearching && (
                <div className="col-span-full text-center text-gray-400 py-8">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Searching...
                </div>
              )}
              
              {rateLimitMsg && (
                <div className="col-span-full text-center text-red-400 py-8 bg-red-500/10 rounded-2xl">
                  {rateLimitMsg}
                </div>
              )}
              
              {!isSearching && !rateLimitMsg && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                <div className="col-span-full text-center text-gray-500 py-8">No users found.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends.map(friend => (
              <div key={friend._id} className="bg-glass-card border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                     {friend.avatarUrl ? <img src={friend.avatarUrl} className="w-full h-full rounded-full object-cover" /> : <span className="text-lg font-bold">{friend.name.charAt(0)}</span>}
                  </div>
                  <div>
                    <h4 className="font-semibold">{friend.name}</h4>
                    <p className="text-xs text-purple-400">@{friend.username || 'user'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => removeFriend(friend._id)}
                  className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition text-gray-400"
                  title="Remove Friend"
                >
                  <UserMinus size={18} />
                </button>
              </div>
            ))}
            {friends.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 px-4 bg-glass-card rounded-2xl border border-dashed border-white/10 text-center">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                  <UserPlus size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No friends yet</h3>
                <p className="text-gray-400 text-sm mb-6 max-w-sm">
                  Connect with others to share music and start listening parties together!
                </p>
                <button onClick={() => setActiveTab('search')} className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all hover:scale-105 shadow-lg shadow-purple-500/20">
                  Find Friends
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pending.map(request => (
              <div key={request._id} className="bg-glass-card border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    {request.requester.avatarUrl ? <img src={request.requester.avatarUrl} className="w-full h-full rounded-full object-cover" /> : <span className="text-lg font-bold">{request.requester.name.charAt(0)}</span>}
                  </div>
                  <div>
                    <h4 className="font-semibold">{request.requester.name}</h4>
                    <p className="text-xs text-gray-400">wants to be your friend</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => acceptRequest(request._id)}
                    className="p-2 bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white rounded-xl transition"
                  >
                    <Check size={18} />
                  </button>
                  <button 
                    onClick={() => rejectRequest(request._id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
            {pending.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 bg-glass-card rounded-2xl border border-dashed border-white/10 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Check size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">You're all caught up!</h3>
                <p className="text-gray-400 text-sm max-w-sm">
                  You don't have any pending friend requests at the moment.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
