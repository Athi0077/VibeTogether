import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import MusicPlayer from './MusicPlayer';
import MusicRequestPopup from './MusicRequestPopup';
import { useAudio } from '../context/AudioContext';

export default function AppLayout() {
  const { currentSong } = useAudio();
  
  return (
    <div className="flex h-[100dvh] bg-[#050308] overflow-hidden text-white">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto pb-16 md:pb-0">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          <Outlet />
        </div>
      </main>

      {/* Music Player */}
      <MusicPlayer />
      <MusicRequestPopup />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
