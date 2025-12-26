/**
 * Cloudflare Pages Function
 * Handles:
 * 1. GET /api/posts - List posts (summary)
 * 2. GET /api/posts?id=xyz - Get single post
 * 3. POST /api/posts - Create/Update post (Auth required)
 * 4. DELETE /api/posts?id=xyz - Delete post (Auth required)
 * 5. POST /api/auth - Login check
 * 6. GET /api/config - Get public site configuration (video/music/avatar urls)
 */

// --- Type Definitions for Cloudflare Environment ---
interface KVNamespace {
  get(key: string, options?: { type?: "text" | "json" | "arrayBuffer" | "stream"; cacheTtl?: number }): Promise<any>;
  get(key: string, type: "text"): Promise<string | null>;
  get(key: string, type: "json"): Promise<any | null>;
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  get(key: string, type: "stream"): Promise<ReadableStream | null>;
  put(key: string, value: string | ReadableStream | ArrayBuffer, options?: { expiration?: number; expirationTtl?: number; metadata?: any }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string; metadata?: any }[]; list_complete: boolean; cursor?: string }>;
}

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<any>) => void;
  passThroughOnException: () => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string | string[]>;
  data: Data;
}

type PagesFunction<Env = unknown, Params extends string = any, Data = unknown> = (
  context: EventContext<Env, Params, Data>
) => Response | Promise<Response>;

// --------------------------------------------------

interface Env {
  BLOG_KV: KVNamespace;
  ADMIN_PASSWORD?: string; // Set in Cloudflare Settings -> Environment Variables
  BACKGROUND_VIDEO_URL?: string; // Set in Cloudflare Settings
  BACKGROUND_MUSIC_URL?: string; // Set in Cloudflare Settings
  AVATAR_URL?: string; // Set in Cloudflare Settings (New)
}

interface PostMetadata {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
  createdAt: number;
  views: number;
  url?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const METADATA_KEY = 'metadata:posts';

// Default fallback assets
const DEFAULT_VIDEO = "https://cdn.pixabay.com/video/2023/04/13/158656-817354676_large.mp4";
const DEFAULT_AVATAR = "https://picsum.photos/300/300";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', ''); // route path relative to /api/

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // --- Helpers ---
  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify({ success: true, data }), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  };

  const errorResponse = (message: string, status = 400) => {
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  };

  const isAuthenticated = (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const validPass = env.ADMIN_PASSWORD || 'admin123'; 
    return token === validPass;
  };

  // --- Routes ---

  // 1. Config (Public) - Expose env vars
  if (path === 'config') {
    return jsonResponse({
      videoUrl: env.BACKGROUND_VIDEO_URL || DEFAULT_VIDEO,
      musicUrl: env.BACKGROUND_MUSIC_URL || "",
      avatarUrl: env.AVATAR_URL || DEFAULT_AVATAR
    });
  }

  // 2. Auth Check
  if (path === 'auth' && request.method === 'POST') {
    const body: { password?: string } = await request.json();
    const validPass = env.ADMIN_PASSWORD || 'admin123';
    if (body.password === validPass) {
      return jsonResponse({ token: body.password });
    }
    return errorResponse('Invalid password', 401);
  }

  // 3. Posts Management
  if (path.startsWith('posts')) {
    
    // GET List or Single
    if (request.method === 'GET') {
      const id = url.searchParams.get('id');

      if (id) {
        // Get Single Post Content
        const postData = await env.BLOG_KV.get(`post:${id}`, 'json');
        if (!postData) return errorResponse('Post not found', 404);
        
        // Increment view count
        const metaList = (await env.BLOG_KV.get(METADATA_KEY, 'json') as PostMetadata[]) || [];
        const idx = metaList.findIndex(p => p.id === id);
        if (idx !== -1) {
             metaList[idx].views = (metaList[idx].views || 0) + 1;
             await env.BLOG_KV.put(METADATA_KEY, JSON.stringify(metaList));
             
             const fullPost: any = postData;
             fullPost.views = metaList[idx].views;
             await env.BLOG_KV.put(`post:${id}`, JSON.stringify(fullPost));
             return jsonResponse(fullPost);
        }
        return jsonResponse(postData);

      } else {
        // List all posts
        const list = (await env.BLOG_KV.get(METADATA_KEY, 'json')) || [];
        return jsonResponse(list);
      }
    }

    // POST Create/Update
    if (request.method === 'POST') {
      if (!isAuthenticated(request)) return errorResponse('Unauthorized', 401);
      
      const body: any = await request.json();
      if (!body.id || !body.title) return errorResponse('Missing fields');

      // Save Full Content
      await env.BLOG_KV.put(`post:${body.id}`, JSON.stringify(body));

      // Update Metadata List
      let list = (await env.BLOG_KV.get(METADATA_KEY, 'json') as PostMetadata[]) || [];
      const metaIndex = list.findIndex(p => p.id === body.id);
      
      const newMeta: PostMetadata = {
        id: body.id,
        title: body.title,
        excerpt: body.excerpt || '',
        tags: body.tags || [],
        category: body.category || 'Uncategorized',
        createdAt: body.createdAt,
        views: body.views || 0,
        url: body.url || ''
      };

      if (metaIndex >= 0) {
        list[metaIndex] = newMeta;
      } else {
        list.push(newMeta);
      }

      await env.BLOG_KV.put(METADATA_KEY, JSON.stringify(list));
      return jsonResponse({ id: body.id });
    }

    // DELETE
    if (request.method === 'DELETE') {
      if (!isAuthenticated(request)) return errorResponse('Unauthorized', 401);
      
      const id = url.searchParams.get('id');
      if (!id) return errorResponse('Missing ID');

      // Delete Content
      await env.BLOG_KV.delete(`post:${id}`);

      // Update Metadata List
      let list = (await env.BLOG_KV.get(METADATA_KEY, 'json') as PostMetadata[]) || [];
      list = list.filter(p => p.id !== id);
      await env.BLOG_KV.put(METADATA_KEY, JSON.stringify(list));

      return jsonResponse({ deleted: true });
    }
  }

  return errorResponse('Not found', 404);
};