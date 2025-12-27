export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string; // Markdown
  tags: string[];
  category: string;
  createdAt: number;
  views: number;
  url?: string;
  status: 'published' | 'draft'; // Added status
}

export interface PostMetadata {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
  createdAt: number;
  views: number;
  url?: string;
  status: 'published' | 'draft'; // Added status
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SiteConfig {
  videoUrl: string;
  musicUrl: string;
  avatarUrl: string;
}

export enum LoginStatus {
  IDLE,
  LOADING,
  SUCCESS,
  FAILED,
}

// New interfaces for Auth
export interface User {
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

export interface SetupStatus {
  isSetup: boolean;
}