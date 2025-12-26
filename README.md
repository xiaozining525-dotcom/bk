# 极简个人博客 (Cloudflare Pages + KV)

这是一个基于 React, Tailwind CSS 和 Cloudflare 全栈免费能力（Pages, Functions, KV）构建的现代个人博客。

## 特性
- **UI风格**: 磨砂玻璃 (Glassmorphism)，全屏动态视频背景，极致响应式。
- **核心功能**: 博客 CRUD，Markdown 渲染，分类/标签筛选，阅读量统计。
- **架构**: 无服务器 (Serverless)，无外部数据库 (NoSQL KV)。

## 部署步骤 (完全免费)

### 1. 准备 Cloudflare
1. 注册/登录 Cloudflare 账号。
2. 进入控制台，在左侧菜单选择 **Workers & Pages** -> **KV**.
3. 创建一个新的 KV 命名空间，命名为 `BLOG_KV`。**记下它的 ID**。

### 2. 代码配置
本代码设计为可直接部署。确保目录结构如下：
- `functions/` (后端逻辑)
- `index.html` 等前端文件在根目录。

### 3. 部署到 Cloudflare Pages

#### 方式 A: 使用 Git (推荐)
1. 将代码上传到 GitHub 仓库。
2. 在 Cloudflare Dashboard -> **Pages** -> **Create a project** -> **Connect to Git**.
3. 选择你的仓库。
4. **Build settings (构建设置)**:
   - Framework preset: None / Create React App (如果使用 Vite 需要调整 build command，本代码示例假设直接静态托管或简单的 Vite build)
   - Build command: `npm run build` (你需要添加 `package.json` 和 Vite 配置，或者直接手动上传 build 后的 `dist` 文件夹)
   - Output directory: `dist`
5. **Environment variables (环境变量)**:
   - 变量名: `ADMIN_PASSWORD`
   - 值: `你的管理员登录密码`
6. **KV Binding (KV 绑定)**:
   - 项目创建后，进入 **Settings** -> **Functions**.
   - 找到 **KV Namespace Bindings**.
   - Variable name: `BLOG_KV` (必须完全一致)
   - KV namespace: 选择第 1 步创建的 `BLOG_KV`。
7. 重新部署 (Redeploy)。

#### 方式 B: 直接上传 (CLI)
如果你想本地构建后直接上传：
1. 本地安装依赖并构建: `npm install && npm run build`
2. 使用 Wrangler CLI:
   ```bash
   npx wrangler pages project create my-blog
   # 绑定 KV (需在 wrangler.toml 或 dashboard 操作)
   npx wrangler pages deploy dist --project-name my-blog
   ```
3. 记得去 Dashboard 绑定 KV 和设置环境变量 `ADMIN_PASSWORD`。

### 4. 本地开发
1. 创建 `package.json` (含 `react`, `react-dom`, `vite` 等依赖)。
2. 运行 `npx wrangler pages dev . --kv=BLOG_KV` (需要本地模拟 KV)。

## 注意事项
- **背景视频**: 代码中使用了一个在线演示视频。部署时，建议将你的 `background.mp4` 放入 public 目录，并修改 `components/BackgroundVideo.tsx` 中的 `src`。
- **图片**: 由于 KV 存储限制（且为了节省免费额度），建议文章内的图片使用外部图床链接，直接在 Markdown 中插入 `![](url)`。
