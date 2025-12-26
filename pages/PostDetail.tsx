import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; // VS Code 深色主题
import { BlogPost } from '../types';
import { api } from '../services/api';
import { ArrowLeft, Calendar, Tag, User, Loader2, Link as LinkIcon, ExternalLink } from 'lucide-react';

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
    <article className="animate-fade-in pb-20">
        {/* Header Section */}
        <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors group">
                <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" /> 返回列表
            </Link>
            
            <div className="bg-glass backdrop-blur-md border border-glassBorder rounded-3xl p-8 mb-8 shadow-sm">
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wide">
                    <span className="bg-blue-100/60 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full font-bold">{post.category}</span>
                    <span className="flex items-center"><Calendar size={12} className="mr-1"/> {new Date(post.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center"><User size={12} className="mr-1"/> Admin</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-6">{post.title}</h1>
                
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                        {post.tags.map(tag => (
                            <span key={tag} className="flex items-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-white/10 px-2 py-1 rounded-md border border-white/40 dark:border-white/5">
                                <Tag size={10} className="mr-1" /> {tag}
                            </span>
                        ))}
                    </div>

                    {post.url && (
                        <a 
                          href={post.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg text-sm font-medium group"
                        >
                          <LinkIcon size={16} /> 访问链接 <ExternalLink size={14} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                    )}
                </div>
            </div>
        </div>

        {/* Content Section */}
        <div className="bg-glass backdrop-blur-md border border-glassBorder rounded-3xl p-8 md:p-12 shadow-sm min-h-[400px]">
            {/* 
              Tailwind Typography (prose) 样式配置：
              - prose-slate: 基础色系
              - dark:prose-invert: 适配暗黑模式
              - max-w-none: 移除默认的宽度限制，填满容器
              - prose-lg: 字体稍大，更易阅读
            */}
            <div className="prose prose-slate dark:prose-invert prose-lg max-w-none leading-loose marker:text-blue-500">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // 自定义代码块渲染
                        code({node, inline, className, children, ...props}: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                                <div className="relative group rounded-xl overflow-hidden my-6 shadow-lg border border-slate-200 dark:border-slate-800">
                                    <div className="absolute top-0 right-0 px-3 py-1 text-xs text-slate-400 bg-slate-800/50 rounded-bl-lg backdrop-blur-sm z-10">
                                      {match[1]}
                                    </div>
                                    <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={match[1]}
                                        PreTag="div"
                                        customStyle={{ margin: 0, borderRadius: 0, padding: '1.5rem', backgroundColor: '#1e1e1e' }}
                                        {...props}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                </div>
                            ) : (
                                <code className={`${className} px-1.5 py-0.5 rounded font-mono text-sm`} {...props}>
                                    {children}
                                </code>
                            )
                        },
                        // 自定义表格渲染 (通过 prose 插件已自动优化，这里可微调)
                        table: ({node, ...props}) => (
                            <div className="overflow-x-auto my-6 rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700" {...props} />
                            </div>
                        ),
                        // 优化图片显示
                        img: ({node, ...props}) => (
                           <img className="rounded-xl shadow-md mx-auto my-6 hover:scale-[1.01] transition-transform duration-300" {...props} alt={props.alt || ''} />
                        )
                    }}
                >
                    {post.content}
                </ReactMarkdown>
            </div>
        </div>
    </article>
  );
};