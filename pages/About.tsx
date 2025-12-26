import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { SiteConfig } from '../types';

export const About: React.FC = () => {
  const config = useOutletContext<SiteConfig>();
  
  // 默认头像
  const DEFAULT_AVATAR = "https://picsum.photos/300/300";
  // 备用头像 (如果默认头像也挂了)
  const FALLBACK_AVATAR = "https://ui-avatars.com/api/?name=Me&background=random&size=300";

  const [avatarSrc, setAvatarSrc] = useState<string>(DEFAULT_AVATAR);

  // 当 config 加载完成后更新头像
  useEffect(() => {
    if (config?.avatarUrl) {
      setAvatarSrc(config.avatarUrl);
    }
  }, [config]);

  const handleImageError = () => {
    // 如果当前加载失败的已经是 fallback 头像，则不再重试，防止死循环
    if (avatarSrc === FALLBACK_AVATAR) return;
    
    // 如果配置的图片加载失败，尝试使用 fallback
    console.warn("Avatar load failed, switching to fallback.");
    setAvatarSrc(FALLBACK_AVATAR);
  };

  return (
    <div className="max-w-3xl mx-auto bg-glass backdrop-blur-md border border-glassBorder rounded-3xl p-8 md:p-12 shadow-sm animate-fade-in">
      <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/50 shadow-lg flex-shrink-0 bg-slate-200">
            <img 
              src={avatarSrc} 
              alt="Avatar" 
              className="w-full h-full object-cover" 
              onError={handleImageError}
              referrerPolicy="no-referrer"
            />
        </div>
        <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">关于我(忆柠)</h1>
            <p className="text-slate-600 dark:text-slate-300">开发者 / 设计爱好者 / 极简主义者</p>
        </div>
      </div>
      
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p>
          你好，欢迎来到我的个人博客。这是一个基于 Cloudflare 免费生态构建的现代化站点。
        </p>
        <p>
          我热衷于探索前沿 Web 技术，追求极致的 UI/UX 体验。在这个博客中，我将分享关于技术开发、
          设计灵感以及生活随想的内容。
        </p>
        <h3>技术栈</h3>
        <ul>
            <li>Frontend: React, Tailwind CSS</li>
            <li>Backend: Cloudflare Pages Functions</li>
            <li>Database: Cloudflare KV</li>
        </ul>
        <h3>联系方式</h3>
        <p>
            Email: <a href="mailto:qqdzz789@gmail.com" className="text-blue-600 hover:underline dark:text-blue-400">qqdzz789@gmail.com</a>
        </p>
      </div>
    </div>
  );
};
