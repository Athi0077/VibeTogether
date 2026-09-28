import { Phone, Video, PhoneOff } from 'lucide-react';
import { useCall } from '../context/CallContext';

export default function IncomingCallModal() {
  const { callState, callDetails, acceptCall, declineCall } = useCall();

  if (callState !== 'ringing' || !callDetails) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-glass-card w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col items-center p-8 text-center animate-bounce-slow">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(168,85,247,0.5)]">
          <span className="text-white font-bold text-3xl">
            {callDetails.initiator?.name?.charAt(0) || '?'}
          </span>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">{callDetails.initiator?.name}</h2>
        <p className="text-gray-400 mb-8">
          Incoming {callDetails.isGroup ? 'Group' : ''} {callDetails.callType === 'video' ? 'Video' : 'Audio'} Call...
        </p>
        
        <div className="flex gap-6">
          <button 
            onClick={declineCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition hover:scale-105"
          >
            <PhoneOff size={28} />
          </button>
          
          <button 
            onClick={acceptCall}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition hover:scale-105 animate-pulse"
          >
            {callDetails.callType === 'video' ? <Video size={28} /> : <Phone size={28} className="fill-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
