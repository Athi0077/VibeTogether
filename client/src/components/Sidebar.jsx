import { NavLink } from 'react-router-dom';
import { Home, MessageSquare, Library, User, Play } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

export default function Sidebar() {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/chat', icon: MessageSquare, label: 'Chats' },
    { to: '/library', icon: Library, label: 'Library' },
    { to: '/friends', icon: User, label: 'Friends' },
    { to: '/profile', icon: User, label: 'Profile' }
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-glass border-r border-white/5 pt-8">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Play size={16} className="fill-white text-white ml-0.5" />
        </div>
        <h1 className="text-xl font-bold text-gradient">VibeTogether</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-purple-500/10 text-purple-400 font-medium' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 mt-auto border-t border-white/5 flex justify-center">
        <NotificationDropdown />
      </div>
    </aside>
  );
}
