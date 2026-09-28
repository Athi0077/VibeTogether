import { NavLink } from 'react-router-dom';
import { Home, MessageSquare, Library, User } from 'lucide-react';

export default function MobileBottomNav() {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/chat', icon: MessageSquare, label: 'Chats' },
    { to: '/library', icon: Library, label: 'Library' },
    { to: '/friends', icon: User, label: 'Friends' },
    { to: '/profile', icon: User, label: 'Profile' }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0710]/90 backdrop-blur-lg border-t border-white/5 z-50 pb-safe">
      <nav className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-purple-400' : 'text-gray-500'
              }`
            }
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
