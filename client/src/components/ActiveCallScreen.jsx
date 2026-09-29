import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Minimize2, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { useCall } from '../context/CallContext';
import { LiveKitRoom, VideoConference, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { useYouTube } from '../context/YouTubeContext';

function LiveKitVolumeController({ volume }) {
  const tracks = useTracks([Track.Source.Microphone, Track.Source.ScreenShareAudio]);
  
  useEffect(() => {
    tracks.forEach(trackRef => {
      // Only apply volume to remote participants' tracks
      if (trackRef.participant.isLocal) return;
      
      const track = trackRef.publication?.track;
      if (track && track.kind === 'audio' && typeof track.setVolume === 'function') {
        track.setVolume(volume);
      }
    });
  }, [tracks, volume]);

  return null;
}

export default function ActiveCallScreen() {
  const { 
    callState, callDetails, 
    localMediaStream, remoteMediaStream, 
    isMuted, isVideoOff, 
    liveKitToken, liveKitRoomName,
    isCallMinimized, setIsCallMinimized,
    remoteVolume, setRemoteVolume,
    toggleMute, toggleVideo, endCall 
  } = useCall();
  const { sessionStatus } = useYouTube();
  
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const remoteAudioRef = useRef();

  // Attach native streams for 1-to-1 WebRTC
  useEffect(() => {
    if (localVideoRef.current && localMediaStream) {
      localVideoRef.current.srcObject = localMediaStream;
    }
  }, [localMediaStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      if (remoteMediaStream && callDetails?.callType === 'video' && remoteVideoRef.current.srcObject !== remoteMediaStream) {
        remoteVideoRef.current.srcObject = remoteMediaStream;
      }
      remoteVideoRef.current.volume = remoteVolume;
    }
    if (remoteAudioRef.current) {
      if (remoteMediaStream && callDetails?.callType === 'audio' && remoteAudioRef.current.srcObject !== remoteMediaStream) {
        remoteAudioRef.current.srcObject = remoteMediaStream;
      }
      remoteAudioRef.current.volume = remoteVolume;
    }
  }, [remoteMediaStream, callDetails, remoteVolume]);

  useEffect(() => {
    let interval;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (callState !== 'connected' && callState !== 'connecting') return null;
  if (!callDetails) return null;

  // Active Call Bar (Minimized View)
  if (isCallMinimized) {
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#1a1a24]/90 backdrop-blur-md border border-white/10 rounded-full shadow-2xl z-[100] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">
              {callDetails.initiator?.name?.charAt(0) || '?'}
            </span>
          </div>
          <div className="flex flex-col min-w-0 pr-2">
            <h4 className="text-white font-medium text-sm truncate">{callDetails.initiator?.name || 'Unknown'}</h4>
            <div className="flex items-center gap-2 text-xs">
              <span className={callState === 'connected' ? 'text-green-400' : 'text-purple-400'}>
                {callState === 'connecting' ? 'Connecting...' : formatDuration(callDuration)}
              </span>
              {sessionStatus === 'playing' && (
                <span className="text-blue-400 font-medium whitespace-nowrap">• Shared Music</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={toggleMute}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          
          <button 
            onClick={() => setIsCallMinimized(false)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <Maximize2 size={18} />
          </button>

          <button 
            onClick={endCall}
            className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition"
          >
            <PhoneOff size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Group Call View via LiveKit (Full Screen)
  if (callDetails.isGroup && liveKitToken) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#050308] flex flex-col">
        <div className="flex-1 overflow-hidden relative">
           <LiveKitRoom
            video={callDetails.callType === 'video'}
            audio={true}
            token={liveKitToken}
            serverUrl={import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880'} // Ensure VITE_LIVEKIT_URL is set in frontend .env if doing production
            data-lk-theme="default"
            style={{ height: '100dvh' }}
            onDisconnected={endCall}
          >
            <VideoConference />
            <LiveKitVolumeController volume={remoteVolume} />
          </LiveKitRoom>
        </div>
        
        <div className="absolute top-4 left-4 z-[110]">
          <button onClick={() => setIsCallMinimized(true)} className="p-3 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition border border-white/10">
            <Minimize2 size={24} />
          </button>
        </div>

        {/* LiveKit Call Volume Control */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[110] w-full max-w-sm px-6">
           <div className="bg-[#110e15]/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-4 border border-white/10">
              <VolumeX size={16} className="text-gray-400" />
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={remoteVolume}
                onChange={(e) => setRemoteVolume(parseFloat(e.target.value))}
                className="flex-1 accent-purple-500 h-1.5 bg-gray-700/50 rounded-lg appearance-none cursor-pointer"
              />
              <Volume2 size={16} className="text-gray-300" />
           </div>
        </div>
      </div>
    );
  }

  // Native 1-to-1 Call View (Full Screen)
  return (
    <div className="fixed inset-0 z-[100] bg-[#050308] flex flex-col">
      <div className="absolute top-4 left-4 z-[110]">
        <button onClick={() => setIsCallMinimized(true)} className="p-3 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition border border-white/10">
          <Minimize2 size={24} />
        </button>
      </div>
      
      {sessionStatus === 'playing' && (
        <div className="absolute top-4 right-4 z-[110] bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-full border border-blue-500/30 text-sm font-medium flex items-center gap-2">
          <Volume2 size={16} /> Shared Music Active
        </div>
      )}

      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
        
        {/* Remote Video (or Audio placeholder) */}
        {callDetails.callType === 'video' ? (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center">
             <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.3)] mb-4 animate-pulse">
                <span className="text-white font-bold text-5xl">
                  {callDetails.initiator?.name?.charAt(0) || '?'}
                </span>
            </div>
            <h2 className="text-2xl font-bold text-white">{callState === 'connecting' ? 'Calling...' : 'Connected'}</h2>
            <p className="text-gray-400 mt-2">{formatDuration(callDuration)}</p>
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
          </div>
        )}

        {/* Local Video Picture-in-Picture */}
        {callDetails.callType === 'video' && localMediaStream && (
          <div className="absolute bottom-28 right-4 w-32 h-48 bg-black rounded-xl overflow-hidden shadow-xl border border-white/20 z-10">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-black flex items-center justify-center text-gray-500">
                <VideoOff size={24} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-28 bg-[#110e15] border-t border-white/5 flex flex-col px-6 pb-safe z-20">
        {/* Call Volume Control */}
        <div className="w-full max-w-sm mx-auto flex items-center gap-4 mt-2 mb-2">
          <VolumeX size={16} className="text-gray-500" />
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={remoteVolume}
            onChange={(e) => setRemoteVolume(parseFloat(e.target.value))}
            className="flex-1 accent-purple-500 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer"
          />
          <Volume2 size={16} className="text-gray-400" />
        </div>
        
        <div className="flex items-center justify-center gap-6 pb-2">
          <button 
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {callDetails.callType === 'video' && (
            <button 
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
            </button>
          )}

          <button 
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition hover:scale-105"
          >
            <PhoneOff size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
