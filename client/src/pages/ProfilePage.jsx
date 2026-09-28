import { useState, useEffect } from 'react';
import { User, Lock, Mail, Camera, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ProfilePage() {
  const { user, login, logout } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', username: '', bio: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/users/me');
      setProfile(data);
      setFormData({ name: data.name || '', username: data.username || '', bio: data.bio || '' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/users/me', formData);
      setProfile({ ...profile, ...data.user });
      setIsEditing(false);
    } catch (e) {
      alert(e.response?.data?.message || 'Error updating profile');
    }
  };

  if (!profile) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="bg-glass-card border border-white/5 rounded-3xl p-6 md:p-8">
        
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-white">{profile.name.charAt(0)}</span>
              )}
            </div>
            {isEditing && (
              <label className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition">
                <Camera className="text-white" />
                <input type="file" className="hidden" accept="image/*" />
              </label>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold">{profile.name}</h1>
            <p className="text-purple-400">@{profile.username || 'set-username'}</p>
            <p className="text-gray-400 mt-2">{profile.bio || 'No bio yet.'}</p>
          </div>
          
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition"
            >
              Edit Profile
            </button>
          )}
        </div>

        {isEditing && (
          <form onSubmit={handleSubmit} className="space-y-4 mb-8 p-6 bg-black/20 rounded-2xl border border-white/5">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Display Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input 
                type="text" 
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bio</label>
              <textarea 
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500 h-24 resize-none"
              ></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl transition font-medium"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-white/10 pb-2 mb-4">Account Details</h3>
          <div className="flex items-center gap-4 p-4 bg-black/20 rounded-xl border border-white/5">
            <Mail className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-400">Email Address</p>
              <p>{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-black/20 rounded-xl border border-white/5">
            <Lock className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-400">Privacy Settings</p>
              <p className="capitalize">{profile.privacySettings?.profileVisibility || 'Public'}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-center">
          <button 
            onClick={() => logout()} 
            className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition font-semibold"
          >
            <LogOut size={20} />
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
}
