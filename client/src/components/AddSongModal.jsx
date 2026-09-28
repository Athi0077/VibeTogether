import { useState, useRef } from 'react';
import { X, Upload, Music, Check } from 'lucide-react';
import api from '../services/api';
import axios from 'axios';

export default function AddSongModal({ isOpen, onClose, onAdd, conversationId = 'default' }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [songMeta, setSongMeta] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(''); // 'preparing', 'uploading', 'confirming', 'success', 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setIsProcessing(true);
    setUploadStatus('preparing');
    setErrorMsg('');

    // Read metadata via temporary audio element
    const url = URL.createObjectURL(file);
    const tempAudio = new Audio(url);
    
    tempAudio.addEventListener('loadedmetadata', () => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setSongMeta({
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        artist: 'Unknown Artist',
        duration: tempAudio.duration,
        size: `${sizeMB} MB`,
        url: url, // Local preview URL
        fileSize: file.size,
        contentType: file.type || 'audio/mpeg'
      });
      setIsProcessing(false);
      setUploadStatus('');
    });

    tempAudio.addEventListener('error', () => {
      setErrorMsg("Failed to load audio file for preview.");
      setIsProcessing(false);
      setSelectedFile(null);
    });
  };

  const handleConfirm = async () => {
    if (!songMeta || !selectedFile) return;
    
    try {
      setIsProcessing(true);
      setErrorMsg('');
      setUploadStatus('preparing');

      const isMpeg = selectedFile.name.toLowerCase().endsWith('.mpeg') || selectedFile.type === 'video/mpeg' || selectedFile.type === 'audio/mpeg' && selectedFile.name.toLowerCase().endsWith('.mpeg');
      let finalFile = selectedFile;
      let finalContentType = songMeta.contentType;
      let finalSize = songMeta.fileSize;
      let finalName = selectedFile.name;

      if (isMpeg) {
        setUploadStatus('uploading'); // Actually converting
        const formData = new FormData();
        formData.append('file', selectedFile);

        const res = await api.post('/songs/convert-only', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          responseType: 'blob' // get as binary blob
        });
        
        finalFile = new File([res.data], selectedFile.name.replace(/\.[^/.]+$/, "") + '.mp3', { type: 'audio/mpeg' });
        finalContentType = 'audio/mpeg';
        finalSize = finalFile.size;
        finalName = finalFile.name;
      }

      setUploadStatus('uploading');
      
      const uploadFormData = new FormData();
      uploadFormData.append('file', finalFile);
      uploadFormData.append('conversationId', conversationId);
      uploadFormData.append('title', songMeta.title);
      uploadFormData.append('artist', songMeta.artist);
      uploadFormData.append('duration', songMeta.duration);
      uploadFormData.append('originalFileName', finalName);
      uploadFormData.append('contentType', finalContentType);

      const confirmRes = await api.post('/songs/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setUploadStatus('success');
      
      // Pass the fully constructed song object back to parent
      const finalSong = {
        ...confirmRes.data,
        url: songMeta.url // keep local object url for immediate playback
      };
      
      onAdd(finalSong);
      
      // Close modal
      setTimeout(() => {
        handleCancel();
      }, 500);

    } catch (err) {
      console.error(err);
      setUploadStatus('error');
      setErrorMsg(err.response?.data?.message || err.message || 'Upload failed');
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (songMeta?.url) {
      URL.revokeObjectURL(songMeta.url);
    }
    setSelectedFile(null);
    setSongMeta(null);
    setUploadStatus('');
    setErrorMsg('');
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-glass-card w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-white/5">
          <h3 className="text-xl font-bold">Add Song</h3>
          <button onClick={handleCancel} disabled={isProcessing} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition disabled:opacity-50">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 md:p-6 flex-1 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 bg-red-500/10 text-red-400 p-3 rounded-xl text-sm text-center">
              {errorMsg}
            </div>
          )}

          {!selectedFile ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-600 hover:border-purple-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-white/5 hover:bg-white/10 transition group"
            >
              <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload size={32} />
              </div>
              <h4 className="font-medium text-lg mb-2">Select Audio File</h4>
              <p className="text-gray-400 text-sm">MP3, WAV, M4A, OGG, MPEG (Max 25MB)</p>
              <input 
                type="file" 
                accept="audio/*, video/mpeg, .mpeg" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
            </div>
          ) : isProcessing && uploadStatus === 'preparing' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400">Processing audio...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-black/30 p-4 rounded-2xl border border-white/5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                  <Music size={28} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate text-white">{songMeta?.title}</h4>
                  <p className="text-sm text-gray-400 truncate">{selectedFile.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="block text-xs text-gray-400 mb-1">File Size</span>
                  <span className="font-medium">{songMeta?.size}</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="block text-xs text-gray-400 mb-1">Duration</span>
                  <span className="font-medium">
                    {Math.floor(songMeta?.duration / 60)}:{Math.floor(songMeta?.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleCancel}
                  disabled={isProcessing && uploadStatus !== 'error'}
                  className="flex-1 py-3 px-4 rounded-xl font-medium border border-white/10 hover:bg-white/5 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 rounded-xl font-medium bg-purple-600 hover:bg-purple-500 transition shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> {uploadStatus === 'uploading' ? 'Uploading...' : 'Confirming...'}</>
                  ) : uploadStatus === 'success' ? (
                    <><Check size={18} /> Done!</>
                  ) : (
                    <><Upload size={18} /> Upload & Add</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
