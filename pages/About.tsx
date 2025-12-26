import React from 'react';

export const About: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto bg-glass backdrop-blur-md border border-glassBorder rounded-3xl p-8 md:p-12 shadow-sm">
      <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/50 shadow-lg">
            <img src="https://picsum.photos/300/300" alt="Avatar" className="w-full h-full object-cover" />
        </div>
        <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">关于我</h1>
            <p className="text-slate-600">开发者 / 设计爱好者 / 极简主义者</p>
        </div>
      </div>
      
      <div className="prose prose-slate max-w-none text-slate-700">
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
            Email: <a href="mailto:example@email.com" className="text-blue-600 hover:underline">example@email.com</a>
        </p>
      </div>
    </div>
  );
};