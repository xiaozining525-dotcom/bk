import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Search, PenTool, User, Home, LogOut, Menu, X, Sun, Moon, LayoutDashboard, Volume2, VolumeX, ArrowUp } from 'lucide-react';
import { BackgroundVideo } from './BackgroundVideo';
import { SiteConfig } from '../types';

interface LayoutProps {
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  isAuthenticated: boolean;
  onLogout: () => void;
  siteConfig: SiteConfig;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  isMuted, 
  setIsMuted, 
  isAuthenticated, 
  onLogout, 
  siteConfig,
  theme,
  toggleTheme
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  
  // 使用 ref 记录上一次的滚动位置，避免在 useEffect 依赖中引入不必要的状态更新
  const lastScrollY = useRef(0);

  // 监听滚动以控制“回到顶部”按钮和“导航栏”的显示
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 1. 控制回到顶部按钮
      if (currentScrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }

      // 2. 控制顶部导航栏 (下滑隐藏，上滑显示)
      // 只有当滚动超过一定距离(比如60px)才开始执行隐藏逻辑，避免顶部轻微晃动
      if (currentScrollY < lastScrollY.current || currentScrollY < 60) {
        // 向上滚动 或 在页面顶部 -> 显示
        setShowNavbar(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        // 向下滚动 且 超过阈值 -> 隐藏
        setShowNavbar(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
      setIsSidebarOpen(false); 
    }
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-base font-medium ${
      isActive
        ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/20 dark:bg-white dark:text-slate-900'
        : 'text-slate-600 dark:text-slate-200 hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
    }`;

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 dark:text-slate-100">
      {/* 传递 theme 属性以控制视频遮罩 */}
      <BackgroundVideo 
        isMuted={isMuted} 
        setIsMuted={setIsMuted} 
        videoUrl={siteConfig.videoUrl} 
        musicUrl={siteConfig.musicUrl} 
        theme={theme}
      />

      {/* Top Navbar */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out ${
            showNavbar ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="backdrop-filter backdrop-blur-md bg-glass border border-glassBorder rounded-2xl shadow-lg px-6 py-3 flex items-center justify-between">
            
            {/* Left Side: Sidebar Trigger + Logo */}
            <div 
                className="flex items-center gap-2 cursor-pointer group" 
                onClick={() => setIsSidebarOpen(true)}
                title="打开菜单"
            >
              <div className="w-8 h-8 bg-slate-800 dark:bg-white dark:text-slate-900 text-white rounded-lg flex items-center justify-center font-bold font-serif shadow-md group-hover:scale-105 transition-transform">
                <Menu size={16} />
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:block group-hover:opacity-80 transition-opacity drop-shadow-sm">MyBlog</span>
            </div>

            {/* Right Side: Search & Music Control */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Music Toggle (Moved to Top) */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-300"
                title={isMuted ? "开启背景音乐" : "静音"}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <form onSubmit={handleSearch} className="relative group">
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-32 focus:w-48 sm:w-64 transition-all duration-300 bg-white/30 dark:bg-black/30 border border-transparent focus:border-white/50 dark:focus:border-white/30 rounded-full py-1.5 pl-9 pr-3 text-sm outline-none placeholder-slate-500 dark:placeholder-slate-400 dark:text-white shadow-inner"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400" size={14} />
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeSidebar}
      />

      {/* Sidebar Panel */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 w-72 bg-glass dark:bg-slate-900/95 backdrop-blur-xl border-r border-glassBorder z-[51] p-6 flex flex-col shadow-2xl transition-transform duration-300 ease-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 dark:bg-white dark:text-slate-900 text-white rounded-xl flex items-center justify-center font-bold font-serif text-xl">
                    B
                </div>
                <span className="font-bold text-xl tracking-tight">MyBlog</span>
            </div>
            <button onClick={closeSidebar} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="flex-1 flex flex-col gap-2">
            <NavLink to="/" className={navLinkClass} onClick={closeSidebar} end>
                <Home size={20} /> 首页
            </NavLink>
            <NavLink to="/about" className={navLinkClass} onClick={closeSidebar}>
                <User size={20} /> 关于我
            </NavLink>
            
            {isAuthenticated && (
                <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-white/10">
                     <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-4">管理员</div>
                    <NavLink to="/admin" className={navLinkClass} onClick={closeSidebar}>
                        <LayoutDashboard size={20} /> 后台管理
                    </NavLink>
                </div>
            )}
        </div>

        <div className="mt-auto space-y-4">
             {/* Theme Toggle */}
             <button 
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-colors border border-white/20 dark:border-white/5"
            >
                <span className="text-sm font-medium flex items-center gap-2">
                    {theme === 'light' ? <Sun size={18} className="text-orange-500" /> : <Moon size={18} className="text-blue-400" />}
                    {theme === 'light' ? '浅色模式' : '深色模式'}
                </span>
            </button>

            {isAuthenticated ? (
                <button 
                  onClick={() => { onLogout(); closeSidebar(); }} 
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium text-sm"
                >
                  <LogOut size={20} /> 退出登录
                </button>
            ) : (
                <button 
                  onClick={() => { navigate('/login'); closeSidebar(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium text-sm"
                >
                  <PenTool size={20} /> 管理员登录
                </button>
            )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full z-10">
        <Outlet context={siteConfig} />
      </main>

      {/* Footer */}
      <footer className="z-10 py-6 text-center text-slate-600 dark:text-slate-400 text-sm">
        <div className="inline-block px-6 py-2 rounded-full backdrop-blur-sm bg-white/20 dark:bg-black/40 border border-white/10 shadow-sm">
          &copy; {new Date().getFullYear()} My Personal Blog. Powered by Cloudflare Pages & KV.
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-50 p-3 rounded-full bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-xl border border-white/10 transition-all duration-500 ease-in-out transform hover:scale-110 ${
            showScrollTop ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
        title="回到顶部"
      >
        <ArrowUp size={24} />
      </button>
    </div>
  );
};