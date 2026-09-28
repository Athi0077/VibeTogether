import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import api from '../services/api';

const CallContext = createContext();

export function CallProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [callState, setCallState] = useState('idle'); // idle, ringing, connecting, connected, declined, ended
  const [callDetails, setCallDetails] = useState(null);
  
  // Native WebRTC References (1-to-1 calls)
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  
  // Expose stream state to React
  const [localMediaStream, setLocalMediaStream] = useState(null);
  const [remoteMediaStream, setRemoteMediaStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Group Call specific (LiveKit)
  const [liveKitToken, setLiveKitToken] = useState(null);
  const [liveKitRoomName, setLiveKitRoomName] = useState(null);

  const cleanupCall = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalMediaStream(null);
    setRemoteMediaStream(null);
    setLiveKitToken(null);
    setLiveKitRoomName(null);
    setCallState('idle');
    setCallDetails(null);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('call:incoming', (data) => {
      if (callState !== 'idle') return; // Ignore if already in a call
      setCallDetails(data);
      setCallState('ringing');
    });

    socket.on('call:accepted', async (data) => {
      // If we are the initiator, set up peer connection
      if (callState === 'connecting' && callDetails?.isGroup === false) {
        setCallState('connected');
        await initPeerConnection(data.conversationId, true);
      }
    });

    socket.on('call:declined', () => {
      cleanupCall();
      alert('Call declined');
    });

    socket.on('call:ended', () => {
      cleanupCall();
    });

    // WebRTC Signaling
    socket.on('webrtc:offer', async (data) => {
      if (!peerConnection.current) await initPeerConnection(data.conversationId, false);
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit('webrtc:answer', { conversationId: data.conversationId, sdp: answer });
    });

    socket.on('webrtc:answer', async (data) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    });

    socket.on('webrtc:ice-candidate', async (data) => {
      if (peerConnection.current && data.candidate) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    return () => {
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:declined');
      socket.off('call:ended');
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
    };
  }, [socket, callState, callDetails, cleanupCall]);

  const initLocalStream = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      localStream.current = stream;
      setLocalMediaStream(stream);
      return stream;
    } catch (err) {
      console.error('Error accessing media devices', err);
      return null;
    }
  };

  const initPeerConnection = async (conversationId, isInitiator) => {
    // Basic setup, in production use TURN servers here
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    peerConnection.current = pc;

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current);
      });
    }

    pc.ontrack = (event) => {
      remoteStream.current = event.streams[0];
      setRemoteMediaStream(event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice-candidate', {
          conversationId,
          candidate: event.candidate
        });
      }
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { conversationId, sdp: offer });
    }
    
    return pc;
  };

  const initiateCall = async (conversationId, callType, isGroup = false) => {
    if (callState !== 'idle') return;
    
    setCallDetails({ conversationId, callType, initiator: user, isGroup });
    setCallState('connecting');

    if (isGroup) {
      // Group call logic: get token and switch to connected state directly
      try {
        const { data } = await api.get(`/calls/token/${conversationId}`);
        setLiveKitToken(data.token);
        setLiveKitRoomName(data.roomName);
        setCallState('connected');
        // Notify others
        socket.emit('call:initiate', { conversationId, callType, isGroup });
      } catch (e) {
        alert('Failed to init group call');
        cleanupCall();
      }
    } else {
      // 1-on-1 logic: wait for accept before getting userMedia to avoid aggressive prompt
      // Actually, we usually want media permission first so it doesn't fail later.
      const stream = await initLocalStream(callType);
      if (!stream) {
        cleanupCall();
        return;
      }
      socket.emit('call:initiate', { conversationId, callType, isGroup });
    }
  };

  const acceptCall = async () => {
    if (!callDetails) return;
    
    if (callDetails.isGroup) {
      // Join group call
      try {
        const { data } = await api.get(`/calls/token/${callDetails.conversationId}`);
        setLiveKitToken(data.token);
        setLiveKitRoomName(data.roomName);
        setCallState('connected');
      } catch (e) {
        cleanupCall();
      }
    } else {
      // 1-on-1 call
      const stream = await initLocalStream(callDetails.callType);
      if (!stream) {
        declineCall();
        return;
      }
      setCallState('connected');
      socket.emit('call:accept', { conversationId: callDetails.conversationId });
      // We will init peer connection when we receive the offer (which comes from initiator after they receive accept)
    }
  };

  const declineCall = () => {
    if (callDetails) {
      socket.emit('call:decline', { conversationId: callDetails.conversationId });
    }
    cleanupCall();
  };

  const endCall = () => {
    if (callDetails) {
      socket.emit('call:end', { 
        conversationId: callDetails.conversationId,
        callType: callDetails.callType,
        initiatorId: callDetails.initiator?._id
      });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <CallContext.Provider value={{
      callState,
      callDetails,
      localMediaStream,
      remoteMediaStream,
      isMuted,
      isVideoOff,
      liveKitToken,
      liveKitRoomName,
      initiateCall,
      acceptCall,
      declineCall,
      endCall,
      toggleMute,
      toggleVideo
    }}>
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);
