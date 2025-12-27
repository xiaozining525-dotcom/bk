interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
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
  createdAt: number;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const query = "SELECT id, createdAt FROM posts WHERE status = 'published'";
  const result = await env.DB.prepare(query).all<PostMetadata>();
  const publishedPosts = result.results;

  const urls = publishedPosts.map(post => `
  <url>
    <loc>${baseUrl}/#/post/${post.id}</loc>
    <lastmod>${new Date(post.createdAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  `).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/#/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  ${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400'
    }
  });
};