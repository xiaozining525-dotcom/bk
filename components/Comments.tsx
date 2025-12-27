import React, { useEffect, useRef } from 'react';

interface CommentsProps {
  theme: 'light' | 'dark';
}

export const Comments: React.FC<CommentsProps> = ({ theme }) => {
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!commentsRef.current) return;

    // 清除旧的 script，防止重复加载
    commentsRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = "https://giscus.app/client.js";
    script.setAttribute("data-repo", "xiaozining525-dotcom/bk"); // TODO: 请替换为你自己的 GitHub 仓库信息
    script.setAttribute("data-repo-id", "R_kgDOQvKQHQ"); // TODO: 请替换为你的 Repo ID (在 giscus.app 官网获取)
    script.setAttribute("data-category", "Announcements");
    script.setAttribute("data-category-id", "DIC_kwDOQvKQHc4C0RkX"); // TODO: 替换 Category ID
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-theme", theme === 'dark' ? 'transparent_dark' : 'light');
    script.setAttribute("data-lang", "zh-CN");
    script.setAttribute("crossorigin", "anonymous");
    script.async = true;

    commentsRef.current.appendChild(script);
  }, [theme]); // 当主题切换时重新加载以适配颜色

  return (
    <div className="mt-12 w-full animate-fade-in">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            💬 评论区
        </h3>
        <div className="bg-glass backdrop-blur-md border border-glassBorder rounded-3xl p-4 md:p-8 min-h-[200px]">
             {/* 如果未配置，显示提示 */}
            <div ref={commentsRef} className="w-full" />
            <p className="text-xs text-center text-slate-400 mt-4">
                Powered by Giscus. 需要在代码中配置 GitHub 仓库信息才能正常使用。
            </p>
        </div>
    </div>
  );
};