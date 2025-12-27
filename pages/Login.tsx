import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Lock, User, AlertTriangle, RefreshCw } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

declare global {
  interface Window {
    turnstile?: any;
  }
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState(''); // Changed: Removed default 'admin' value
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const navigate = useNavigate();

  // Initialize Cloudflare Turnstile with retry mechanism
  useEffect(() => {
    let intervalId: any = null;

    const renderWidget = () => {
        if (window.turnstile && turnstileRef.current) {
            // If widget already exists, remove it first
            if (widgetId.current) {
                try {
                    window.turnstile.remove(widgetId.current);
                } catch(e) {}
                widgetId.current = null;
            }

            try {
                // Clear any existing content
                turnstileRef.current.innerHTML = '';
                
                widgetId.current = window.turnstile.render(turnstileRef.current, {
                    sitekey: '0x4AAAAAACEt-vXK-qGjXdbv', // 您的真实 Site Key
                    callback: (t: string) => {
                        setToken(t);
                        setError(''); // Clear error on success
                    },
                    'error-callback': (err: any) => {
                        console.error('Turnstile Error:', err);
                        setError('验证组件加载失败 (Error 400020)。');
                    },
                    'expired-callback': () => {
                        setError('验证已过期，请重试');
                        setToken('');
                    },
                    theme: 'auto',
                });
                return true;
            } catch (e) {
                console.error("Turnstile render error", e);
                return false;
            }
        }
        return false;
    };

    // Attempt to render immediately
    if (!renderWidget()) {
        // If script hasn't loaded yet, poll for it
        intervalId = setInterval(() => {
            if (renderWidget()) {
                clearInterval(intervalId);
            }
        }, 100);
    }
    
    return () => {
        if (intervalId) clearInterval(intervalId);
        if (window.turnstile && widgetId.current) {
             try {
                 window.turnstile.remove(widgetId.current);
             } catch(e) {}
             widgetId.current = null;
        }
    };
  }, [retryCount]); // Re-run when retryCount changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
        setError('请先完成人机验证');
        return;
    }

    setLoading(true);
    
    try {
      const success = await api.login(username, password, token);
      if (success) {
        onLoginSuccess();
        navigate('/admin');
      } else {
        setError('用户名、密码错误或验证过期');
        // Reset widget on failure
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
    <div className="flex justify-center items-center h-[65vh]">
      <div className="bg-glass backdrop-blur-xl border border-glassBorder p-10 rounded-3xl shadow-xl w-full max-w-sm">
        <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/20 rounded-full text-slate-700 dark:text-slate-200">
                <Lock size={32} />
            </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-8">管理员登录</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
             <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名" 
              className="w-full pl-12 pr-4 py-3 bg-white/40 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all dark:text-white placeholder-slate-500"
              autoFocus
            />
          </div>
          <div className="relative">
             <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className="w-full pl-12 pr-4 py-3 bg-white/40 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 tracking-widest transition-all dark:text-white placeholder-slate-500"
            />
          </div>
          
          {/* Turnstile Container */}
          <div className="flex flex-col items-center justify-center min-h-[65px] gap-2">
            <div ref={turnstileRef} className="w-full flex justify-center"></div>
            {error.includes('400020') && (
                <button 
                    type="button" 
                    onClick={() => setRetryCount(c => c + 1)}
                    className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                    <RefreshCw size={12} /> 重新加载验证码
                </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? '验证中...' : '进入后台'}
          </button>
          {error && (
            <div className="text-red-500 text-xs text-center animate-bounce flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <AlertTriangle size={12} />
                <span>{error}</span>
              </div>
              {error.includes('400020') && (
                  <span className="text-[10px] opacity-75">请关闭广告拦截插件或检查 Cloudflare 域名配置</span>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};