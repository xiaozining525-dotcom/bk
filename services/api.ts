import { ApiResponse, BlogPost, PostMetadata, SiteConfig, PaginatedResponse } from '../types';
import { API_BASE, ADMIN_TOKEN_KEY } from '../constants';

const getHeaders = () => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const api = {
  async getConfig(): Promise<SiteConfig> {
    try {
        const res = await fetch(`${API_BASE}/config`);
        const json: ApiResponse<SiteConfig> = await res.json();
        if (!json.success || !json.data) throw new Error(json.error || 'Failed to load config');
        return json.data;
    } catch (e) {
        console.error("Config load error, using defaults", e);
        return { 
            videoUrl: "https://cdn.pixabay.com/video/2023/04/13/158656-817354676_large.mp4", 
            musicUrl: "",
            avatarUrl: "https://picsum.photos/300/300"
        };
    }
  },

  // Updated to support Pagination
  async getPosts(page = 1, limit = 10): Promise<PaginatedResponse<PostMetadata>> {
    const res = await fetch(`${API_BASE}/posts?page=${page}&limit=${limit}`);
    const json: ApiResponse<PaginatedResponse<PostMetadata>> = await res.json();
    
    if (!json.success) throw new Error(json.error);
    
    // Safety check if backend returns older array format during migration
    if (Array.isArray(json.data)) {
        return { list: json.data, total: json.data.length, page: 1, limit: json.data.length };
    }

    return json.data as PaginatedResponse<PostMetadata>;
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

  async login(password: string, turnstileToken?: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, turnstileToken }),
    });
    const json = await res.json();
    if (json.success && json.data?.token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, json.data.token); 
      return true;
    }
    return false;
  }
};