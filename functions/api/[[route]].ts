/**
 * Cloudflare Pages Function
 * Features:
 * - KV backed storage
 * - Session-based Authentication (Secure)
 * - Rate Limiting (Brute-force protection)
 * - Edge Caching
 * - Turnstile Validation
 * - Pagination
 */

// Define Cloudflare Workers types
interface KVNamespace {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  get(key: string, type: "text"): Promise<string | null>;
  get<T = unknown>(key: string, type: "json"): Promise<T | null>;
  put(key: string, value: string | ReadableStream | ArrayBuffer, options?: { expiration?: number; expirationTtl?: number; metadata?: any }): Promise<void>;
  delete(key: string): Promise<void>;
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

type PagesFunction<Env = unknown, P extends string = string, Data = unknown> = (
  context: EventContext<Env, P, Data>
) => Response | Promise<Response>;

interface Env {
  BLOG_KV: KVNamespace;
  ADMIN_PASSWORD?: string;
  BACKGROUND_VIDEO_URL?: string;
  BACKGROUND_MUSIC_URL?: string;
  AVATAR_URL?: string;
  TURNSTILE_SECRET_KEY?: string; // Add this env var in Cloudflare Dashboard
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
const SESSION_PREFIX = 'session:';
const LIMIT_PREFIX = 'rate_limit:';

// Default fallback assets
const DEFAULT_VIDEO = "https://cdn.pixabay.com/video/2023/04/13/158656-817354676_large.mp4";
const DEFAULT_AVATAR = "https://picsum.photos/300/300";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', ''); 

  // --- 1. CORS Preflight ---
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // --- Helpers ---
  const jsonResponse = (data: any, status = 200, cacheTime = 0) => {
    const headers: Record<string, string> = {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    };
    if (request.method === 'GET' && cacheTime > 0) {
        headers['Cache-Control'] = `public, max-age=${cacheTime}, s-maxage=${cacheTime}`;
    }
    return new Response(JSON.stringify({ success: true, data }), { status, headers });
  };

  const errorResponse = (message: string, status = 400) => {
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  };

  const getIp = () => request.headers.get('CF-Connecting-IP') || 'unknown';

  const checkAuth = async (): Promise<boolean> => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');
    const valid = await env.BLOG_KV.get(`${SESSION_PREFIX}${token}`);
    return valid === 'valid';
  };

  const checkRateLimit = async (ip: string): Promise<boolean> => {
    const key = `${LIMIT_PREFIX}${ip}`;
    const count = await env.BLOG_KV.get(key);
    if (count && parseInt(count) > 5) {
      return false; 
    }
    return true;
  };

  const incrementRateLimit = async (ip: string) => {
    const key = `${LIMIT_PREFIX}${ip}`;
    const count = await env.BLOG_KV.get(key);
    const newCount = count ? parseInt(count) + 1 : 1;
    await env.BLOG_KV.put(key, newCount.toString(), { expirationTtl: 900 }); 
  };

  // --- Routes ---

  // 1. Config (Public)
  if (path === 'config') {
    return jsonResponse({
      videoUrl: env.BACKGROUND_VIDEO_URL || DEFAULT_VIDEO,
      musicUrl: env.BACKGROUND_MUSIC_URL || "",
      avatarUrl: env.AVATAR_URL || DEFAULT_AVATAR
    }, 200, 3600);
  }

  // 2. Auth Login with Turnstile
  if (path === 'auth' && request.method === 'POST') {
    const ip = getIp();
    if (!(await checkRateLimit(ip))) {
      return errorResponse('Too many login attempts. Please try again in 15 minutes.', 429);
    }

    const body: { password?: string; turnstileToken?: string } = await request.json();

    // Turnstile Validation
    if (env.TURNSTILE_SECRET_KEY && body.turnstileToken) {
      const formData = new FormData();
      formData.append('secret', env.TURNSTILE_SECRET_KEY);
      formData.append('response', body.turnstileToken);
      formData.append('remoteip', ip);

      try {
        const tsResult = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: formData,
        });
        const tsOutcome: any = await tsResult.json();
        if (!tsOutcome.success) {
           return errorResponse('Captcha validation failed', 400);
        }
      } catch (e) {
        console.error("Turnstile error", e);
      }
    } else if (env.TURNSTILE_SECRET_KEY && !body.turnstileToken) {
        return errorResponse('Captcha token missing', 400);
    }

    const validPass = env.ADMIN_PASSWORD || 'admin123';
    if (body.password === validPass) {
      const token = crypto.randomUUID();
      await env.BLOG_KV.put(`${SESSION_PREFIX}${token}`, 'valid', { expirationTtl: 86400 });
      await env.BLOG_KV.delete(`${LIMIT_PREFIX}${ip}`);
      return jsonResponse({ token });
    } else {
      await incrementRateLimit(ip);
      return errorResponse('Invalid password', 401);
    }
  }

  // 3. Posts Management
  if (path.startsWith('posts')) {
    
    // GET List (Paginated) or Single
    if (request.method === 'GET') {
      const id = url.searchParams.get('id');

      if (id) {
        // ... Single post logic (same as before) ...
        const postData = await env.BLOG_KV.get(`post:${id}`, 'json');
        if (!postData) return errorResponse('Post not found', 404);
        
        const metaList = (await env.BLOG_KV.get(METADATA_KEY, 'json') as PostMetadata[]) || [];
        const idx = metaList.findIndex(p => p.id === id);
        if (idx !== -1) {
             metaList[idx].views = (metaList[idx].views || 0) + 1;
             await env.BLOG_KV.put(METADATA_KEY, JSON.stringify(metaList));
             const fullPost: any = postData;
             fullPost.views = metaList[idx].views;
             await env.BLOG_KV.put(`post:${id}`, JSON.stringify(fullPost));
             return jsonResponse(fullPost, 200, 0); 
        }
        return jsonResponse(postData, 200, 60);
      } else {
        // PAGINATION LOGIC HERE
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        
        // Get full list (In a real DB, we would query with offset, for KV we fetch list and slice)
        // Note: For very large blogs, we'd need to shard the metadata list. 
        // For < 1000 posts, one JSON key is fine (max value size 25MB).
        let list = (await env.BLOG_KV.get(METADATA_KEY, 'json') as PostMetadata[]) || [];
        
        // Sort desc by date
        list.sort((a, b) => b.createdAt - a.createdAt);

        const total = list.length;
        const start = (page - 1) * limit;
        const end = start + limit;
        const pagedList = list.slice(start, end);

        // Cache first page longer, others shorter
        const cacheTime = page === 1 ? 60 : 30;

        return jsonResponse({
          list: pagedList,
          total,
          page,
          limit
        }, 200, cacheTime); 
      }
    }

    // POST (Protected)
    if (request.method === 'POST') {
      if (!(await checkAuth())) return errorResponse('Unauthorized', 401);
      
      const body: any = await request.json();
      if (!body.title) return errorResponse('Missing title');

      if (!body.id) body.id = crypto.randomUUID();
      if (!body.createdAt) body.createdAt = Date.now();

      await env.BLOG_KV.put(`post:${body.id}`, JSON.stringify(body));

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
        newMeta.views = list[metaIndex].views; 
        list[metaIndex] = newMeta;
      } else {
        list.unshift(newMeta); // Add to top
      }

      await env.BLOG_KV.put(METADATA_KEY, JSON.stringify(list));
      return jsonResponse({ id: body.id });
    }

    // DELETE (Protected)
    if (request.method === 'DELETE') {
      if (!(await checkAuth())) return errorResponse('Unauthorized', 401);
      
      const id = url.searchParams.get('id');
      if (!id) return errorResponse('Missing ID');

      await env.BLOG_KV.delete(`post:${id}`);

      let list = (await env.BLOG_KV.get(METADATA_KEY, 'json') as PostMetadata[]) || [];
      list = list.filter(p => p.id !== id);
      await env.BLOG_KV.put(METADATA_KEY, JSON.stringify(list));

      return jsonResponse({ deleted: true });
    }
  }

  return errorResponse('Not found', 404);
};