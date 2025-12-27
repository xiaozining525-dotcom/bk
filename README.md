# 极简个人博客 (Cloudflare D1 + Pages)

这是一个基于 React, Tailwind CSS 和 Cloudflare 全栈免费能力（Pages, Functions, D1, KV）构建的现代个人博客。

## 特性
- **架构升级**: 核心数据迁移至 **Cloudflare D1 (SQL 数据库)**，支持高效分页、搜索和事务。
- **UI风格**: 磨砂玻璃 (Glassmorphism)，全屏动态视频背景，极致响应式。
- **混合存储**: 
  - **D1**: 存储文章内容、用户数据。
  - **KV**: 存储 Session 会话、IP 频率限制（利用 TTL 自动过期）。
- **配置化**: 背景视频、音乐、头像、管理员密码均通过环境变量配置。

## 部署步骤 (完全免费)

### 1. 准备 Cloudflare 资源

#### 创建 KV (用于缓存和会话)
1. 登录 Cloudflare Dashboard。
2. 进入 **Workers & Pages** -> **KV**。
3. 创建命名空间 `BLOG_KV`。

#### 创建 D1 数据库 (用于核心数据)
1. 进入 **Workers & Pages** -> **D1**。
2. 创建数据库，命名为 `blog-db`。
3. **重要**: 记下数据库 ID。

### 2. 初始化数据库表结构
你需要安装 Wrangler CLI 来执行 SQL 初始化，或者在 Cloudflare Dashboard 的 D1 控制台中手动输入 SQL。

**方式 A: 使用 Dashboard (最简单)**
1. 进入 D1 数据库 `blog-db` -> **Console** (控制台) 标签页。
2. 复制项目根目录 `schema.sql` 的全部内容。
3. 粘贴并点击 **Execute** 执行。

**方式 B: 使用 CLI**
```bash
# 本地测试
npx wrangler d1 execute blog-db --local --file=./schema.sql
# 远程生产
npx wrangler d1 execute blog-db --remote --file=./schema.sql
```

### 3. 部署到 Cloudflare Pages

#### 使用 Git 部署 (推荐)
1. 将代码上传到 GitHub。
2. Cloudflare Dashboard -> **Pages** -> **Create a project** -> **Connect to Git**。
3. **Build settings**:
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Environment variables (环境变量)**:
   - `BACKGROUND_VIDEO_URL`: 背景视频链接
   - `BACKGROUND_MUSIC_URL`: 背景音乐链接
   - `AVATAR_URL`: 头像链接
5. **绑定资源 (Bindings)**:
   - 项目创建后，去 **Settings** -> **Functions**。
   - **KV Namespace Bindings**: 变量名 `BLOG_KV` -> 选择你创建的 KV。
   - **D1 Database Bindings**: 变量名 `DB` (必须大写) -> 选择 `blog-db`。
6. **重新部署**: 绑定资源后，必须手动触发一次重新部署才能生效。

### 4. 博客初始化
1. 访问部署好的域名。
2. 系统会自动检测到没有用户，重定向到 `/register`。
3. 设置你的第一个管理员账号和密码。

## 开发
本地开发需要模拟 D1 和 KV：
```bash
npm install
npm run dev
# 或者使用 wrangler pages dev
npx wrangler pages dev . --kv=BLOG_KV --d1=DB
```
