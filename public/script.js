/* 公共函数 --------------------------------------------------- */
function $(sel) { return document.querySelector(sel); }
function $all(sel) { return document.querySelectorAll(sel); }

/* 背景视频音量控制 ------------------------------------------- */
const video = $('#bg-video');
const volBtn = $('#volume-btn');
let isMuted = true;
volBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  video.muted = isMuted;
  volBtn.textContent = isMuted ? '🔈' : '🔊';
});

/* 移动端降级：若网络慢或设备性能低，使用 fallback.jpg ---------------- */
if (navigator.connection && navigator.connection.saveData) {
  video.pause();
  video.style.display = 'none';
}

/* 首页 & 归档：获取文章列表 --------------------------------- */
async function loadPosts(page = 1, query = '', tag = '') {
  const params = new URLSearchParams({page, q: query, tag});
  const res = await fetch(`/api/posts?${params}`);
  const data = await res.json();
  const container = $('#post-list') || $('#archive-list');
  container.innerHTML = '';
  data.posts.forEach(p => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.innerHTML = `
      <h2><a href="post.html?id=${p.id}">${p.title}</a></h2>
      <p>${p.excerpt}</p>
      <small>🕒 ${new Date(p.created).toLocaleDateString()} • 👁 ${p.views}</small>
    `;
    container.appendChild(card);
  });
}

/* 文章详情页 ------------------------------------------------- */
async function loadPostDetail() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) return;
  const res = await fetch(`/api/posts/${id}`);
  const post = await res.json();

  fetch(`/api/views/${id}`, {method: 'POST'}).catch(()=>{});

  const el = $('#post-content');
  el.innerHTML = `
    <h1>${post.title}</h1>
    <div class="meta">🕒 ${new Date(post.created).toLocaleDateString()} • 👁 ${post.views}</div>
    <div class="md-content">${marked.parse(post.content)}</div>
    <div class="tags">标签：${post.tags.map(t=>`<span>${t}</span>`).join(' ')}</div>
  `;
}

/* 返回按钮 */
$('#back-btn')?.addEventListener('click', () => location.href = 'index.html');

/* 搜索框（首页） */
$('#search')?.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    loadPosts(1, e.target.value);
  }
});

/* 管理后台 --------------------------------------------------- */
async function adminLogin(pwd) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({password:pwd})
  });
  const data = await res.json();
  return data.success;
}

/* 登录表单 */
$('#login-btn')?.addEventListener('click', async () => {
  const pwd = $('#admin-pwd').value;
  const ok = await adminLogin(pwd);
  $('#login-msg').textContent = ok ? '登录成功' : '密码错误';
  if (ok) {
    $('#login-form').style.display = 'none';
    $('#dashboard').style.display = 'block';
    loadDashboard();
  }
});

/* 加载文章列表（后台） */
async function loadDashboard() {
  const res = await fetch('/api/posts');
  const data = await res.json();
  const list = $('#post-list');
  list.innerHTML = '';
  data.posts.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${p.title}</strong>
      <button class="edit" data-id="${p.id}">编辑</button>
      <button class="del" data-id="${p.id}">删除</button>
    `;
    list.appendChild(li);
  });
}

/* 新建文章 */
$('#new-post-btn')?.addEventListener('click', () => openEditor());

/* 编辑/删除按钮 */
$('#post-list')?.addEventListener('click', e => {
  if (e.target.classList.contains('edit')) {
    const id = e.target.dataset.id;
    editPost(id);
  } else if (e.target.classList.contains('del')) {
    const id = e.target.dataset.id;
    deletePost(id);
  }
});

/* 打开编辑器（新建或编辑） */
async function openEditor(post = null) {
  $('#editor').style.display = 'block';
  $('#dashboard').style.display = 'none';
  if (post) {
    $('#post-title').value = post.title;
    $('#post-content-md').value = post.content;
    $('#post-tags').value = post.tags.join(',');
    $('#save-post-btn').dataset.id = post.id;
  } else {
    $('#post-title').value = '';
    $('#post-content-md').value = '';
    $('#post-tags').value = '';
    delete $('#save-post-btn').dataset.id;
  }
}

/* 保存文章（新建/更新） */
$('#save-post-btn')?.addEventListener('click', async () => {
  const id = $('#save-post-btn').dataset.id;
  const payload = {
    title: $('#post-title').value,
    content: $('#post-content-md').value,
    tags: $('#post-tags').value.split(',').map(t=>t.trim()).filter(Boolean)
  };
  const url = id ? `/api/posts/${id}` : '/api/posts';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  const data = await res.json();
  $('#editor-msg').textContent = data.success ? '保存成功' : '保存失败';
  if (data.success) {
    $('#editor').style.display = 'none';
    $('#dashboard').style.display = 'block';
    loadDashboard();
  }
});

/* 取消编辑 */
$('#cancel-edit-btn')?.addEventListener('click', () => {
  $('#editor').style.display = 'none';
  $('#dashboard').style.display = 'block';
});

/* 编辑已有文章 */
async function editPost(id) {
  const res = await fetch(`/api/posts/${id}`);
  const post = await res.json();
  openEditor(post);
}

/* 删除文章 */
async function deletePost(id) {
  if (!confirm('确定删除吗？')) return;
  const res = await fetch(`/api/posts/${id}`, {method:'DELETE'});
  const data = await res.json();
  if (data.success) loadDashboard();
}

/* 页面加载入口 ------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  if (location.pathname.endsWith('post.html')) loadPostDetail();
  else if (location.pathname.endsWith('index.html') || location.pathname === '/' ) loadPosts();
});