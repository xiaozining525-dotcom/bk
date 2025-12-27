import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Lock, AlertTriangle } from 'lucide-react';

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

  // Initialize Cloudflare Turnstile with retry mechanism
  useEffect(() => {
    let intervalId: any = null;

    const renderWidget = () => {
        if (window.turnstile && turnstileRef.current && !widgetId.current) {
            try {
                // Clear any existing content to prevent duplicates
                turnstileRef.current.innerHTML = '';
                
                widgetId.current = window.turnstile.render(turnstileRef.current, {
                    sitekey: '0x4AAAAAAACET-vXK-qGjXdbv', // 您的真实 Site Key
                    callback: (t: string) => setToken(t),
                    'error-callback': (err: any) => {
                        console.error('Turnstile Error:', err);
                        // 400020 错误通常是域名不匹配或请求被拦截
                        setError('验证组件加载被拦截 (Error 400020)。请尝试关闭广告拦截器或隐私插件后刷新。');
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
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
            <div ref={turnstileRef} className="w-full flex justify-center"></div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? '验证中...' : '进入后台'}
          </button>
          {error && (
            <div className="text-red-500 text-xs text-center animate-bounce flex items-center justify-center gap-1">
              <AlertTriangle size={12} />
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};