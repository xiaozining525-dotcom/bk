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
}

interface PostMetadata {
  id: string;
  title: string;
  excerpt: string;
  createdAt: number;
  status?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const posts = (await env.BLOG_KV.get('metadata:posts', 'json') as PostMetadata[]) || [];
  
  // Filter only published posts
  const publishedPosts = posts
    .filter(p => p.status !== 'draft')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20); // Top 20 for RSS

  const items = publishedPosts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.excerpt}]]></description>
      <link>${baseUrl}/#/post/${post.id}</link>
      <guid>${baseUrl}/#/post/${post.id}</guid>
      <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>
    </item>
  `).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>My Personal Blog</title>
  <link>${baseUrl}</link>
  <description>Thoughts, stories and ideas.</description>
  <language>zh-cn</language>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};