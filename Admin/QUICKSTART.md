# 管理后台快速启动指南

## 🚀 5分钟快速启动

### 步骤 1: 进入目录并安装依赖

```bash
cd Admin
npm install
```

### 步骤 2: 配置环境变量

创建 `.env.local` 文件：

```bash
cat > .env.local << EOF
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_ANON_KEY=你的Supabase匿名密钥
VITE_SUPABASE_SERVICE_ROLE_KEY=你的Supabase服务角色密钥
EOF
```

或者手动复制：

```bash
cp .env.example .env.local
# 然后编辑 .env.local 文件填入正确的值
```

### 步骤 3: 运行数据库迁移

在 Supabase 控制台的 SQL 编辑器中执行：

```sql
-- 添加 access_type 字段
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS access_type VARCHAR(20) CHECK (access_type IN ('software', 'api'));

CREATE INDEX IF NOT EXISTS idx_user_profiles_access_type ON user_profiles(access_type);
```

或使用 Supabase CLI：

```bash
cd ..  # 回到项目根目录
supabase db push
```

### 步骤 4: 启动应用

```bash
cd Admin  # 如果不在 Admin 目录
npm run dev
```

打开浏览器访问: http://localhost:5174

## 📝 环境变量获取方式

### 从 Supabase 控制台获取：

1. 访问 https://app.supabase.com
2. 选择你的项目
3. 进入 Settings → API
4. 复制以下值：
   - **URL**: Project URL → `VITE_SUPABASE_URL`
   - **anon/public key**: → `VITE_SUPABASE_ANON_KEY`
   - **service_role key**: → `VITE_SUPABASE_SERVICE_ROLE_KEY`

⚠️ **安全提示**: `service_role` 密钥具有完全数据库访问权限，请妥善保管，不要提交到版本控制！

## ✅ 验证安装

启动后应该看到：

1. 顶部导航栏显示"实验可视化管理后台"
2. 两个导航按钮："数据仪表板" 和 "用户管理"
3. 数据仪表板显示用户统计信息和图表
4. 用户管理页面显示用户列表和操作按钮

## 🔧 常见问题

### 问题 1: "Missing Supabase environment variables"

**解决方案**: 确保 `.env.local` 文件存在且包含正确的环境变量。

### 问题 2: 无法获取用户数据

**解决方案**: 
1. 检查 Supabase 连接是否正常
2. 确认使用了 `service_role` 密钥（具有完全访问权限）
3. 检查数据库中是否有用户数据

### 问题 3: 端口 5174 已被占用

**解决方案**: 
编辑 `vite.config.ts`，修改端口：

```typescript
export default defineConfig({
  server: {
    port: 5175, // 改为其他端口
  }
});
```

### 问题 4: 图表不显示

**解决方案**: 
1. 确保安装了 `recharts` 依赖
2. 检查是否有用户数据
3. 打开浏览器控制台查看错误信息

## 📦 生产部署

### 构建生产版本：

```bash
npm run build
```

### 部署到 Vercel：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel
```

### 部署到 Netlify：

```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 构建并部署
npm run build
netlify deploy --prod --dir=dist
```

## 🎯 下一步

- 查看 [README.md](./README.md) 了解详细功能
- 探索数据仪表板的各种图表
- 尝试为用户分配访问类型
- 使用搜索和过滤功能

## 💡 提示

1. 管理后台是完全独立的应用，不会影响主项目
2. 默认在端口 5174 运行，避免与主应用冲突
3. 使用深色主题，适合长时间使用
4. 所有更改会立即保存到数据库

---

如有问题，请查看控制台日志或联系开发团队。

