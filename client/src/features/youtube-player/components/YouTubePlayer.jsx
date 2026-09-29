import React, { useEffect, useRef } from 'react';

export default function YouTubePlayer({ videoId, onReady, onStateChange, playerRef }) {
  const containerRef = useRef(null);
  const ytPlayer = useRef(null);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (ytPlayer.current) return;
      ytPlayer.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: (e) => {
            if (playerRef) playerRef.current = e.target;
            if (onReady) onReady(e);
          },
          onStateChange: (e) => {
            if (onStateChange) onStateChange(e);
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (ytPlayer.current) {
        ytPlayer.current.destroy();
        ytPlayer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (ytPlayer.current && typeof ytPlayer.current.loadVideoById === 'function' && videoId) {
      const currentVideoId = ytPlayer.current.getVideoData?.().video_id;
      if (currentVideoId !== videoId) {
        ytPlayer.current.loadVideoById(videoId);
      }
    }
  }, [videoId]);

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative shadow-lg">
      <div ref={containerRef} className="w-full h-full border-none"></div>
    </div>
  );
}
