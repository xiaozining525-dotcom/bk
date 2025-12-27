import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Lock } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

declare global {
  interface Window {
    turnstile?: any;
  }
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const navigate = useNavigate();

  // Initialize Cloudflare Turnstile
  useEffect(() => {
    if (window.turnstile && turnstileRef.current && !widgetId.current) {
        try {
            widgetId.current = window.turnstile.render(turnstileRef.current, {
                sitekey: '0x4AAAAAAA-GKwE4_y_5z5t2', // Replace with your SITE KEY from Cloudflare Dashboard (Use Test key or your real key)
                // Note: '0x4AAAAAAA-GKwE4_y_5z5t2' is a Cloudflare testing sitekey that always passes.
                // You must replace this with your real sitekey for production.
                callback: (t: string) => setToken(t),
                'error-callback': () => setError('验证失败，请刷新重试'),
            });
        } catch (e) {
            console.error("Turnstile render error", e);
        }
    }
    
    return () => {
        // Cleanup if needed (Turnstile usually handles this, but good practice to reset if unmounting)
        if (window.turnstile && widgetId.current) {
             window.turnstile.remove(widgetId.current);
             widgetId.current = null;
        }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check if script loaded
    if (!token && window.turnstile) {
        setError('请完成人机验证');
        return;
    }

    setLoading(true);
    
    try {
      const success = await api.login(password, token);
      if (success) {
        onLoginSuccess();
        navigate('/admin');
      } else {
        setError('密码错误或验证过期');
        if (window.turnstile && widgetId.current) {
            window.turnstile.reset(widgetId.current);
            setToken('');
        }
      }
    } catch (e: any) {
      setError(e.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-[60vh]">
      <div className="bg-glass backdrop-blur-xl border border-glassBorder p-10 rounded-3xl shadow-xl w-full max-w-sm">
        <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/20 rounded-full text-slate-700 dark:text-slate-200">
                <Lock size={32} />
            </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-8">管理员登录</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-3 bg-white/40 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-center tracking-widest transition-all dark:text-white"
              autoFocus
            />
          </div>
          
          {/* Turnstile Container */}
          <div className="flex justify-center min-h-[65px]">
            <div ref={turnstileRef} className="cf-turnstile"></div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? '验证中...' : '进入后台'}
          </button>
          {error && (
            <p className="text-red-500 text-sm text-center animate-bounce">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};