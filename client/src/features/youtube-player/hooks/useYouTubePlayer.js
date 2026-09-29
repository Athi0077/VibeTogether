import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';
import { useSocket } from '../../../context/SocketContext';

export function useYouTubePlayer(activeConversationId = 'demo-room') {
  const [currentVideo, setCurrentVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('idle');
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playlist, setPlaylist] = useState([]);
  const { socket } = useSocket();
  const playerRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleState = (state) => {
      setSessionStatus('playing');
      if (state.videoId && (!currentVideo || currentVideo.videoId !== state.videoId)) {
        setCurrentVideo({ videoId: state.videoId });
      }
      if (state.isPlaying) {
        setIsPlaying(true);
        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
          // Sync position
          const drift = (Date.now() - state.serverTimestamp) / 1000;
          const expected = state.playbackPosition + drift;
          const current = playerRef.current.getCurrentTime();
          if (Math.abs(expected - current) > 1.5) {
            playerRef.current.seekTo(expected, true);
          }
          playerRef.current.playVideo();
        }
      } else {
        setIsPlaying(false);
        if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(state.playbackPosition, true);
        }
      }
    };

    const handleRequestAccept = (data) => {
      setSessionStatus('pending');
      setIncomingRequest(data);
    };

    const handlePending = (data) => {
      setSessionStatus('pending');
    };

    const handleRejected = () => {
      setSessionStatus('idle');
      alert('YouTube request rejected.');
    };

    const handleStopped = () => {
      setSessionStatus('idle');
      setCurrentVideo(null);
      setIsPlaying(false);
      setIncomingRequest(null);
    };

    socket.on('yt:state', handleState);
    socket.on('yt:request_accept', handleRequestAccept);
    socket.on('yt:pending', handlePending);
    socket.on('yt:rejected', handleRejected);
    socket.on('yt:stopped', handleStopped);

    return () => {
      socket.off('yt:state', handleState);
      socket.off('yt:request_accept', handleRequestAccept);
      socket.off('yt:pending', handlePending);
      socket.off('yt:rejected', handleRejected);
      socket.off('yt:stopped', handleStopped);
    };
  }, [socket, currentVideo, activeConversationId]);

  const requestPlay = (video) => {
    if (!socket) return;
    setCurrentVideo(video); // Optimistic UI update
    socket.emit('yt:play', {
      conversationId: activeConversationId,
      videoId: video.videoId,
      playbackPosition: 0
    });
  };

  const acceptRequest = () => {
    if (socket && incomingRequest) {
      setCurrentVideo({ videoId: incomingRequest.videoId });
      socket.emit('yt:accept', {
        conversationId: incomingRequest.conversationId,
        requestId: incomingRequest.requestId
      });
      setIncomingRequest(null);
    }
  };

  const rejectRequest = () => {
    if (socket && incomingRequest) {
      socket.emit('yt:reject', {
        conversationId: incomingRequest.conversationId,
        requestId: incomingRequest.requestId
      });
      setIncomingRequest(null);
      setSessionStatus('idle');
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      if (socket) {
        socket.emit('yt:pause', { conversationId: activeConversationId, playbackPosition: currentTime });
      }
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
      if (socket) {
        socket.emit('yt:play', { conversationId: activeConversationId, videoId: currentVideo.videoId, playbackPosition: currentTime });
      }
    }
  };

  const stopVideo = () => {
    if (socket) {
      socket.emit('yt:stop', { conversationId: activeConversationId });
    }
  };

  return {
    currentVideo,
    isPlaying,
    sessionStatus,
    incomingRequest,
    isModalOpen,
    setIsModalOpen,
    playlist,
    requestPlay,
    acceptRequest,
    rejectRequest,
    togglePlay,
    stopVideo,
    playerRef
  };
}
