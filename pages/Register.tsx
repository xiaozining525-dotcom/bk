import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { UserPlus, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: any;
  }
}

export const Register: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const navigate = useNavigate();

  // Initialize Turnstile
  useEffect(() => {
    let intervalId: any = null;

    const renderWidget = () => {
        if (window.turnstile && turnstileRef.current) {
            if (widgetId.current) {
                try { window.turnstile.remove(widgetId.current); } catch(e) {}
                widgetId.current = null;
            }

            try {
                turnstileRef.current.innerHTML = '';
                widgetId.current = window.turnstile.render(turnstileRef.current, {
                    sitekey: '0x4AAAAAACEt-vXK-qGjXdbv',
                    callback: (t: string) => {
                        setToken(t);
                        setError('');
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

    if (!renderWidget()) {
        intervalId = setInterval(() => {
            if (renderWidget()) clearInterval(intervalId);
        }, 100);
    }
    
    return () => {
        if (intervalId) clearInterval(intervalId);
        if (window.turnstile && widgetId.current) {
             try { window.turnstile.remove(widgetId.current); } catch(e) {}
        }
    };
  }, [retryCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
    }

    if (!token) {
        setError('请完成人机验证');
        return;
    }

    setLoading(true);
    
    try {
      await api.register(username, password, token);
      alert('初始化成功！请使用新密码登录。');
      navigate('/login');
    } catch (e: any) {
      setError(e.message || '注册失败');
      if (window.turnstile && widgetId.current) {
          window.turnstile.reset(widgetId.current);
          setToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-[70vh]">
      <div className="bg-glass backdrop-blur-xl border border-glassBorder p-10 rounded-3xl shadow-xl w-full max-w-sm relative overflow-hidden">
        {/* Decorative Badge */}
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <UserPlus size={120} />
        </div>

        <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-100/50 rounded-full text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
                <UserPlus size={32} />
            </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-2">博客初始化</h2>
        <p className="text-center text-xs text-slate-500 mb-8">设置首个管理员账号 (仅一次)</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
             <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名 (默认 admin)"
              className="w-full px-4 py-3 bg-white/40 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all dark:text-white"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="设置密码"
              className="w-full px-4 py-3 bg-white/40 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all dark:text-white"
            />
          </div>
          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认密码"
              className="w-full px-4 py-3 bg-white/40 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all dark:text-white"
            />
          </div>
          
          <div className="flex flex-col items-center justify-center min-h-[65px] gap-2">
            <div ref={turnstileRef} className="w-full flex justify-center"></div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center shadow-lg shadow-blue-600/20"
          >
            {loading ? '创建中...' : '完成初始化'}
          </button>
          
          {error && (
            <div className="text-red-500 text-xs text-center animate-bounce flex items-center justify-center gap-1 mt-2">
                <AlertTriangle size={12} /> {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};