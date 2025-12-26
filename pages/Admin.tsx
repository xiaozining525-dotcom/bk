import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BlogPost, PostMetadata } from '../types';
import { CATEGORIES } from '../constants';
import { Save, Trash2, Plus, Edit3, UploadCloud } from 'lucide-react';

export const Admin: React.FC = () => {
  const [posts, setPosts] = useState<PostMetadata[]>([]);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const emptyPost: Partial<BlogPost> = {
    title: '',
    excerpt: '',
    content: '',
    category: '随笔',
    tags: [],
    url: '',
    id: '',
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await api.getPosts();
      setPosts(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!editingPost?.title || !editingPost?.content) return;
    
    try {
      setMessage('保存中...');
      const postToSave = {
        ...editingPost,
        id: editingPost.id || crypto.randomUUID(),
        createdAt: editingPost.createdAt || Date.now(),
        views: editingPost.views || 0,
      } as BlogPost;

      await api.createOrUpdatePost(postToSave);
      setMessage('发布成功！');
      setEditingPost(null);
      loadPosts();
      setTimeout(() => setMessage(''), 2000);
    } catch (e) {
      setMessage('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这篇文章吗？')) return;
    try {
      await api.deletePost(id);
      loadPosts();
    } catch (e) {
      alert('删除失败');
    }
  };

  const handleEdit = async (id: string) => {
    try {
        setMessage('加载中...');
        const post = await api.getPost(id);
        setEditingPost(post);
        setMessage('');
    } catch (e) {
        setMessage('加载详情失败');
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Only verify extension simply
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (editingPost) {
            setEditingPost(prev => ({ ...prev, content: (prev?.content || '') + content }));
            setMessage('文件内容已追加');
            setTimeout(() => setMessage(''), 2000);
          }
        };
        reader.readAsText(file);
      } else {
        alert('请拖拽 .md 或 .txt 文件');
      }
    }
  };

  return (
    <div className="bg-glass backdrop-blur-md border border-glassBorder rounded-3xl p-6 md:p-10 shadow-lg min-h-[80vh]">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">博客管理</h1>
        <button 
          onClick={() => setEditingPost(emptyPost)}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition"
        >
          <Plus size={18} /> 新建文章
        </button>
      </div>

      {message && <div className="mb-4 p-3 bg-blue-100/80 text-blue-800 rounded-lg text-sm text-center font-medium">{message}</div>}

      {editingPost ? (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="文章标题"
              className="w-full p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-300 outline-none dark:text-white"
              value={editingPost.title}
              onChange={e => setEditingPost({...editingPost, title: e.target.value})}
            />
            <select
              className="w-full p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-xl outline-none dark:text-white"
              value={editingPost.category}
              onChange={e => setEditingPost({...editingPost, category: e.target.value})}
            >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <input
            type="text"
            placeholder="相关链接 (URL) - 可选"
            className="w-full p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-xl outline-none font-mono text-sm text-slate-600 dark:text-slate-300"
            value={editingPost.url || ''}
            onChange={e => setEditingPost({...editingPost, url: e.target.value})}
          />
          
          <input
            type="text"
            placeholder="摘要 (用于列表展示)"
            className="w-full p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-xl outline-none dark:text-white"
            value={editingPost.excerpt}
            onChange={e => setEditingPost({...editingPost, excerpt: e.target.value})}
          />
          
          <input
            type="text"
            placeholder="标签 (逗号分隔)"
            className="w-full p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-xl outline-none dark:text-white"
            value={editingPost.tags?.join(',')}
            onChange={e => setEditingPost({...editingPost, tags: e.target.value.split(',').map(t=>t.trim())})}
          />

          <div className="relative">
            <textarea
              placeholder="Markdown 正文内容... (支持拖拽 .md/.txt 文件上传)"
              className={`w-full h-96 p-4 bg-white/50 dark:bg-black/30 border rounded-xl outline-none font-mono text-sm transition-all dark:text-slate-200 ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-300' 
                  : 'border-white/50 dark:border-white/10'
              }`}
              value={editingPost.content}
              onChange={e => setEditingPost({...editingPost, content: e.target.value})}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
            {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-blue-500/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 backdrop-blur-sm shadow-lg">
                        <UploadCloud size={20} /> 释放以上传文件内容
                    </div>
                </div>
            )}
          </div>

          <div className="flex gap-4 pt-2">
            <button 
                onClick={handleSave} 
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition flex justify-center items-center gap-2 font-medium"
            >
                <Save size={18} /> 保存发布
            </button>
            <button 
                onClick={() => setEditingPost(null)} 
                className="px-6 py-3 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition"
            >
                取消
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400 text-sm border-b border-slate-200/50 dark:border-white/10">
                <th className="py-3 px-2">标题</th>
                <th className="py-3 px-2">分类</th>
                <th className="py-3 px-2">发布时间</th>
                <th className="py-3 px-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post.id} className="border-b border-slate-100/30 dark:border-white/5 hover:bg-white/30 dark:hover:bg-white/5 transition">
                  <td className="py-3 px-2 font-medium text-slate-800 dark:text-slate-200">
                    <div className="flex flex-col">
                        <span>{post.title}</span>
                        {post.url && <span className="text-[10px] text-blue-500 truncate max-w-[200px]">{post.url}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-sm text-slate-600 dark:text-slate-400"><span className="bg-white/40 dark:bg-white/10 px-2 py-1 rounded">{post.category}</span></td>
                  <td className="py-3 px-2 text-sm text-slate-500 dark:text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-2 text-right flex justify-end gap-2">
                    <button onClick={() => handleEdit(post.id)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                        <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDelete(post.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                        <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};