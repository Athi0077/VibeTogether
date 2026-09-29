import { useState, useRef, useEffect } from 'react';
import { Phone, Video, MoreVertical, Paperclip, Send, Music, Play, Pause, ArrowLeft, MonitorPlay } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import SharedPlaylist from '../components/SharedPlaylist';
import { YouTubeUrlModal } from '../features/youtube-player';
import { useYouTube } from '../context/YouTubeContext';
import api from '../services/api';

const formatTime = (time) => {
  if (isNaN(time)) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function ChatPage() {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  
  const { togglePlay, currentSong, isPlaying, setActiveConversationId } = useAudio();
  const { socket } = useSocket();
  const { user } = useAuth();
  const { initiateCall } = useCall();
  const yt = useYouTube();
  
  const typingTimeoutRef = useRef(null);

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const { data } = await api.get('/friends');
        setFriends(data);
      } catch (error) {
        console.error("Failed to fetch friends", error);
      }
    };
    fetchFriends();
  }, []);

  const handleSelectFriend = async (friend) => {
    setSelectedFriend(friend);
    setMessages([]);
    setActiveConversation(null);
    try {
      const { data: conv } = await api.post(`/conversations/direct/${friend._id}`);
      setActiveConversation(conv);
    } catch (error) {
      console.error("Failed to load conversation", error);
    }
  };

  const handleBackToList = () => {
    setSelectedFriend(null);
    setActiveConversation(null);
    setMessages([]);
  };

  useEffect(() => {
    if (!socket) return;
    
    const handlePresence = ({ userId, isOnline, currentListeningTo }) => {
      setFriends(prev => prev.map(f => f._id === userId ? { ...f, isOnline, currentListeningTo } : f));
      setSelectedFriend(prev => (prev && prev._id === userId) ? { ...prev, isOnline, currentListeningTo } : prev);
    };

    socket.on('user:presence', handlePresence);
    return () => socket.off('user:presence', handlePresence);
  }, [socket]);

  useEffect(() => {
    if (!activeConversation) return;
    const CONVERSATION_ID = activeConversation._id;

    const fetchMessages = async () => {
      try {
        const msgsRes = await api.get(`/conversations/${CONVERSATION_ID}/messages`);
        setMessages(msgsRes.data);
      } catch (error) {
        console.error("Failed to fetch messages", error);
      }
    };

    fetchMessages();
    
    if (socket) {
      socket.emit('conversation:join', CONVERSATION_ID);
      
      const handleNewMessage = (msg) => {
        setMessages(prev => {
          if (prev.find(m => m.clientMessageId === msg.clientMessageId)) return prev;
          return [...prev, msg];
        });
      };
      
      const handleTyping = ({ userId, isTyping }) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (isTyping) newSet.add(userId);
          else newSet.delete(userId);
          return newSet;
        });
      };

      socket.on('message:new', handleNewMessage);
      socket.on('typing:update', handleTyping);
      
      return () => {
        socket.emit('conversation:leave', CONVERSATION_ID);
        socket.off('message:new', handleNewMessage);
        socket.off('typing:update', handleTyping);
      };
    }
  }, [activeConversation, socket]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Check if user is within 100px of the bottom
    const { scrollTop, scrollHeight, clientHeight } = container;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingUsers]);

  useEffect(() => {
    if (activeConversation) {
      setActiveConversationId(activeConversation._id);
      yt.setActiveConversationId(activeConversation._id);
    } else {
      setActiveConversationId(null);
      yt.setActiveConversationId(null);
    }

    return () => {
      setActiveConversationId(null);
      yt.setActiveConversationId(null);
    };
  }, [activeConversation, setActiveConversationId, yt]);

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!socket || !activeConversation) return;
    
    socket.emit('typing:start', activeConversation._id);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', activeConversation._id);
    }, 1500);
  };

  const handleSend = () => {
    if (!inputText.trim() || !socket || !activeConversation) return;
    
    const clientMessageId = Date.now().toString() + Math.random().toString();
    
    const tempMsg = {
      _id: clientMessageId,
      clientMessageId,
      text: inputText,
      content: inputText,
      senderId: { _id: user._id, name: user.name },
      createdAt: new Date().toISOString(),
      pending: true
    };
    
    setMessages(prev => [...prev, tempMsg]);
    setInputText('');
    
    socket.emit('typing:stop', activeConversation._id);
    
    socket.emit('message:send', {
      conversationId: activeConversation._id,
      content: tempMsg.content,
      clientMessageId
    }, (res) => {
      if (res.error) {
        setMessages(prev => prev.filter(m => m.clientMessageId !== clientMessageId));
        alert('Failed to send message: ' + res.error);
      } else {
        setMessages(prev => prev.map(m => m.clientMessageId === clientMessageId ? res.message : m));
      }
    });
  };


  return (
    <div className="flex h-full w-full bg-[#050308] overflow-hidden">
      {/* Sidebar List (Hidden on mobile if a friend is selected) */}
      <div className={`w-full md:w-80 border-r border-white/5 flex flex-col ${selectedFriend ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/5 bg-glass-card z-10">
          <h2 className="text-xl font-bold">Chats</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {friends.length === 0 ? (
            <div className="text-center p-4 text-gray-500 text-sm">No friends to chat with yet.</div>
          ) : (
            friends.map(friend => (
              <div 
                key={friend._id}
                onClick={() => handleSelectFriend(friend)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${selectedFriend?._id === friend._id ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                    {friend.avatarUrl ? (
                      <img src={friend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-white">{friend.name.charAt(0)}</span>
                    )}
                  </div>
                  {friend.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#050308] rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{friend.name}</h4>
                  <p className="text-xs text-purple-400 truncate">Tap to chat</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area (Hidden on mobile if no friend is selected) */}
      <div className={`flex-1 flex flex-col relative ${!selectedFriend ? 'hidden md:flex md:items-center md:justify-center' : 'flex'}`}>
        {!selectedFriend ? (
          <div className="text-center text-gray-500 flex flex-col items-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Send size={32} className="text-white/20" />
            </div>
            <p>Select a friend to start chatting</p>
          </div>
        ) : (
          <>
            <header className="bg-glass-card border-b border-white/5 p-4 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={handleBackToList} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white">
                  <ArrowLeft size={24} />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                    {selectedFriend.avatarUrl ? (
                      <img src={selectedFriend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-white">{selectedFriend.name.charAt(0)}</span>
                    )}
                  </div>
                  {selectedFriend.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#050308] rounded-full"></div>
                  )}
                </div>
                <div>
                  <h2 className="font-semibold leading-tight">{selectedFriend.name}</h2>
                  <p className="text-xs text-green-400">{selectedFriend.isOnline ? 'Online' : 'Offline'}</p>
                </div>
              </div>
              
              {activeConversation && (
                <div className="flex items-center gap-2 md:gap-4 text-gray-400">
                  <button onClick={() => initiateCall(activeConversation._id, 'audio', false)} className="p-2 hover:bg-white/5 rounded-full hover:text-white transition"><Phone size={20} /></button>
                  <button onClick={() => initiateCall(activeConversation._id, 'video', false)} className="p-2 hover:bg-white/5 rounded-full hover:text-white transition"><Video size={20} /></button>
                  <button onClick={() => setIsPlaylistOpen(!isPlaylistOpen)} className={`p-2 rounded-full transition ${isPlaylistOpen ? 'bg-purple-600 text-white' : 'hover:bg-white/5 hover:text-white'}`}><Music size={20} /></button>
                  <button onClick={() => yt.setIsModalOpen(true)} className="p-2 hover:bg-white/5 rounded-full hover:text-red-500 transition"><MonitorPlay size={20} /></button>
                </div>
              )}
            </header>
            
            <div className="flex-1 flex overflow-hidden relative min-h-0">
              <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
                <div 
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
                >
              {messages.map(msg => {
                const isMe = msg.senderId?._id === user?._id;
                const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={msg._id || msg.clientMessageId} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`px-4 py-2.5 rounded-2xl ${isMe ? 'bg-purple-600 rounded-tr-sm' : 'bg-glass-card rounded-tl-sm'} ${msg.pending ? 'opacity-70' : ''}`}>
                          <p className={`text-xs font-medium mb-1 ${isMe ? 'text-purple-200' : 'text-purple-400'}`}>{msg.senderId?.name}</p>
                          <p className="text-sm">{msg.content || msg.text}</p>
                        </div>
                      <span className="text-[10px] text-gray-500 mt-1 px-1">{timeStr}</span>
                    </div>
                  </div>
                );
              })}
              
              {typingUsers.size > 0 && Array.from(typingUsers).filter(id => id !== user?._id).length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-glass-card rounded-2xl rounded-tl-sm px-4 py-3 border border-white/5">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 md:p-4 bg-glass-card border-t border-white/5 z-10 shrink-0">
              <div className="flex items-center gap-2 md:gap-3 bg-black/40 p-1 md:p-2 rounded-2xl border border-white/5">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={handleTyping}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Message..." 
                  className="flex-1 bg-transparent border-none focus:outline-none text-white text-sm md:text-base px-4 py-2"
                />
                <button 
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="p-2 md:p-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition shrink-0"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
          
          {isPlaylistOpen && activeConversation && (
            <div className="absolute inset-0 md:relative md:inset-auto w-full md:w-80 border-l border-white/5 bg-glass-card flex flex-col shrink-0 transition-all z-50">
              <SharedPlaylist 
                conversationId={activeConversation._id} 
                partnerName={selectedFriend.name} 
                onClose={() => setIsPlaylistOpen(false)} 
              />
            </div>
          )}
            </div>
          </>
        )}
      </div>

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
    </div>
  );
}
