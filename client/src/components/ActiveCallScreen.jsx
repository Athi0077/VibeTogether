import { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useCall } from '../context/CallContext';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

export default function ActiveCallScreen() {
  const { 
    callState, callDetails, 
    localMediaStream, remoteMediaStream, 
    isMuted, isVideoOff, 
    liveKitToken, liveKitRoomName,
    toggleMute, toggleVideo, endCall 
  } = useCall();
  
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  // Attach native streams for 1-to-1 WebRTC
  useEffect(() => {
    if (localVideoRef.current && localMediaStream) {
      localVideoRef.current.srcObject = localMediaStream;
    }
  }, [localMediaStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteMediaStream) {
      remoteVideoRef.current.srcObject = remoteMediaStream;
    }
  }, [remoteMediaStream]);

  if (callState !== 'connected' && callState !== 'connecting') return null;
  if (!callDetails) return null;

  // Group Call View via LiveKit
  if (callDetails.isGroup && liveKitToken) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050308] flex flex-col">
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
          </LiveKitRoom>
        </div>
        
        <button 
            onClick={endCall}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition z-[100]"
          >
            <PhoneOff size={28} />
        </button>
      </div>
    );
  }

  // Native 1-to-1 Call View
  return (
    <div className="fixed inset-0 z-50 bg-[#050308] flex flex-col">
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
            <h2 className="text-2xl font-bold">{callState === 'connecting' ? 'Calling...' : 'Connected'}</h2>
            <p className="text-gray-400 mt-2">00:00</p>
          </div>
        )}

        {/* Local Video Picture-in-Picture */}
        {callDetails.callType === 'video' && localMediaStream && (
          <div className="absolute bottom-24 right-4 w-32 h-48 bg-black rounded-xl overflow-hidden shadow-xl border border-white/20 z-10">
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
      <div className="h-24 bg-black/50 backdrop-blur-md border-t border-white/5 flex items-center justify-center gap-6 pb-safe z-20">
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
  );
}
