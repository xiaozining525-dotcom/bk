import React, { useRef, useEffect } from 'react';

interface BackgroundVideoProps {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  videoUrl: string;
  musicUrl: string;
  theme: 'light' | 'dark'; // 新增 theme 属性用于控制遮罩
}

export const BackgroundVideo: React.FC<BackgroundVideoProps> = ({ isMuted, setIsMuted, videoUrl, musicUrl, theme }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync mute state
  useEffect(() => {
    // Handle Video Muting
    if (videoRef.current) {
      videoRef.current.muted = musicUrl ? true : isMuted;
    }
    
    // Handle Audio Muting
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (!isMuted) {
          audioRef.current.play().catch(() => {});
      }
    }
  }, [isMuted, musicUrl]);

  // Handle Auto-play Logic
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (video) {
        video.load();
        video.play().catch(err => console.log("Video autoplay prevented", err));
    }

    if (audio && musicUrl) {
        audio.load();
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                const enableAudio = () => {
                    if (audioRef.current) audioRef.current.play();
                    document.removeEventListener('click', enableAudio);
                    document.removeEventListener('touchstart', enableAudio);
                    document.removeEventListener('keydown', enableAudio);
                };
                document.addEventListener('click', enableAudio);
                document.addEventListener('touchstart', enableAudio);
                document.addEventListener('keydown', enableAudio);
            });
        }
    }
  }, [videoUrl, musicUrl]);

  if (!videoUrl) return null;

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-50 bg-slate-200 dark:bg-slate-950">
        {/* Video Element */}
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
            智能遮罩层:
            - Light 模式: bg-white/10 (轻微提亮，保持清透)
            - Dark 模式: bg-black/60 (大幅压暗视频，确保白色文字清晰可读)
        */}
        <div className={`absolute inset-0 transition-colors duration-700 ease-in-out ${
            theme === 'dark' ? 'bg-black/60' : 'bg-white/0'
        }`}></div>
      </div>

      {/* Audio Element */}
      {musicUrl && (
        <audio ref={audioRef} src={musicUrl} autoPlay loop muted={isMuted} />
      )}
    </>
  );
};