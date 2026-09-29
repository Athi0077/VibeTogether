import { useState, useEffect, useRef } from 'react';
import { Bell, UserPlus, MessageSquare, PhoneMissed } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { socket } = useSocket();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch (e) {
      console.error('Error fetching notifications', e);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchNotifications();

    if (socket) {
      socket.on('notification:new', (notification) => {
        setNotifications(prev => [notification, ...prev]);
      });
    }

    return () => {
      if (socket) socket.off('notification:new');
    };
  }, [socket]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) markAsRead(notification._id);
    
    setIsOpen(false);
    if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
      navigate('/friends');
    } else if (notification.type === 'message' || notification.type === 'call_missed') {
      navigate('/chat'); // In reality, you'd navigate to specific conversation
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-white transition relative"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-glass-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={async () => {
                  await api.put('/notifications/read-all');
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                }}
                className="text-xs text-purple-400 hover:text-purple-300 transition"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No notifications yet.</div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n._id} 
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer flex gap-3 transition ${n.read ? 'opacity-60' : 'bg-purple-500/5'}`}
                >
                  <div className={`mt-1 ${n.type === 'missed_call' ? 'text-red-400' : 'text-purple-400'}`}>
                    {n.type === 'friend_request' && <UserPlus size={18} />}
                    {n.type === 'friend_accepted' && <UserPlus size={18} />}
                    {n.type === 'message' && <MessageSquare size={18} />}
                    {n.type === 'call_missed' && <PhoneMissed size={18} />}
                  </div>
                  <div>
                    <p className="text-sm text-gray-200">
                      {n.type === 'friend_request' && 'New friend request received.'}
                      {n.type === 'friend_accepted' && 'Your friend request was accepted.'}
                      {n.type === 'message' && 'You have a new message.'}
                      {n.type === 'call_missed' && 'You missed a call.'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
