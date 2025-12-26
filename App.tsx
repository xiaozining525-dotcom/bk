import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { PostDetail } from './pages/PostDetail';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { About } from './pages/About';
import { ADMIN_TOKEN_KEY } from './constants';
import { api } from './services/api';
import { SiteConfig } from './types';

const App: React.FC = () => {
  // 1. Theme Management
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialize Theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  // Apply Theme to HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // 2. Audio/Auth/Config State
  const [isMuted, setIsMuted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({ videoUrl: '', musicUrl: '', avatarUrl: '' });

  useEffect(() => {
    // Check local storage for basic session persistence
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    setIsAuthenticated(!!token);
    setIsLoadingAuth(false);

    // Fetch remote config (background video/music/avatar)
    const loadConfig = async () => {
        const config = await api.getConfig();
        setSiteConfig(config);
    };
    loadConfig();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setIsAuthenticated(false);
  };

  if (isLoadingAuth) return null;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={
          <Layout 
            isMuted={isMuted} 
            setIsMuted={setIsMuted} 
            isAuthenticated={isAuthenticated}
            onLogout={handleLogout}
            siteConfig={siteConfig}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        }>
          <Route index element={<Home />} />
          <Route path="post/:id" element={<PostDetail />} />
          <Route path="about" element={<About />} />
          <Route path="login" element={
            isAuthenticated ? <Navigate to="/admin" replace /> : <Login onLoginSuccess={() => setIsAuthenticated(true)} />
          } />
          
          {/* Protected Admin Route */}
          <Route path="admin" element={
            isAuthenticated ? <Admin /> : <Navigate to="/login" replace />
          } />
          
          {/* 404 Route */}
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center py-20 bg-glass rounded-3xl border border-glassBorder mx-auto max-w-md mt-10 text-center p-8">
              <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-2">404</h1>
              <p className="text-slate-600 dark:text-slate-300 mb-6">页面走丢了</p>
              <a href="#/" className="px-6 py-2 bg-slate-800 text-white rounded-full">返回首页</a>
            </div>
          } />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;