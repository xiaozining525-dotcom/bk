import React, { useRef, useEffect } from 'react';
    import { Volume2, VolumeX } from 'lucide-react';
    import { BACKGROUND_VIDEO_URL, BACKGROUND_MUSIC_URL } from '../constants';
    
    interface BackgroundVideoProps {
      isMuted: boolean;
      setIsMuted: (muted: boolean) => void;
    }
    
    export const BackgroundVideo: React.FC<BackgroundVideoProps> = ({ isMuted, setIsMuted }) => {
      const videoRef = useRef<HTMLVideoElement>(null);
      const audioRef = useRef<HTMLAudioElement>(null);
    
      // Sync mute state
      useEffect(() => {
        // Handle Video Muting
        if (videoRef.current) {
          // 如果设置了独立的背景音乐，则强制静音视频轨道，避免声音冲突
          // 否则，视频轨道遵循全局静音状态
          videoRef.current.muted = BACKGROUND_MUSIC_URL ? true : isMuted;
        }
        
        // Handle Audio Muting (if separate music exists)
        if (audioRef.current) {
          audioRef.current.muted = isMuted;
        }
      }, [isMuted]);
    
      // Attempt auto-play on mount
      useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.play().catch(err => {
                console.log("Video autoplay prevented by browser", err);
            });
        }
    
        const audio = audioRef.current;
        if (audio && BACKGROUND_MUSIC_URL) {
            audio.play().catch(err => {
                console.log("Audio autoplay prevented by browser", err);
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
              muted={BACKGROUND_MUSIC_URL ? true : isMuted}
              poster="https://picsum.photos/1920/1080?blur=5" // Fallback image if video fails
              src={BACKGROUND_VIDEO_URL}
            >
                {/* Fallback text */}
                Your browser does not support the video tag.
            </video>
            {/* Overlay to ensure text contrast if video is too bright */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>
          </div>
    
          {/* Separate Audio Element (Only renders if URL is provided) */}
          {BACKGROUND_MUSIC_URL && (
            <audio
              ref={audioRef}
              src={BACKGROUND_MUSIC_URL}
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