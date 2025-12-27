import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // Import Portal
import { api } from '../services/api';
import { BlogPost, PostMetadata, UserProfile } from '../types';
import { CATEGORIES } from '../constants';
import { Save, Trash2, Plus, Edit3, UploadCloud, FileText, CheckCircle, Users, UserPlus, Shield, X, Lock, Check, Pin, PinOff } from 'lucide-react';

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'posts' | 'users'>('posts');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Posts State
  const [posts, setPosts] = useState<PostMetadata[]>([]);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Users State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', permissions: [] as string[] });
  
  // Editing User Permissions State
  const [editingUserPerms, setEditingUserPerms] = useState<{username: string, permissions: string[]} | null>(null);

  // Define available permissions logic for UI rendering
  const PERMISSION_CONFIG = [
      { 
          key: 'manage_contents', 
          label: '内容管理', 
          desc: '允许创建新文章、查看列表（不可编辑/删除）' 
      },
      { 
          key: 'manage_users', 
          label: '账号管理', 
          desc: '允许增加、删除子账号' 
      }
  ];

  const emptyPost: Partial<BlogPost> = {
    title: '',
    excerpt: '',
    content: '',
    category: '随笔',
    tags: [],
    url: '',
    id: '',
    status: 'draft',
    isPinned: false, // Default unpinned
    createdAt: Date.now()
  };

  useEffect(() => {
    const user = api.getCurrentUser();
    setCurrentUser(user);
    
    // Logic to determine initial tab based on permissions
    // If user has manage_users BUT NOT manage_contents (and not admin), default to 'users' tab
    if (user) {
        const isAdmin = user.role === 'admin';
        const hasContentPerm = user.permissions?.includes('all') || user.permissions?.includes('manage_contents');
        const hasUserPerm = user.permissions?.includes('all') || user.permissions?.includes('manage_users');

        if (!isAdmin && !hasContentPerm && hasUserPerm) {
            setActiveTab('users');
        } else {
            // Load posts if they have access to content tab
            loadPosts();
        }
    }
  }, []);

  const hasPermission = (perm: string) => {
      if (!currentUser) return false;
      // Safety checks for legacy data or incomplete session info
      if (currentUser.role === 'admin') return true;
      if (currentUser.permissions?.includes('all')) return true;
      return currentUser.permissions?.includes(perm);
  };

  const isAdmin = currentUser?.role === 'admin';

  const loadPosts = async () => {
    try {
      const data = await api.getPosts(1, 100);
      setPosts(data.list); 
    } catch (e) {
      console.error(e);
    }
  };

  const loadUsers = async () => {
      try {
          const list = await api.getUsers();
          setUsers(list);
      } catch (e) {
          console.error(e);
      }
  };

  // Switch tabs and load data if needed
  useEffect(() => {
      if (activeTab === 'users' && hasPermission('manage_users')) {
          loadUsers();
      }
  }, [activeTab]);

  // --- Post Handlers ---

  const handleSavePost = async (statusOverride?: 'published' | 'draft') => {
    if (!editingPost?.title || !editingPost?.content) return;
    
    try {
      setMessage('保存中...');
      const postToSave = {
        ...editingPost,
        id: editingPost.id || crypto.randomUUID(),
        createdAt: editingPost.createdAt || Date.now(),
        views: editingPost.views || 0,
        status: statusOverride || editingPost.status || 'draft',
      } as BlogPost;

      await api.createOrUpdatePost(postToSave);
      setMessage('保存成功！');
      setEditingPost(null);
      loadPosts();
      setTimeout(() => setMessage(''), 2000);
    } catch (e: any) {
      setMessage(e.message || '保存失败');
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('确定删除这篇文章吗？')) return;
    try {
      await api.deletePost(id);
      loadPosts();
    } catch (e: any) {
      alert(e.message || '删除失败');
    }
  };

  const handleTogglePin = async (post: PostMetadata) => {
      // Toggle the pin status
      const updatedPost: BlogPost = {
          ...post,
          content: '', // Content not needed for update but interface requires it. API handles metadata update.
          // Fetch the full post first to preserve content if we want to be safe, 
          // OR the backend API needs to support partial updates.
          // For simplicity and safety with current API:
      } as any;

      try {
          // We need the full post content to save it back because our API is a "save whole post" endpoint
          // Optimization: Create a specific endpoint for pinning or fetch full post first
          const fullPost = await api.getPost(post.id);
          await api.createOrUpdatePost({
              ...fullPost,
              isPinned: !post.isPinned
          });
          loadPosts(); // Reload list to see reordering
      } catch (e) {
          alert("操作失败");
      }
  };

  const handleEditPost = async (id: string) => {
    try {
        setMessage('加载中...');
        const post = await api.getPost(id);
        setEditingPost(post);
        setMessage('');
    } catch (e) {
        setMessage('加载详情失败');
    }
  };

  // --- User Handlers ---

  const handleAddUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newUser.username || !newUser.password) return;
      try {
          const perms = newUser.permissions; 
          await api.addUser(newUser.username, newUser.password, perms);
          setMessage('用户创建成功');
          setIsAddingUser(false);
          setNewUser({ username: '', password: '', permissions: [] });
          loadUsers();
          setTimeout(() => setMessage(''), 2000);
      } catch(e: any) {
          alert(e.message || '创建失败');
      }
  };

  const handleDeleteUser = async (username: string) => {
      if (!confirm(`确定删除用户 ${username} 吗?`)) return;
      try {
          await api.deleteUser(username);
          loadUsers();
      } catch (e) {
          alert('删除失败');
      }
  };

  const togglePermission = (perm: string) => {
      setNewUser(prev => {
          const exists = prev.permissions.includes(perm);
          if (exists) return { ...prev, permissions: prev.permissions.filter(p => p !== perm) };
          return { ...prev, permissions: [...prev.permissions, perm] };
      });
  };

  // --- Edit User Permissions Handlers ---
  
  const openEditUserModal = (user: UserProfile) => {
      setEditingUserPerms({
          username: user.username,
          permissions: [...user.permissions]
      });
  };

  const toggleEditPermission = (perm: string) => {
      if (!editingUserPerms) return;
      setEditingUserPerms(prev => {
          if (!prev) return null;
          const exists = prev.permissions.includes(perm);
          if (exists) return { ...prev, permissions: prev.permissions.filter(p => p !== perm) };
          return { ...prev, permissions: [...prev.permissions, perm] };
      });
  };

  const saveUserPermissions = async () => {
      if (!editingUserPerms) return;
      try {
          setMessage('更新权限中...');
          await api.updateUser(editingUserPerms.username, editingUserPerms.permissions);
          setMessage('权限更新成功');
          setEditingUserPerms(null);
          loadUsers();
          setTimeout(() => setMessage(''), 2000);
      } catch (e: any) {
          alert(e.message || '更新失败');
          setMessage('');
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
    // Explicit background colors for light/dark mode transparency
    <div className="bg-white/60 dark:bg-black/60 backdrop-blur-md border border-glassBorder rounded-3xl p-6 md:p-10 shadow-lg min-h-[80vh] relative">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">后台管理</h1>
            
            {/* Tab Navigation */}
            <div className="flex bg-slate-200/50 dark:bg-white/10 rounded-lg p-1">
                {/* Only show Posts tab if Admin or has Content Management perm */}
                {(isAdmin || hasPermission('manage_contents')) && (
                    <button 
                        onClick={() => setActiveTab('posts')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'posts' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                    >
                        文章管理
                    </button>
                )}
                {/* Only show Users tab if Admin or has User Management perm */}
                {(isAdmin || hasPermission('manage_users')) && (
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                    >
                        账号管理
                    </button>
                )}
            </div>
        </div>

        {activeTab === 'posts' && !editingPost && (
            // New Post Button: Admin OR Manage Contents
            (isAdmin || hasPermission('manage_contents')) && (
                <button 
                onClick={() => setEditingPost(emptyPost)}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition"
                >
                <Plus size={18} /> 新建文章
                </button>
            )
        )}
        
        {activeTab === 'users' && !isAddingUser && hasPermission('manage_users') && (
             <button 
             onClick={() => setIsAddingUser(true)}
             className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
             >
             <UserPlus size={18} /> 添加账号
             </button>
        )}
      </div>

      {message && <div className="mb-4 p-3 bg-blue-100/80 text-blue-800 rounded-lg text-sm text-center font-medium">{message}</div>}

      {/* --- POSTS VIEW --- */}
      {activeTab === 'posts' && (
        <>
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
                    <div className="flex gap-2">
                        <select
                        className="flex-1 p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-xl outline-none dark:text-white"
                        value={editingPost.category}
                        onChange={e => setEditingPost({...editingPost, category: e.target.value})}
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select
                        className={`w-32 p-3 border border-white/50 dark:border-white/10 rounded-xl outline-none dark:text-white ${editingPost.status === 'published' ? 'bg-green-100/50 dark:bg-green-900/30' : 'bg-orange-100/50 dark:bg-orange-900/30'}`}
                        value={editingPost.status || 'draft'}
                        onChange={e => setEditingPost({...editingPost, status: e.target.value as any})}
                        >
                            <option value="draft">草稿</option>
                            <option value="published">已发布</option>
                        </select>
                    </div>
                </div>
                
                {/* Pin Toggle in Editor */}
                <div className="flex items-center gap-3 p-3 bg-white/30 dark:bg-white/5 rounded-xl border border-white/30 dark:border-white/10">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={!!editingPost.isPinned}
                            onChange={e => setEditingPost({...editingPost, isPinned: e.target.checked})}
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            {editingPost.isPinned ? <Pin size={16} className="text-blue-500" /> : <PinOff size={16} />}
                            置顶文章
                        </span>
                    </label>
                    <span className="text-xs text-slate-500">（置顶文章将显示在首页最上方）</span>
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
                        onClick={() => handleSavePost('draft')} 
                        className="flex-1 bg-slate-500 text-white py-3 rounded-xl hover:bg-slate-600 transition flex justify-center items-center gap-2 font-medium"
                    >
                        <FileText size={18} /> 存为草稿
                    </button>
                    <button 
                        onClick={() => handleSavePost('published')} 
                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition flex justify-center items-center gap-2 font-medium"
                    >
                        <Save size={18} /> 发布上线
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
                        <th className="py-3 px-2">状态</th>
                        <th className="py-3 px-2">置顶</th>
                        <th className="py-3 px-2">标题</th>
                        <th className="py-3 px-2">分类</th>
                        <th className="py-3 px-2">发布时间</th>
                        <th className="py-3 px-2 text-right">操作</th>
                    </tr>
                    </thead>
                    <tbody>
                    {posts.map(post => (
                        <tr key={post.id} className="border-b border-slate-100/30 dark:border-white/5 hover:bg-white/30 dark:hover:bg-white/5 transition">
                        <td className="py-3 px-2">
                            {post.status === 'published' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-100/50 text-green-700 text-xs font-bold border border-green-200/50">
                                    <CheckCircle size={10} className="mr-1"/> 已发布
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-200/50 text-slate-600 text-xs font-bold border border-slate-300/50">
                                    <FileText size={10} className="mr-1"/> 草稿
                                </span>
                            )}
                        </td>
                        <td className="py-3 px-2">
                            {/* Pin Toggle Button */}
                            {isAdmin && (
                                <button 
                                    onClick={() => handleTogglePin(post)}
                                    className={`p-1.5 rounded-lg transition-colors ${post.isPinned ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                    title={post.isPinned ? "取消置顶" : "置顶文章"}
                                >
                                    {post.isPinned ? <Pin size={16} fill="currentColor" /> : <Pin size={16} />}
                                </button>
                            )}
                            {!isAdmin && post.isPinned && <Pin size={16} className="text-blue-500" fill="currentColor" />}
                        </td>
                        <td className="py-3 px-2 font-medium text-slate-800 dark:text-slate-200">
                            <div className="flex flex-col">
                                <span>{post.title}</span>
                                {post.url && <span className="text-[10px] text-blue-500 truncate max-w-[200px]">{post.url}</span>}
                            </div>
                        </td>
                        <td className="py-3 px-2 text-sm text-slate-600 dark:text-slate-400"><span className="bg-white/40 dark:bg-white/10 px-2 py-1 rounded">{post.category}</span></td>
                        <td className="py-3 px-2 text-sm text-slate-500 dark:text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-2 text-right flex justify-end gap-2">
                            {/* EDIT: Only Admin */}
                            {isAdmin && (
                                <button onClick={() => handleEditPost(post.id)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                                    <Edit3 size={16} />
                                </button>
                            )}
                            {/* DELETE: Only Admin */}
                            {isAdmin && (
                                <button onClick={() => handleDeletePost(post.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                    <Trash2 size={16} />
                                </button>
                            )}
                            {/* If not admin, show lock icon or nothing */}
                            {!isAdmin && (
                                <div className="p-2 text-slate-300 cursor-not-allowed">
                                    <Lock size={16} />
                                </div>
                            )}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
        </>
      )}

      {/* --- USERS VIEW --- */}
      {activeTab === 'users' && hasPermission('manage_users') && (
          <>
            {isAddingUser ? (
                <div className="max-w-md mx-auto bg-white/40 dark:bg-white/5 p-6 rounded-2xl border border-white/20 animate-fade-in">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><UserPlus size={20} /> 添加子账号</h3>
                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">用户名</label>
                            <input 
                                type="text" 
                                className="w-full p-2 rounded-lg bg-white/50 dark:bg-black/30 border border-white/30 outline-none"
                                value={newUser.username}
                                onChange={e => setNewUser({...newUser, username: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">密码</label>
                            <input 
                                type="password" 
                                className="w-full p-2 rounded-lg bg-white/50 dark:bg-black/30 border border-white/30 outline-none"
                                value={newUser.password}
                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="pt-2">
                            <label className="text-sm font-medium mb-2 block">权限分配</label>
                            <div className="space-y-2">
                                {PERMISSION_CONFIG.map(perm => {
                                    // Rule: Only Super Admin can see 'manage_users' option
                                    if (perm.key === 'manage_users' && !isAdmin) return null;
                                    
                                    // Rule: For other permissions, check if current user has them
                                    if (!isAdmin && !currentUser?.permissions.includes(perm.key)) return null;
                                    
                                    return (
                                        <label key={perm.key} className="flex items-center gap-2 p-3 rounded-lg border border-white/20 bg-white/30 dark:bg-black/20 cursor-pointer hover:bg-white/40">
                                            <input 
                                                type="checkbox" 
                                                checked={newUser.permissions.includes(perm.key)}
                                                onChange={() => togglePermission(perm.key)}
                                            />
                                            <div>
                                                <div className="font-bold text-sm">{perm.label}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{perm.desc}</div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <button type="button" onClick={() => setIsAddingUser(false)} className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg">取消</button>
                            <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg">创建</button>
                        </div>
                    </form>
                </div>
            ) : (
                <>
                {/* 1. Mobile Card View (Optimized for Crowding & Dark Mode) */}
                <div className="md:hidden space-y-2">
                    {users.map(u => (
                        <div key={u.username} className="bg-white/40 dark:bg-black/40 p-2.5 rounded-xl border border-white/20 dark:border-white/5 shadow-sm relative overflow-hidden backdrop-blur-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300 uppercase">
                                        {u.username.slice(0, 1)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-tight">{u.username}</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</div>
                                    </div>
                                </div>
                                {u.role === 'admin' ? (
                                    <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Admin</span>
                                ) : (
                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">Editor</span>
                                )}
                            </div>

                            <div className="mt-1.5 text-[10px] text-slate-600 dark:text-slate-300 bg-white/30 dark:bg-black/30 p-1.5 rounded-lg">
                                <span className="text-[10px] text-slate-500 block mb-0.5">权限:</span>
                                {u.role === 'admin' ? 'all' : u.permissions.join(', ') || '无'}
                            </div>

                            {u.role !== 'admin' && (
                                <div className="mt-2.5 flex gap-2">
                                    <button 
                                        onClick={() => openEditUserModal(u)}
                                        className="flex-1 py-1 text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg font-medium"
                                    >
                                        修改权限
                                    </button>
                                    {u.username !== currentUser?.username && (
                                        <button 
                                            onClick={() => handleDeleteUser(u.username)}
                                            className="flex-1 py-1 text-xs bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300 rounded-lg font-medium"
                                        >
                                            删除
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* 2. Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-500 dark:text-slate-400 text-sm border-b border-slate-200/50 dark:border-white/10">
                                <th className="py-3 px-2">角色</th>
                                <th className="py-3 px-2">用户名</th>
                                <th className="py-3 px-2">权限</th>
                                <th className="py-3 px-2">创建时间</th>
                                <th className="py-3 px-2 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.username} className="border-b border-slate-100/30 dark:border-white/5 hover:bg-white/30 dark:hover:bg-white/5">
                                    <td className="py-3 px-2">
                                        {u.role === 'admin' ? (
                                             <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">超级管理员</span>
                                        ) : (
                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">子账号</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-2 font-medium">{u.username}</td>
                                    <td className="py-3 px-2 text-xs text-slate-500">
                                        {u.role === 'admin' ? 'all' : u.permissions.join(', ') || '无'}
                                    </td>
                                    <td className="py-3 px-2 text-sm text-slate-500">
                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="py-3 px-2 text-right">
                                        {u.role !== 'admin' && (
                                            <div className="flex justify-end gap-2">
                                                 <button 
                                                    onClick={() => openEditUserModal(u)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                                    title="修改权限"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                
                                                {u.username !== currentUser?.username && (
                                                    <button 
                                                        onClick={() => handleDeleteUser(u.username)}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                        title="删除用户"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </>
            )}
          </>
      )}

      {/* --- Edit User Permissions Modal (Using Portal for better positioning) --- */}
      {editingUserPerms && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/20">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold dark:text-white">修改权限: {editingUserPerms.username}</h3>
                      <button onClick={() => setEditingUserPerms(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full dark:text-slate-400">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="space-y-3 mb-8">
                      {PERMISSION_CONFIG.map(perm => {
                            // Rule: Only Super Admin can see 'manage_users' option
                            if (perm.key === 'manage_users' && !isAdmin) return null;

                            // Rule: For other permissions, check if current user has them
                            if (!isAdmin && !currentUser?.permissions.includes(perm.key)) return null;

                            const isChecked = editingUserPerms.permissions.includes(perm.key);
                            return (
                                <label 
                                    key={perm.key}
                                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                                        isChecked
                                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                                        : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                        isChecked
                                        ? 'bg-blue-600 border-blue-600 text-white' 
                                        : 'bg-white border-slate-300'
                                    }`}>
                                        {isChecked && <Check size={12} />}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={isChecked}
                                        onChange={() => toggleEditPermission(perm.key)}
                                    />
                                    <div>
                                        <div className="font-bold text-sm dark:text-slate-200">{perm.label}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{perm.desc}</div>
                                    </div>
                                </label>
                            );
                      })}
                  </div>

                  <div className="flex gap-3">
                      <button 
                        onClick={() => setEditingUserPerms(null)} 
                        className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                      >
                          取消
                      </button>
                      <button 
                        onClick={saveUserPermissions} 
                        className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                      >
                          保存更改
                      </button>
                  </div>
              </div>
          </div>,
          document.body // Portal Target
      )}
    </div>
  );
};