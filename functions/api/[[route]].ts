/**
 * Cloudflare Pages Function with D1 (SQL)
 * 
 * Storage Strategy:
 * - Content (Posts, Users): Stored in D1 SQL Database for complex querying and pagination.
 * - Ephemeral (Sessions, Rate Limits): Stored in KV for automatic TTL expiration.
 */

interface KVNamespace {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string | ReadableStream | ArrayBuffer, options?: { expiration?: number; expirationTtl?: number; metadata?: any }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  error?: string;
  meta: any;
}

interface D1ExecResult {
  count: number;
  duration: number;
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
  BLOG_KV: KVNamespace; // Keep KV for Sessions & Rate Limiting (TTL support)
  DB: D1Database;       // New: D1 for Content & Users
  BACKGROUND_VIDEO_URL?: string;
  BACKGROUND_MUSIC_URL?: string;
  AVATAR_URL?: string;
  TURNSTILE_SECRET_KEY?: string; 
}

// Database Interfaces
interface DBPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string; // Stored as JSON string
  category: string;
  createdAt: number;
  views: number;
  url: string;
  status: 'published' | 'draft';
}

interface DBUser {
    username: string;
    passwordHash: string;
    salt: string;
    createdAt: number;
    role: 'admin' | 'editor';
    permissions: string; // Stored as JSON string
}

// API Response Interfaces
interface PostMetadata {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
  createdAt: number;
  views: number;
  url?: string;
  status: 'published' | 'draft';
}

interface User {
    username: string;
    role: 'admin' | 'editor';
    permissions: string[];
    createdAt?: number;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
  const getAuthenticatedUser = async (): Promise<User & {role: string} | null> => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    
    // Check KV for session validity
    const username = await env.BLOG_KV.get(`${SESSION_PREFIX}${token}`);
    if (!username) return null;
    
    // Fetch User details from D1
    const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<DBUser>();
    
    if (!user) return null;

    return {
        username: user.username,
        role: user.role || 'admin',
        permissions: JSON.parse(user.permissions || '[]'),
        createdAt: user.createdAt
    };
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
      const countResult = await env.DB.prepare('SELECT count(*) as count FROM users').first<{count: number}>();
      const isSetup = countResult ? countResult.count > 0 : false;
      return jsonResponse({ isSetup });
  }

  // 3. Register (Only for first Admin)
  if (path === 'register' && request.method === 'POST') {
      const countResult = await env.DB.prepare('SELECT count(*) as count FROM users').first<{count: number}>();
      if (countResult && countResult.count > 0) {
          return errorResponse("Setup already completed.", 403);
      }

      const body: any = await request.json();
      if (!body.username || !body.password) return errorResponse("Missing fields");

      const ip = getIp();
      if (!await verifyTurnstile(body.turnstileToken, ip)) {
          return errorResponse('Captcha validation failed', 400);
      }

      const { hash, salt } = await hashPassword(body.password);
      
      await env.DB.prepare(
          'INSERT INTO users (username, passwordHash, salt, createdAt, role, permissions) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
          body.username, 
          hash, 
          salt, 
          Date.now(), 
          'admin', 
          JSON.stringify(['all'])
      ).run();

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

    const targetUser = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(body.username).first<DBUser>();
    
    if (targetUser) {
        const inputHashObj = await hashPassword(body.password || '', hex2buf(targetUser.salt));
        if (inputHashObj.hash === targetUser.passwordHash) {
            const token = crypto.randomUUID();
            // Store session in KV with TTL
            await env.BLOG_KV.put(`${SESSION_PREFIX}${token}`, targetUser.username, { expirationTtl: 86400 });
            await env.BLOG_KV.delete(`${LIMIT_PREFIX}${ip}`);
            
            return jsonResponse({ 
                token,
                user: {
                    username: targetUser.username,
                    role: targetUser.role || 'admin', 
                    permissions: JSON.parse(targetUser.permissions || '[]')
                }
            });
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

      // GET Users List
      if (request.method === 'GET') {
          const results = await env.DB.prepare('SELECT username, role, permissions, createdAt FROM users').all<DBUser>();
          const safeUsers = results.results.map(u => ({
              username: u.username,
              role: u.role || 'admin',
              permissions: JSON.parse(u.permissions || '[]'),
              createdAt: u.createdAt
          }));
          return jsonResponse(safeUsers);
      }

      // POST Create User
      if (request.method === 'POST') {
          const body: any = await request.json();
          if (!body.username || !body.password) return errorResponse("Missing fields");

          const requestedPerms: string[] = body.permissions || [];

          // Security Check: Sub-admins cannot grant 'all' or permissions they don't have
          if (currentUser.role !== 'admin') {
              if (requestedPerms.includes('all')) return errorResponse("Permission denied: Cannot grant admin privileges", 403);
              
              const userPerms = currentUser.permissions || [];
              const hasAllRequested = requestedPerms.every(p => userPerms.includes(p));
              
              if (!hasAllRequested) {
                  return errorResponse("Permission denied: Cannot grant permissions you do not possess", 403);
              }
          }

          try {
            const { hash, salt } = await hashPassword(body.password);
            
            await env.DB.prepare(
                'INSERT INTO users (username, passwordHash, salt, createdAt, role, permissions) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(
                body.username,
                hash,
                salt,
                Date.now(),
                'editor',
                JSON.stringify(requestedPerms)
            ).run();
            
            return jsonResponse({ success: true });
          } catch (e: any) {
             if (e.message && e.message.includes('UNIQUE')) {
                 return errorResponse("Username exists", 400);
             }
             return errorResponse("Creation failed", 500);
          }
      }

      // PATCH Update User Permissions
      if (request.method === 'PATCH') {
          const body: any = await request.json();
          if (!body.username || !Array.isArray(body.permissions)) {
              return errorResponse("Missing username or invalid permissions");
          }

          const targetUser = await env.DB.prepare('SELECT role FROM users WHERE username = ?').bind(body.username).first<{role: string}>();
          if (!targetUser) return errorResponse("User not found", 404);

          // Rule: Editors cannot modify Admins
          if (currentUser.role !== 'admin' && targetUser.role === 'admin') {
               return errorResponse("Permission denied: You cannot modify a Super Admin.", 403);
          }

          // Security Check: Sub-admins cannot grant 'all' or permissions they don't have
          const requestedPerms: string[] = body.permissions;
          if (currentUser.role !== 'admin') {
              if (requestedPerms.includes('all')) return errorResponse("Permission denied: Cannot grant admin privileges", 403);

              const userPerms = currentUser.permissions || [];
              const hasAllRequested = requestedPerms.every(p => userPerms.includes(p));

              if (!hasAllRequested) {
                  return errorResponse("Permission denied: Cannot grant permissions you do not possess", 403);
              }
          }

          try {
              await env.DB.prepare('UPDATE users SET permissions = ? WHERE username = ?')
                  .bind(JSON.stringify(requestedPerms), body.username)
                  .run();
              return jsonResponse({ success: true });
          } catch (e) {
              return errorResponse("Update failed", 500);
          }
      }

      // DELETE User
      if (request.method === 'DELETE') {
          const targetUsername = url.searchParams.get('username');
          if (!targetUsername) return errorResponse("Missing username");
          if (targetUsername === currentUser.username) return errorResponse("Cannot delete yourself");

          const targetUser = await env.DB.prepare('SELECT role FROM users WHERE username = ?').bind(targetUsername).first<{role: string}>();
          
          if (!targetUser) return errorResponse("User not found");

          // Rule: Editors cannot delete Admins
          if (currentUser.role !== 'admin' && targetUser.role === 'admin') {
              return errorResponse("Permission denied: You cannot delete a Super Admin.", 403);
          }

          // Rule: Cannot delete the last Admin
          if (targetUser.role === 'admin') {
             const adminCountResult = await env.DB.prepare("SELECT count(*) as count FROM users WHERE role = 'admin'").first<{count: number}>();
             const adminCount = adminCountResult?.count || 0;
             if (adminCount <= 1) {
                 return errorResponse("Cannot delete the only Super Admin");
             }
          }

          // If currentUser is Admin, they can delete anyone (except last admin or self)
          // If currentUser is Editor, they can delete other Editors (implied by previous check)

          await env.DB.prepare('DELETE FROM users WHERE username = ?').bind(targetUsername).run();
          return jsonResponse({ success: true });
      }
  }

  // 6. Posts Management
  if (path.startsWith('posts')) {
    const currentUser = await getAuthenticatedUser();

    if (request.method === 'GET') {
      const id = url.searchParams.get('id');

      // --- GET SINGLE POST ---
      if (id) {
        // Fetch post
        const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first<DBPost>();
        
        if (!post) return errorResponse('Post not found', 404);

        // Draft Protection
        if (post.status === 'draft') {
            if (!currentUser) return errorResponse('Unauthorized: Draft', 403);
        }
        
        // Increment Views (Atomic Update)
        context.waitUntil(
            env.DB.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').bind(id).run()
        );

        // Format for frontend
        const formattedPost = {
            ...post,
            tags: JSON.parse(post.tags || '[]'),
            // optimistic view update for response
            views: post.views + 1
        };

        return jsonResponse(formattedPost, 200, 0); 
      } 
      
      // --- GET POSTS LIST (Pagination & Filtering) ---
      else {
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const search = (url.searchParams.get('search') || '').toLowerCase();
        const category = url.searchParams.get('category');
        const tag = url.searchParams.get('tag');
        
        const offset = (page - 1) * limit;
        
        let query = 'SELECT id, title, excerpt, tags, category, createdAt, views, url, status FROM posts WHERE 1=1';
        const params: any[] = [];

        // Auth Filter: Admin sees all, Public sees only published
        if (!currentUser) {
            query += " AND status = 'published'";
        }

        if (category) {
            query += " AND category = ?";
            params.push(category);
        }

        if (tag) {
            // Simplistic LIKE query for JSON string tags. 
            // Better solution: a separate tags table, but LIKE is okay for small scale.
            query += " AND tags LIKE ?";
            params.push(`%${tag}%`);
        }

        if (search) {
            query += " AND (lower(title) LIKE ? OR lower(excerpt) LIKE ?)";
            params.push(`%${search}%`);
            params.push(`%${search}%`);
        }

        // Count Total
        const countQuery = query.replace('SELECT id, title, excerpt, tags, category, createdAt, views, url, status', 'SELECT count(*) as total');
        const totalResult = await env.DB.prepare(countQuery).bind(...params).first<{total: number}>();
        const total = totalResult?.total || 0;

        // Fetch Data
        query += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
        params.push(limit);
        params.push(offset);

        const results = await env.DB.prepare(query).bind(...params).all<DBPost>();
        
        const list = results.results.map(p => ({
            ...p,
            tags: JSON.parse(p.tags || '[]')
        }));

        const cacheTime = currentUser ? 0 : (page === 1 && !search && !category && !tag ? 60 : 30);
        return jsonResponse({ list, total, page, limit }, 200, cacheTime); 
      }
    }

    // POST (Protected - Write)
    if (request.method === 'POST') {
      if (!currentUser) return errorResponse('Unauthorized', 401);
      
      const body: any = await request.json();
      if (!body.title) return errorResponse('Missing title');

      const id = body.id || crypto.randomUUID();
      const createdAt = body.createdAt || Date.now();
      const status = body.status || 'draft';
      const tagsString = JSON.stringify(body.tags || []);

      // Check permissions logic similar to KV version
      const existingPost = await env.DB.prepare('SELECT id FROM posts WHERE id = ?').bind(id).first();

      if (existingPost) {
           if (currentUser.role !== 'admin') {
              return errorResponse('Permission denied: Only Main Admin can edit existing articles.', 403);
          }
      } else {
          if (currentUser.role !== 'admin' && !hasPermission(currentUser, 'manage_contents')) {
              return errorResponse('Permission denied: You cannot create articles.', 403);
          }
      }

      await env.DB.prepare(`
        INSERT INTO posts (id, title, excerpt, content, tags, category, createdAt, views, url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            excerpt = excluded.excerpt,
            content = excluded.content,
            tags = excluded.tags,
            category = excluded.category,
            url = excluded.url,
            status = excluded.status
      `).bind(
        id,
        body.title,
        body.excerpt || '',
        body.content || '',
        tagsString,
        body.category || 'Uncategorized',
        createdAt,
        body.views || 0,
        body.url || '',
        status
      ).run();

      return jsonResponse({ id });
    }

    // DELETE (Protected - Write)
    if (request.method === 'DELETE') {
      if (!currentUser) return errorResponse('Unauthorized', 401);
      
      if (currentUser.role !== 'admin') {
          return errorResponse('Permission denied: Only Main Admin can delete articles.', 403);
      }
      
      const id = url.searchParams.get('id');
      if (!id) return errorResponse('Missing ID');

      await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();

      return jsonResponse({ deleted: true });
    }
  }

  return errorResponse('Not found', 404);
};