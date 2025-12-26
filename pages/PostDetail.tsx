import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { BlogPost } from '../types';
import { api } from '../services/api';
import { ArrowLeft, Calendar, Tag, User, Loader2 } from 'lucide-react';

export const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    const fetchPost = async () => {
      try {
        const data = await api.getPost(id);
        setPost(data);
      } catch (err) {
        setError('文章不存在或加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-slate-500" size={32} />
        </div>
    );
  }

  if (error || !post) {
    return (
      <div className="bg-glass p-12 rounded-3xl text-center border border-glassBorder backdrop-blur-md">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">404</h2>
        <p className="text-slate-600 mb-6">{error || '页面未找到'}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-slate-800 text-white rounded-full">返回首页</button>
      </div>
    );
  }

  return (
    <article className="animate-fade-in">
        {/* Header Section */}
        <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors group">
                <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" /> 返回列表
            </Link>
            
            <div className="bg-glass backdrop-blur-md border border-glassBorder rounded-3xl p-8 mb-8 shadow-sm">
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-4 uppercase tracking-wide">
                    <span className="bg-blue-100/60 text-blue-800 px-3 py-1 rounded-full font-bold">{post.category}</span>
                    <span className="flex items-center"><Calendar size={12} className="mr-1"/> {new Date(post.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center"><User size={12} className="mr-1"/> Admin</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">{post.title}</h1>
                <div className="flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                        <span key={tag} className="flex items-center text-xs text-slate-500 bg-white/50 px-2 py-1 rounded-md border border-white/40">
                            <Tag size={10} className="mr-1" /> {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>

        {/* Content Section */}
        <div className="bg-glass backdrop-blur-md border border-glassBorder rounded-3xl p-8 md:p-12 shadow-sm min-h-[400px]">
            <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-img:rounded-xl">
                <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
        </div>
    </article>
  );
};