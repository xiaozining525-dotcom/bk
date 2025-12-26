import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PostMetadata } from '../types';
import { api } from '../services/api';
import { Clock, Tag, Eye, ChevronRight, AlertCircle } from 'lucide-react';

export const Home: React.FC = () => {
  const [posts, setPosts] = useState<PostMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search')?.toLowerCase() || '';
  const categoryFilter = searchParams.get('category');
  const tagFilter = searchParams.get('tag');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const data = await api.getPosts();
        setPosts(data.sort((a, b) => b.createdAt - a.createdAt));
      } catch (err) {
        console.error("Failed to fetch posts", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // Client-side filtering
  const filteredPosts = posts.filter(post => {
    const matchesSearch = !search || post.title.toLowerCase().includes(search) || post.excerpt.toLowerCase().includes(search);
    const matchesCategory = !categoryFilter || post.category === categoryFilter;
    const matchesTag = !tagFilter || post.tags.includes(tagFilter);
    return matchesSearch && matchesCategory && matchesTag;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filters Display */}
      {(search || categoryFilter || tagFilter) && (
        <div className="flex items-center gap-2 text-sm text-slate-700 bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl inline-flex border border-white/40">
          <span className="font-semibold">筛选:</span>
          {search && <span className="bg-blue-100/50 px-2 py-0.5 rounded">"{search}"</span>}
          {categoryFilter && <span className="bg-green-100/50 px-2 py-0.5 rounded">分类: {categoryFilter}</span>}
          {tagFilter && <span className="bg-purple-100/50 px-2 py-0.5 rounded">标签: {tagFilter}</span>}
          <Link to="/" className="ml-2 text-blue-600 hover:underline">清除</Link>
        </div>
      )}

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPosts.length > 0 ? (
          filteredPosts.map(post => (
            <Link 
              key={post.id} 
              to={`/post/${post.id}`}
              className="group block relative bg-glass backdrop-blur-md rounded-2xl p-6 border border-glassBorder hover:bg-white/70 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50/50 px-2 py-1 rounded-md">
                  {post.category}
                </span>
                <div className="flex items-center text-slate-400 text-xs gap-3">
                  <span className="flex items-center gap-1"><Clock size={12} /> {new Date(post.createdAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Eye size={12} /> {post.views}</span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-700 transition-colors line-clamp-2">
                {post.title}
              </h2>
              
              <p className="text-slate-600 text-sm mb-6 line-clamp-3 leading-relaxed">
                {post.excerpt}
              </p>

              <div className="flex justify-between items-center mt-auto">
                <div className="flex flex-wrap gap-2">
                  {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="flex items-center text-xs text-slate-500 bg-slate-100/50 px-2 py-1 rounded-full">
                      <Tag size={10} className="mr-1" /> {tag}
                    </span>
                  ))}
                </div>
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-white/40 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <ChevronRight size={16} />
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-glass rounded-3xl border border-glassBorder">
            <AlertCircle size={48} className="text-slate-300 mb-4" />
            <p className="text-lg text-slate-500">没有找到相关文章</p>
            <Link to="/" className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition">
              返回全部
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};