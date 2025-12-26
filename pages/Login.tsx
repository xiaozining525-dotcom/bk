import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Lock } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    
    try {
      const success = await api.login(password);
      if (success) {
        onLoginSuccess();
        navigate('/admin');
      } else {
        setError(true);
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-[60vh]">
      <div className="bg-glass backdrop-blur-xl border border-glassBorder p-10 rounded-3xl shadow-xl w-full max-w-sm">
        <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/20 rounded-full text-slate-700">
                <Lock size={32} />
            </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-8">管理员登录</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-3 bg-white/40 border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-center tracking-widest transition-all"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? '验证中...' : '进入后台'}
          </button>
          {error && (
            <p className="text-red-500 text-sm text-center animate-bounce">
              密码错误，请重试
            </p>
          )}
        </form>
      </div>
    </div>
  );
};