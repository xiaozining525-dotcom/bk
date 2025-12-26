import React, { useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { PLACEHOLDER_BG_VIDEO } from '../constants';

interface BackgroundVideoProps {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

export const BackgroundVideo: React.FC<BackgroundVideoProps> = ({ isMuted, setIsMuted }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Attempt auto-play on mount
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
        video.play().catch(err => {
            console.log("Autoplay prevented by browser, waiting for interaction", err);
        });
    }
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-50 bg-slate-200">
        <video
          ref={videoRef}
          className="absolute min-w-full min-h-full object-cover w-auto h-auto top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-90"
          playsInline
          autoPlay
          loop
          muted={isMuted}
          poster="https://picsum.photos/1920/1080?blur=5" // Fallback image
        >
          {/* Use local file in production: src="/background.mp4" */}
          <source src={PLACEHOLDER_BG_VIDEO} type="video/mp4" />
        </video>
        {/* Overlay to ensure text contrast if video is too bright */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>
      </div>

      {/* Floating Audio Control */}
      <button
        onClick={toggleMute}
        className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-white/30 backdrop-blur-md border border-white/40 shadow-lg text-slate-800 hover:bg-white/50 transition-all duration-300 group"
        title={isMuted ? "开启声音" : "静音"}
      >
        {isMuted ? (
          <VolumeX size={20} className="group-hover:scale-110 transition-transform" />
        ) : (
          <Volume2 size={20} className="group-hover:scale-110 transition-transform" />
        )}
      </button>
    </>
  );
};