/**
 * Cloudflare Pages Functions – 后端 API
 * 绑定的 KV 命名空间：BLOG_KV
 * 环境变量：ADMIN_PASSWORD
 */

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // ------------------- 路由分发 -------------------
  if (pathname === '/api/login' && request.method === 'POST')
    return handleLogin(request, env);
  if (pathname.startsWith('/api/posts')) {
    if (request.method === 'GET') return handleGetPosts(request, env);
    if (request.method === 'POST') return handleCreatePost(request, env);
    // /api/posts/:id
    const id = pathname.split('/').pop();
    if (request.method === 'GET') return handleGetPost(id, env);
    if (request.method === 'PUT') return handleUpdatePost(id, request, env);
    if (request.method === 'DELETE') return handleDeletePost(id, env);
  }
  if (pathname.startsWith('/api/views/') && request.method === 'POST')
    return handleIncreaseView(pathname.split('/').pop(), env);
  // 未匹配
  return new Response(JSON.stringify({error:'Not Found'}), {status:404, headers:{'Content-Type':'application/json'}});
}

/* ---------- 登录验证（单密码） ---------- */
async function handleLogin(request, env) {
  const { password } = await request.json();
  const ok = password === env.ADMIN_PASSWORD;
  return new Response(JSON.stringify({success: ok}), {
    headers: {'Content-Type':'application/json'}
  });
}

/* ---------- 文章列表（支持分页、搜索、标签） ---------- */
async function handleGetPosts(request, env) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get('page') || 1);
  const q = url.searchParams.get('q')?.toLowerCase() || '';
  const tag = url.searchParams.get('tag')?.toLowerCase() || '';
  const pageSize = 10;

  // 读取所有文章键（key: post:{id})
  const list = await env.BLOG_KV.list({prefix:'post:'});
  const allPosts = [];

  for (const key of list.keys) {
    const raw = await env.BLOG_KV.get(key.name, {type:'json'});
    if (!raw) continue;
    // 过滤搜索/标签
    if (q && !raw.title.toLowerCase().includes(q) && !raw.content.toLowerCase().includes(q)) continue;
    if (tag && !(raw.tags || []).some(t=>t.toLowerCase()===tag)) continue;
    allPosts.push(raw);
  }

  // 按创建时间倒序
  allPosts.sort((a,b)=> new Date(b.created) - new Date(a.created));

  const start = (page-1)*pageSize;
  const paged = allPosts.slice(start, start+pageSize).map(p=>({
    id: p.id,
    title: p.title,
    excerpt: p.content.slice(0,120)+'…',
    created: p.created,
    views: p.views||0,
    tags: p.tags||[]
  }));

  return new Response(JSON.stringify({posts:paged,total:allPosts.length}), {
    headers:{'Content-Type':'application/json'}
  });
}

/* ---------- 创建文章 ---------- */
async function handleCreatePost(request, env) {
  const { title, content, tags } = await request.json();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const post = {
    id,
    title,
    content,
    tags: tags || [],
    created: now,
    views: 0
  };
  await env.BLOG_KV.put(`post:${id}`, JSON.stringify(post));
  return new Response(JSON.stringify({success:true, id}), {
    headers:{'Content-Type':'application/json'}
  });
}

/* ---------- 获取单篇文章 ---------- */
async function handleGetPost(id, env) {
  const raw = await env.BLOG_KV.get(`post:${id}`, {type:'json'});
  if (!raw) return new Response(JSON.stringify({error:'Not Found'}), {status:404, headers:{'Content-Type':'application/json'}});
  return new Response(JSON.stringify(raw), {headers:{'Content-Type':'application/json'}});
}

/* ---------- 更新文章 ---------- */
async function handleUpdatePost(id, request, env) {
  const existing = await env.BLOG_KV.get(`post:${id}`, {type:'json'});
  if (!existing) return new Response(JSON.stringify({error:'Not Found'}), {status:404, headers:{'Content-Type':'application/json'}});
  const { title, content, tags } = await request.json();
  const updated = {
    ...existing,
    title: title ?? existing.title,
    content: content ?? existing.content,
    tags: tags ?? existing.tags,
    // 保持原有创建时间和阅读量
  };
  await env.BLOG_KV.put(`post:${id}`, JSON.stringify(updated));
  return new Response(JSON.stringify({success:true}), {headers:{'Content-Type':'application/json'}});
}

/* ---------- 删除文章 ---------- */
async function handleDeletePost(id, env) {
  await env.BLOG_KV.delete(`post:${id}`);
  return new Response(JSON.stringify({success:true}), {headers:{'Content-Type':'application/json'}});
}

/* ---------- 阅读量自增 ---------- */
async function handleIncreaseView(id, env) {
  const key = `post:${id}`;
  const post = await env.BLOG_KV.get(key, {type:'json'});
  if (!post) return new Response(JSON.stringify({error:'Not Found'}), {status:404, headers:{'Content-Type':'application/json'}});
  post.views = (post.views || 0) + 1;
  await env.BLOG_KV.put(key, JSON.stringify(post));
  return new Response(JSON.stringify({success:true, views:post.views}), {headers:{'Content-Type':'application/json'}});
}