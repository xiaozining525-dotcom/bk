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
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export enum LoginStatus {
  IDLE,
  LOADING,
  SUCCESS,
  FAILED,
}