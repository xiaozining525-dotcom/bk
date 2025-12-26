# Cloudflare 免费版个人博客（前后端分离）

## 1️⃣ 项目概览
- **前端**：纯 HTML/CSS/JS（直接部署到 Cloudflare Pages）  
- **后端**：Pages Functions（Node‑compatible）+ KV 存储  
- **特性**：全屏背景视频、玻璃态 UI、Markdown 渲染、分页、标签、搜索、阅读量统计、简易后台（单密码）  

## 2️⃣ 前置条件
1. **Cloudflare 账户**（免费即可）  
2. **Git**（用于版本控制和部署）  

## 3️⃣ 目录结构
```
my-blog/
├─ public/                     # 静态资源（Pages 会直接托管此目录）
│   ├─ background.mp4          # 全屏背景视频（自行准备）
│   ├─ fallback.jpg           # 移动端降级图片（可选）
│   ├─ index.html
│   ├─ archive.html
│   ├─ post.html
│   ├─ about.html
│   ├─ admin.html
│   ├─ 404.html
│   ├─ style.css
│   └─ script.js
│
└─ functions/                  # Pages Functions（后端 API）
    └─ api.js
```

## 4️⃣ 在 Cloudflare 中需要做的配置步骤

### 步骤 1：创建 KV 命名空间
1. 登录 Cloudflare Dashboard → **Workers & Pages → KV**
2. 点击 **Create namespace**，命名为 `BLOG_KV`（或自定义名称）
3. 记录下生成的 **Namespace ID**（后面要用到）

### 步骤 2：创建 Pages 项目
1. 进入 **Pages → Create project**
2. 选择 **Connect to Git**，关联你的 GitHub/GitLab 仓库（包含上述所有文件）
3. 配置构建设置：
   - **Build command**：留空（无需构建，直接部署静态文件）
   - **Build output directory**：`public`
   - **Root directory**：留空（默认根目录）

### 步骤 3：绑定 KV 命名空间
1. 进入 Pages 项目 → **Settings → Functions → KV namespaces**
2. 点击 **Add binding**
   - **Variable name**：`BLOG_KV`（与代码中使用的变量名一致）
   - **KV namespace**：选择步骤 1 中创建的 KV 命名空间

### 步骤 4：添加环境变量
1. 进入 Pages 项目 → **Settings → Environment variables**
2. 点击 **Add variable**
   - **Variable name**：`ADMIN_PASSWORD`
   - **Value**：设置你的管理员密码（如 `changeme123`）
   - **Deployment environments**：勾选 `Production` 和 `Preview`

### 步骤 5：部署项目
1. 进入 Pages 项目 → **Deployments**
2. 点击 **Trigger deployment** → **Deploy latest commit**
3. 等待部署完成，即可通过生成的 Pages 域名访问博客

## 5️⃣ 访问博客
- 首页：`https://<your-domain>.pages.dev`
- 后台：`https://<your-domain>.pages.dev/admin.html`

## 6️⃣ 功能说明

### 前台功能
- ✅ 全屏背景视频（自动静音播放，支持音量控制）
- ✅ 玻璃态 UI 设计
- ✅ 文章列表分页展示
- ✅ 文章搜索和标签筛选
- ✅ Markdown 内容渲染
- ✅ 阅读量统计
- ✅ 响应式设计（适配移动端、平板、桌面端）

### 后台功能
- ✅ 单密码登录验证
- ✅ 文章发布、编辑、删除
- ✅ 标签管理
- ✅ 阅读量查看

## 7️⃣ 常见问题

| 场景 | 解决方案 |
|------|----------|
| 视频在移动端卡顿 | 页面会自动检测 `navigator.connection.saveData`，若开启省流模式则暂停视频并显示 `fallback.jpg`。 |
| 读取 KV 失败 | 确认 `wrangler.toml` 中的 KV `id` 与 Dashboard 中创建的命名空间一致。 |
| 登录总是失败 | 检查 Dashboard 中的 `ADMIN_PASSWORD` 是否与前端输入完全匹配（区分大小写）。 |
| 文章列表为空 | 确认已经在后台创建了文章，或直接使用 API `POST /api/posts` 添加。 |

## 8️⃣ 许可证
本项目采用 **MIT License**，可自由使用、修改、分发。

--- 

**至此，整个博客系统已经完成。**  
直接将代码提交到 Git 仓库，按上述步骤部署到 Cloudflare Pages，即可拥有一个 **极简、现代、全响应式、完全基于 Cloudflare 免费资源** 的个人博客站点。