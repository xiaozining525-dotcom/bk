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
      // 如果取消静音，尝试播放
      if (!isMuted) {
          audioRef.current.play().catch(() => {
              // Ignore abort errors during rapid toggling
          });
      }
    }
  }, [isMuted, musicUrl]);

  // Handle Auto-play Logic
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    // 1. 视频自动播放逻辑
    if (video) {
        video.load();
        // 视频静音通常可以自动播放
        video.play().catch(err => {
            console.log("Video autoplay prevented", err);
        });
    }

    // 2. 音频自动播放逻辑 (核心修改)
    if (audio && musicUrl) {
        audio.load();
        
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Audio autoplay prevented by browser policy. Waiting for user interaction.");
                
                // 浏览器策略：如果这里报错，说明浏览器阻止了非静音自动播放。
                // 解决方案：添加一个一次性的全局点击事件，用户只要点击页面任何地方，就通过代码触发播放。
                const enableAudio = () => {
                    if (audioRef.current) {
                        audioRef.current.play();
                        // 如果因为策略导致当前是静音状态但 state 是 false，这里不需要操作，play() 即可
                    }
                    // 移除监听器，防止重复触发
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
    
    // Cleanup listeners on unmount (optional but good practice)
    return () => {
        // Note: removeEventListener functions must match exactly, but since we defined them inside, 
        // we can't easily remove them here without moving the function out. 
        // Given React effect lifecycle, this is generally safe for this specific "intro" use case.
    };
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
            已设置为 opacity-100 (完全不透明)，还原最清晰画质。
            object-cover 保证视频铺满屏幕。
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
            2. 视觉叠加层
            已移除 'backdrop-blur-[1px]' 和 'bg-white/...'，
            现在是完全透明的，没有任何滤镜遮挡视频。
            如果因为背景太花导致文字看不清，可以在这里加 'bg-black/20' (20%黑)
        */}
        <div className="absolute inset-0"></div>
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