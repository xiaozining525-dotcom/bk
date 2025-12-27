interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
  results: T[];
}

interface EventContext<Env, P extends string, Data> {
  request: Request;
  env: Env;
}

type PagesFunction<Env = unknown> = (context: EventContext<Env, any, any>) => Promise<Response>;

interface Env {
  DB: D1Database;
}

interface PostMetadata {
  id: string;
  title: string;
  excerpt: string;
  createdAt: number;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const query = "SELECT id, title, excerpt, createdAt FROM posts WHERE status = 'published' ORDER BY createdAt DESC LIMIT 20";
  const result = await env.DB.prepare(query).all<PostMetadata>();
  const publishedPosts = result.results;

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