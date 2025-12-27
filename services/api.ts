import { ApiResponse, BlogPost, PostMetadata, SiteConfig, PaginatedResponse, SetupStatus, UserProfile } from '../types';
import { API_BASE, ADMIN_TOKEN_KEY, USER_INFO_KEY } from '../constants';

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

  async checkSetup(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/setup-check`);
      const json: ApiResponse<SetupStatus> = await res.json();
      // If success is true, data.isSetup tells us if users exist
      return json.success && json.data ? json.data.isSetup : true; 
    } catch (e) {
      return true; // Default to true (assume setup) on error to prevent exposing register page
    }
  },

  async register(username: string, password: string, turnstileToken?: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, turnstileToken }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return true;
  },

  // Updated to support Server-side Filtering
  async getPosts(page = 1, limit = 10, search = '', category = '', tag = ''): Promise<PaginatedResponse<PostMetadata>> {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        category,
        tag
    });

    // If admin is logged in, request drafts as well (backend checks auth header)
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const res = await fetch(`${API_BASE}/posts?${params.toString()}`, { headers });
    const json: ApiResponse<PaginatedResponse<PostMetadata>> = await res.json();
    
    if (!json.success) throw new Error(json.error);
    
    // Safety check if backend returns older array format during migration
    if (Array.isArray(json.data)) {
        return { list: json.data, total: json.data.length, page: 1, limit: json.data.length };
    }

    return json.data as PaginatedResponse<PostMetadata>;
  },

  async getPost(id: string): Promise<BlogPost> {
    const res = await fetch(`${API_BASE}/posts?id=${id}`, {
        headers: getHeaders() // Pass headers to allow viewing drafts if admin
    });
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

  async login(username: string, password: string, turnstileToken?: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, turnstileToken }),
    });
    const json = await res.json();
    if (json.success && json.data?.token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, json.data.token);
      if (json.data.user) {
          localStorage.setItem(USER_INFO_KEY, JSON.stringify(json.data.user));
      }
      return true;
    }
    return false;
  },

  // --- User Management ---

  async getUsers(): Promise<UserProfile[]> {
      const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
      const json: ApiResponse<UserProfile[]> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data || [];
  },

  async addUser(username: string, password: string, permissions: string[]): Promise<void> {
      const res = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ username, password, permissions })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
  },

  async updateUser(username: string, permissions: string[]): Promise<void> {
      const res = await fetch(`${API_BASE}/users`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ username, permissions })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
  },

  async deleteUser(username: string): Promise<void> {
      const res = await fetch(`${API_BASE}/users?username=${username}`, {
          method: 'DELETE',
          headers: getHeaders()
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
  },
  
  getCurrentUser(): UserProfile | null {
      const str = localStorage.getItem(USER_INFO_KEY);
      return str ? JSON.parse(str) : null;
  }
};