import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Search, PenTool, User, Home, BookOpen, LogOut } from 'lucide-react';
import { BackgroundVideo } from './BackgroundVideo';
import { ADMIN_TOKEN_KEY } from '../constants';

interface LayoutProps {
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  isAuthenticated: boolean;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ isMuted, setIsMuted, isAuthenticated, onLogout }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium ${
      isActive
        ? 'bg-white/40 text-slate-900 shadow-sm'
        : 'text-slate-600 hover:bg-white/20 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      <BackgroundVideo isMuted={isMuted} setIsMuted={setIsMuted} />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="backdrop-filter backdrop-blur-md bg-glass border border-glassBorder rounded-2xl shadow-sm px-6 py-3 flex items-center justify-between">
            
            {/* Logo / Brand */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 bg-slate-800 text-white rounded-lg flex items-center justify-center font-bold font-serif">
                B
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:block">MyBlog</span>
            </div>

            {/* Navigation Links (Desktop) */}
            <div className="hidden md:flex items-center gap-2">
              <NavLink to="/" className={navClass} end>
                <Home size={16} /> 首页
              </NavLink>
              <NavLink to="/about" className={navClass}>
                <User size={16} /> 关于我
              </NavLink>
              {isAuthenticated && (
                <NavLink to="/admin" className={navClass}>
                  <PenTool size={16} /> 管理
                </NavLink>
              )}
            </div>

            {/* Right Side: Search & Auth */}
            <div className="flex items-center gap-4">
              <form onSubmit={handleSearch} className="relative group">
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-32 focus:w-48 sm:w-48 transition-all duration-300 bg-white/30 border border-transparent focus:border-white/50 rounded-full py-1.5 pl-9 pr-3 text-sm outline-none placeholder-slate-500"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={14} />
              </form>
              
              {isAuthenticated ? (
                <button 
                  onClick={onLogout} 
                  className="p-2 rounded-full hover:bg-red-500/10 hover:text-red-600 transition-colors"
                  title="退出登录"
                >
                  <LogOut size={18} />
                </button>
              ) : (
                <button 
                  onClick={() => navigate('/login')}
                  className="hidden md:block text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  登录
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full z-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="z-10 py-6 text-center text-slate-600 text-sm">
        <div className="inline-block px-6 py-2 rounded-full backdrop-blur-sm bg-white/20 border border-white/10">
          &copy; {new Date().getFullYear()} My Personal Blog. Powered by Cloudflare Pages & KV.
        </div>
      </footer>
    </div>
  );
};