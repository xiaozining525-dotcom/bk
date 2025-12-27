import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Helmet } from 'react-helmet-async';
import { BlogPost, PostMetadata, SiteConfig } from '../types';
import { api } from '../services/api';
import { ArrowLeft, Calendar, Tag, User, Loader2, Link as LinkIcon, ExternalLink, Clock, FileText, List, Share2, Sparkles, ArrowRight } from 'lucide-react';
import { Comments } from '../components/Comments';

// 辅助函数：计算阅读时间和字数
const calculateReadingStats = (content: string) => {
  const text = content.replace(/[#*`~\[\]\(\)]/g, '').trim(); // 简单去除 markdown 符号
  const wordCount = text.length;
  const readingTime = Math.ceil(wordCount / 400); // 假设平均阅读速度 400字/分钟
  return { wordCount, readingTime };
};

// 辅助函数：从 Markdown 提取标题生成目录
const extractHeadings = (content: string) => {
  const regex = /^(#{1,3})\s+(.+)$/gm;
  const headings = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2],
      id: match[2].toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '')
    });
  }
  return headings;
};

export const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // 获取 Layout 传递下来的 context (包含 theme)
  const context = useOutletContext<{ theme: 'light' | 'dark' }>(); 
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<PostMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ wordCount: 0, readingTime: 0 });
  const [headings, setHeadings] = useState<{level: number, text: string, id: string}[]>([]);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. 获取当前文章详情
        const data = await api.getPost(id);
        setPost(data);
        setStats(calculateReadingStats(data.content));
        setHeadings(extractHeadings(data.content));

        // 2. 获取所有文章以计算相关推荐
        // 为了计算相关性，我们获取最近的 50 篇文章（假设相关文章在近期）
        const allPostsData = await api.getPosts(1, 50);
        const allPosts = allPostsData.list;
        
        const related = allPosts
            .filter(p => p.id !== data.id) // 排除当前文章
            .map(p => {
                let score = 0;
                // 同分类 +3分
                if (p.category === data.category) score += 3;
                // 相同标签 +1分/个
                const sharedTags = p.tags.filter(t => data.tags.includes(t)).length;
                score += sharedTags;
                return { post: p, score };
            })
            .filter(item => item.score > 0) // 过滤掉完全不相关的
            .sort((a, b) => b.score - a.score || b.post.createdAt - a.post.createdAt) // 按分数排序，分数相同按时间
            .slice(0, 3) // 取前3个
            .map(item => item.post);

        setRelatedPosts(related);

      } catch (err) {
        setError('文章不存在或加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // 滚动到顶部
    window.scrollTo(0, 0);
  }, [id]);

  const handleShare = async () => {
    if (!post) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

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
        <Helmet><title>404 - 页面未找到</title></Helmet>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">404</h2>
        <p className="text-slate-600 mb-6">{error || '页面未找到'}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-slate-800 text-white rounded-full">返回首页</button>
      </div>
    );
  }

  return (
    <article className="animate-fade-in pb-20 relative">
        <Helmet>
            <title>{post.title} - My Blog</title>
            <meta name="description" content={post.excerpt || post.content.slice(0, 100)} />
        </Helmet>

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
                    {/* 新增阅读统计 */}
                    <span className="flex items-center" title="字数"><FileText size={12} className="mr-1"/> {stats.wordCount} 字</span>
                    <span className="flex items-center" title="预计阅读时间"><Clock size={12} className="mr-1"/> {stats.readingTime} 分钟</span>
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

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleShare}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/50 hover:bg-white/80 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all shadow-sm hover:shadow-md text-sm font-medium group relative"
                            title="分享文章"
                        >
                            <Share2 size={16} />
                            <span className="hidden sm:inline">分享</span>
                            
                            {showShareTooltip && (
                                <span className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap animate-fade-in pointer-events-none after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-800">
                                    链接已复制!
                                </span>
                            )}
                        </button>

                        {post.url && (
                            <a 
                              href={post.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg text-sm font-medium group"
                            >
                              <LinkIcon size={16} /> <span className="hidden sm:inline">访问链接</span> <ExternalLink size={14} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-9">
                <div className="bg-glass backdrop-blur-md border border-glassBorder rounded-3xl p-8 md:p-12 shadow-sm min-h-[400px]">
                    <div className="prose prose-slate dark:prose-invert prose-lg max-w-none leading-loose marker:text-blue-500">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                // 为标题添加 ID，用于锚点跳转
                                h1: ({node, ...props}) => <h1 id={String(props.children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '')} {...props} />,
                                h2: ({node, ...props}) => <h2 id={String(props.children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '')} {...props} />,
                                h3: ({node, ...props}) => <h3 id={String(props.children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '')} {...props} />,
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
                                table: ({node, ...props}) => (
                                    <div className="overflow-x-auto my-6 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700" {...props} />
                                    </div>
                                ),
                                img: ({node, ...props}) => (
                                   <img 
                                        className="rounded-xl shadow-md mx-auto my-6 hover:scale-[1.01] transition-transform duration-300" 
                                        loading="lazy"
                                        {...props} 
                                        alt={props.alt || ''} 
                                        referrerPolicy="no-referrer"
                                    />
                                )
                            }}
                        >
                            {post.content}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Related Posts Section */}
                {relatedPosts.length > 0 && (
                    <div className="mt-12 w-full animate-fade-in">
                         <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                            <Sparkles size={20} className="text-yellow-500" /> 相关推荐
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {relatedPosts.map(relPost => (
                                <Link 
                                    key={relPost.id} 
                                    to={`/post/${relPost.id}`}
                                    className="bg-glass backdrop-blur-md border border-glassBorder rounded-2xl p-5 hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 group flex flex-col h-full"
                                >
                                    <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
                                        {relPost.category}
                                    </div>
                                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                                        {relPost.title}
                                    </h4>
                                    <div className="mt-auto flex items-center justify-between text-xs text-slate-500">
                                        <span>{new Date(relPost.createdAt).toLocaleDateString()}</span>
                                        <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* 评论区 */}
                <Comments theme={context?.theme || 'light'} />
            </div>

            {/* Sidebar TOC (Desktop Only) */}
            <div className="hidden lg:block lg:col-span-3">
                <div className="sticky top-32 bg-glass backdrop-blur-md border border-glassBorder rounded-2xl p-6 shadow-sm max-h-[calc(100vh-10rem)] overflow-y-auto custom-scrollbar">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <List size={14} /> 目录
                    </h4>
                    {headings.length > 0 ? (
                        <ul className="space-y-3 text-sm">
                            {headings.map((heading, index) => (
                                <li key={index} style={{ paddingLeft: `${(heading.level - 1) * 0.75}rem` }}>
                                    <a 
                                        href={`#${heading.id}`} 
                                        className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors block leading-snug truncate"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                    >
                                        {heading.text}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-400 text-xs italic">暂无目录</p>
                    )}
                </div>
            </div>
        </div>
    </article>
  );
};