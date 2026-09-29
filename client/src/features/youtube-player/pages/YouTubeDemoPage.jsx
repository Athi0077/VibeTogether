import React, { useState } from 'react';
import { useYouTubePlayer, YouTubePlayer, YouTubeMiniPlayer, YouTubePlaylist, YouTubeUrlModal } from '../';

export default function YouTubeDemoPage() {
  // Use a fixed demo room for testing
  const conversationId = 'demo-room-123';
  const player = useYouTubePlayer(conversationId);
  const { currentVideo, isModalOpen, setIsModalOpen, playlist, setPlaylist, requestPlay, playerRef } = player;

  const handleAddVideo = (video) => {
    // Optimistic UI for demo
    setPlaylist((prev) => [...prev, { _id: Date.now().toString(), ...video }]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-red-500">YouTube Shared Player Demo</h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium"
          >
            Add YouTube Video
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">Video Player</h2>
            {currentVideo ? (
              <YouTubePlayer 
                videoId={currentVideo.videoId} 
                playerRef={playerRef} 
              />
            ) : (
              <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center border border-gray-800">
                <p className="text-gray-500">No video selected. Add and play a video from the playlist.</p>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Demo Playlist</h2>
            <div className="bg-[#120f18] rounded-xl p-4 border border-gray-800 h-96">
              <YouTubePlaylist 
                conversationId={conversationId} 
                playlist={playlist}
                setPlaylist={setPlaylist}
                onPlay={(video) => requestPlay(video)}
              />
            </div>
          </div>
        </div>

        <YouTubeMiniPlayer {...player} />
        
        <YouTubeUrlModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onAdd={handleAddVideo} 
        />
      </div>
    </div>
  );
}
