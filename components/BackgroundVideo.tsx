import React, { useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface BackgroundVideoProps {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  videoUrl: string;
  musicUrl: string;
}

export const BackgroundVideo: React.FC<BackgroundVideoProps> = ({ isMuted, setIsMuted, videoUrl, musicUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync mute state
  useEffect(() => {
    // Handle Video Muting
    if (videoRef.current) {
      // 如果设置了独立的背景音乐，则强制静音视频轨道，避免声音冲突
      // 否则，视频轨道遵循全局静音状态
      videoRef.current.muted = musicUrl ? true : isMuted;
    }
    
    // Handle Audio Muting (if separate music exists)
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted, musicUrl]);

  // Attempt auto-play on mount or url change
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
        video.load(); // Reload if URL changed
        video.play().catch(err => {
            console.log("Video autoplay prevented by browser", err);
        });
    }

    const audio = audioRef.current;
    if (audio && musicUrl) {
        audio.load();
        audio.play().catch(err => {
            console.log("Audio autoplay prevented by browser", err);
        });
    }
  }, [videoUrl, musicUrl]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (!videoUrl) return null;

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-50 bg-slate-200">
        {/* 
            1. 视频本体 
            修改 'opacity-90' 来调整视频透明度 (opacity-100 为不透明, opacity-50 为半透明)
        */}
        <video
          ref={videoRef}
          className="absolute min-w-full min-h-full object-cover w-auto h-auto top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-100"
          playsInline
          autoPlay
          loop
          muted={musicUrl ? true : isMuted}
          poster="https://picsum.photos/1920/1080?blur=5"
          src={videoUrl}
        >
            Your browser does not support the video tag.
        </video>
        
        {/* 
            2. 视觉叠加层 (蒙版)
            修改 'bg-white/10' 来调整覆盖在视频上的白色浓度 (防止视频太花干扰文字)
            修改 'backdrop-blur-[1px]' 来调整背景模糊程度 (数值越大越模糊)
        */}
        <div className="absolute inset-0 backdrop-blur-[1px]"></div>
      </div>

      {/* Separate Audio Element */}
      {musicUrl && (
        <audio
          ref={audioRef}
          src={musicUrl}
          autoPlay
          loop
          muted={isMuted}
        />
      )}

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