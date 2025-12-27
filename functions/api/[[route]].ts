/**
 * Cloudflare Pages Function
 * Features:
 * - KV backed storage
 * - Session-based Authentication (Secure)
 * - PBKDF2 Password Hashing
 * - One-time Registration System
 * - Role Based Access Control (RBAC)
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
  BACKGROUND_VIDEO_URL?: string;
  BACKGROUND_MUSIC_URL?: string;
  AVATAR_URL?: string;
  TURNSTILE_SECRET_KEY?: string; 
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
  status?: 'published' | 'draft';
}

interface User {
    username: string;
    passwordHash: string;
    salt: string;
    createdAt: number;
    role: 'admin' | 'editor';
    permissions: string[];
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const METADATA_KEY = 'metadata:posts';
const USERS_KEY = 'sys:users';
const SESSION_PREFIX = 'session:';
const LIMIT_PREFIX = 'rate_limit:';

const DEFAULT_VIDEO = "https://cdn.pixabay.com/video/2023/04/13/158656-817354676_large.mp4";
const DEFAULT_AVATAR = "https://picsum.photos/300/300";

// --- Crypto Helpers ---

function buf2hex(buffer: ArrayBuffer) {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

function hex2buf(hexString: string) {
    return new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}

async function hashPassword(password: string, salt: Uint8Array | null = null) {
    const enc = new TextEncoder();
    if (!salt) {
        salt = crypto.getRandomValues(new Uint8Array(16));
    }
    const keyMaterial = await crypto.subtle.importKey(
        "raw", 
        enc.encode(password), 
        { name: "PBKDF2" }, 
        false, 
        ["deriveBits", "deriveKey"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        256
    );
    return {
        hash: buf2hex(derivedBits),
        salt: buf2hex(salt)
    };
}

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

  // Return the full user object if valid, else null
  const getAuthenticatedUser = async (): Promise<User | null> => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    const username = await env.BLOG_KV.get(`${SESSION_PREFIX}${token}`);
    
    if (!username) return null;
    
    const users = await env.BLOG_KV.get(USERS_KEY, 'json') as User[];
    if (!users) return null;

    if (username === 'valid') {
        // Fallback for legacy admin
        const found = users.find(u => u.role === 'admin' || !u.role);
        return found ? { ...found, role: 'admin', permissions: ['all'] } : null;
    }

    const found = users.find(u => u.username === username);
    if (found && !found.role) {
        // Legacy user without role => Admin
        return { ...found, role: 'admin', permissions: ['all'] };
    }
    return found || null;
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

  const verifyTurnstile = async (token: string, ip: string) => {
      if (!env.TURNSTILE_SECRET_KEY) return true; 
      if (!token) return false;

      const formData = new FormData();
      formData.append('secret', env.TURNSTILE_SECRET_KEY);
      formData.append('response', token);
      formData.append('remoteip', ip);

      try {
        const tsResult = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: formData,
        });
        const tsOutcome: any = await tsResult.json();
        return tsOutcome.success;
      } catch (e) {
        return false;
      }
  };

  // Check if user has specific permission
  const hasPermission = (user: User, perm: string) => {
      if (user.role === 'admin') return true;
      if (user.permissions?.includes('all')) return true;
      return user.permissions?.includes(perm);
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

  // 2. Setup Check
  if (path === 'setup-check') {
      const users = await env.BLOG_KV.get(USERS_KEY, 'json') as User[];
      return jsonResponse({ isSetup: !!(users && users.length > 0) });
  }

  // 3. Register (Only for first Admin)
  if (path === 'register' && request.method === 'POST') {
      const users = await env.BLOG_KV.get(USERS_KEY, 'json') as User[];
      if (users && users.length > 0) {
          return errorResponse("Setup already completed.", 403);
      }

      const body: any = await request.json();
      if (!body.username || !body.password) return errorResponse("Missing fields");

      const ip = getIp();
      if (!await verifyTurnstile(body.turnstileToken, ip)) {
          return errorResponse('Captcha validation failed', 400);
      }

      const { hash, salt } = await hashPassword(body.password);
      
      const newUser: User = {
          username: body.username,
          passwordHash: hash,
          salt: salt,
          createdAt: Date.now(),
          role: 'admin',
          permissions: ['all']
      };

      await env.BLOG_KV.put(USERS_KEY, JSON.stringify([newUser]));
      return jsonResponse({ message: "Registration successful" });
  }

  // 4. Auth Login
  if (path === 'auth' && request.method === 'POST') {
    const ip = getIp();
    if (!(await checkRateLimit(ip))) {
      return errorResponse('Too many login attempts. Please try again in 15 minutes.', 429);
    }

    const body: { username?: string; password?: string; turnstileToken?: string } = await request.json();

    if (!await verifyTurnstile(body.turnstileToken, ip)) {
        return errorResponse('Captcha validation failed', 400);
    }

    const users = await env.BLOG_KV.get(USERS_KEY, 'json') as User[];
    
    if (users && users.length > 0) {
        const targetUser = users.find(u => u.username === body.username);
        
        if (targetUser) {
             const inputHashObj = await hashPassword(body.password || '', hex2buf(targetUser.salt));
             if (inputHashObj.hash === targetUser.passwordHash) {
                 const token = crypto.randomUUID();
                 // Store username in session so we know who logged in
                 await env.BLOG_KV.put(`${SESSION_PREFIX}${token}`, targetUser.username, { expirationTtl: 86400 });
                 await env.BLOG_KV.delete(`${LIMIT_PREFIX}${ip}`);
                 
                 // Return user info (no sensitive data)
                 // FIX: Default to 'admin' if role is missing (legacy support)
                 return jsonResponse({ 
                     token,
                     user: {
                         username: targetUser.username,
                         role: targetUser.role || 'admin', 
                         permissions: targetUser.permissions || ['all']
                     }
                 });
             }
        }
    } 

    await incrementRateLimit(ip);
    return errorResponse('Invalid credentials', 401);
  }

  // 5. User Management
  if (path === 'users') {
      const currentUser = await getAuthenticatedUser();
      if (!currentUser) return errorResponse('Unauthorized', 401);

      if (!hasPermission(currentUser, 'manage_users')) {
          return errorResponse('Permission denied', 403);
      }

      const users = await env.BLOG_KV.get(USERS_KEY, 'json') as User[] || [];

      // GET Users List
      if (request.method === 'GET') {
          const safeUsers = users.map(u => ({
              username: u.username,
              role: u.role || 'admin',
              permissions: u.permissions || ['all'],
              createdAt: u.createdAt
          }));
          return jsonResponse(safeUsers);
      }

      // POST Create User
      if (request.method === 'POST') {
          const body: any = await request.json();
          if (!body.username || !body.password) return errorResponse("Missing fields");

          if (users.find(u => u.username === body.username)) {
              return errorResponse("Username exists", 400);
          }

          const { hash, salt } = await hashPassword(body.password);
          
          const newUser: User = {
              username: body.username,
              passwordHash: hash,
              salt: salt,
              createdAt: Date.now(),
              role: 'editor',
              permissions: body.permissions || [] 
          };

          users.push(newUser);
          await env.BLOG_KV.put(USERS_KEY, JSON.stringify(users));
          return jsonResponse({ success: true });
      }

      // DELETE User
      if (request.method === 'DELETE') {
          const targetUsername = url.searchParams.get('username');
          if (!targetUsername) return errorResponse("Missing username");
          if (targetUsername === currentUser.username) return errorResponse("Cannot delete yourself");

          const targetUser = users.find(u => u.username === targetUsername);
          const targetUserRole = targetUser?.role || 'admin'; 
          
          const adminCount = users.filter(u => (u.role || 'admin') === 'admin').length;

          if (targetUserRole === 'admin' && adminCount <= 1) {
             return errorResponse("Cannot delete the only admin");
          }

          const newUsers = users.filter(u => u.username !== targetUsername);
          await env.BLOG_KV.put(USERS_KEY, JSON.stringify(newUsers));
          return jsonResponse({ success: true });
      }
  }

  // 6. Posts Management
  if (path.startsWith('posts')) {
    const currentUser = await getAuthenticatedUser();
    // For GET operations (public), we don't strictly need a user, unless viewing drafts

    if (request.method === 'GET') {
      const id = url.searchParams.get('id');

      if (id) {
        const postData = await env.BLOG_KV.get(`post:${id}`, 'json');
        if (!postData) return errorResponse('Post not found', 404);
        
        const fullPost: any = postData;

        // Draft Protection
        if (fullPost.status === 'draft') {
            if (!currentUser) return errorResponse('Unauthorized: Draft', 403);
        }
        
        const metaList = (await env.BLOG_KV.get(METADATA_KEY, 'json') as PostMetadata[]) || [];
        const idx = metaList.findIndex(p => p.id === id);
        if (idx !== -1) {
             metaList[idx].views = (metaList[idx].views || 0) + 1;
             await env.BLOG_KV.put(METADATA_KEY, JSON.stringify(metaList));
             fullPost.views = metaList[idx].views;
             await env.BLOG_KV.put(`post:${id}`, JSON.stringify(fullPost));
             return jsonResponse(fullPost, 200, 0); 
        }
        return jsonResponse(postData, 200, 60);
      } else {
        // ... Pagination & Filtering ...
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const search = (url.searchParams.get('search') || '').toLowerCase();
        const category = url.searchParams.get('category');
        const tag = url.searchParams.get('tag');
        
        let list = (await env.BLOG_KV.get(METADATA_KEY, 'json') as PostMetadata[]) || [];
        
        if (!currentUser) {
            list = list.filter(p => p.status !== 'draft');
        }
        // ... filtering logic ...
        if (search) list = list.filter(p => p.title.toLowerCase().includes(search) || p.excerpt.toLowerCase().includes(search));
        if (category) list = list.filter(p => p.category === category);
        if (tag) list = list.filter(p => p.tags && p.tags.includes(tag));
        
        list.sort((a, b) => b.createdAt - a.createdAt);
        const total = list.length;
        const start = (page - 1) * limit;
        const end = start + limit;
        const pagedList = list.slice(start, end);

        const cacheTime = currentUser ? 0 : (page === 1 && !search && !category && !tag ? 60 : 30);
        return jsonResponse({ list: pagedList, total, page, limit }, 200, cacheTime); 
      }
    }

    // POST (Protected - Write)
    if (request.method === 'POST') {
      if (!currentUser) return errorResponse('Unauthorized', 401);
      
      const body: any = await request.json();
      if (!body.title) return errorResponse('Missing title');

      // Check if post exists to determine if it's CREATE or UPDATE
      // NOTE: Frontend usually sends a fresh UUID for new posts, so this check works.
      // If client sends an ID that exists in KV, it's an update.
      let existingPost = null;
      if (body.id) {
          existingPost = await env.BLOG_KV.get(`post:${body.id}`);
      }

      if (existingPost) {
          // UPDATE: STRICT ADMIN ONLY
          if (currentUser.role !== 'admin') {
              return errorResponse('Permission denied: Only Main Admin can edit existing articles.', 403);
          }
      } else {
          // CREATE: Admin OR manage_contents permission
          if (currentUser.role !== 'admin' && !hasPermission(currentUser, 'manage_contents')) {
              return errorResponse('Permission denied: You cannot create articles.', 403);
          }
          // Ensure ID is set for new post if not provided (though Admin.tsx provides it)
          if (!body.id) body.id = crypto.randomUUID();
      }

      if (!body.createdAt) body.createdAt = Date.now();
      if (!body.status) body.status = 'draft'; 

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
        url: body.url || '',
        status: body.status
      };

      if (metaIndex >= 0) {
        newMeta.views = list[metaIndex].views; 
        list[metaIndex] = newMeta;
      } else {
        list.unshift(newMeta); 
      }

      await env.BLOG_KV.put(METADATA_KEY, JSON.stringify(list));
      return jsonResponse({ id: body.id });
    }

    // DELETE (Protected - Write)
    if (request.method === 'DELETE') {
      if (!currentUser) return errorResponse('Unauthorized', 401);
      
      // DELETE: STRICT ADMIN ONLY
      if (currentUser.role !== 'admin') {
          return errorResponse('Permission denied: Only Main Admin can delete articles.', 403);
      }
      
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