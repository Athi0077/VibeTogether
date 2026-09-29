import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import MusicPlayer from './MusicPlayer';
import MusicRequestPopup from './MusicRequestPopup';
import UserTour from './UserTour';
import GlobalYouTubePlayer from './GlobalYouTubePlayer';
import { useAudio } from '../context/AudioContext';
import { AnimatePresence, motion } from 'framer-motion';

export default function AppLayout() {
  const { currentSong } = useAudio();
  const location = useLocation();
  
  return (
    <div className="flex h-[100dvh] bg-[#050308] overflow-hidden text-white">
      <UserTour />
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto pb-16 md:pb-0 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="max-w-6xl mx-auto h-full flex flex-col"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Music Player */}
      <MusicPlayer />
      <MusicRequestPopup />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Global YouTube Player */}
      <GlobalYouTubePlayer />
    </div>
  );
}
