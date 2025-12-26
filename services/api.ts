import { ApiResponse, BlogPost, PostMetadata } from '../types';
import { API_BASE, ADMIN_TOKEN_KEY } from '../constants';

const getHeaders = () => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const api = {
  async getPosts(): Promise<PostMetadata[]> {
    const res = await fetch(`${API_BASE}/posts`);
    const json: ApiResponse<PostMetadata[]> = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data || [];
  },

  async getPost(id: string): Promise<BlogPost> {
    const res = await fetch(`${API_BASE}/posts?id=${id}`);
    const json: ApiResponse<BlogPost> = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data as BlogPost;
  },

  async createOrUpdatePost(post: BlogPost): Promise<void> {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(post),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
  },

  async deletePost(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/posts?id=${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
  },

  async login(password: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();
    if (json.success) {
      localStorage.setItem(ADMIN_TOKEN_KEY, password); // Simple storage for this demo
      return true;
    }
    return false;
  }
};