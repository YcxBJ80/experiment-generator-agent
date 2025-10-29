# 管理后台部署检查清单

使用此清单确保管理后台正确安装和配置。

## ✅ 安装检查

- [ ] Node.js 已安装 (>= 16.x)
- [ ] npm 已安装
- [ ] 已进入 `Admin/` 目录
- [ ] 已运行 `npm install`
- [ ] 依赖安装成功，无错误

## ✅ 配置检查

- [ ] 已创建 `.env.local` 文件
- [ ] `VITE_SUPABASE_URL` 已配置
- [ ] `VITE_SUPABASE_ANON_KEY` 已配置
- [ ] `VITE_SUPABASE_SERVICE_ROLE_KEY` 已配置（推荐）
- [ ] 环境变量值正确（已从 Supabase 控制台复制）

## ✅ 数据库检查

- [ ] 已运行数据库迁移 `20251029000000_add_access_type_to_user_profiles.sql`
- [ ] `user_profiles` 表存在
- [ ] `user_profiles.access_type` 字段已添加
- [ ] `messages` 表存在
- [ ] 数据库中有测试用户数据

验证 SQL:
```sql
-- 检查 access_type 字段是否存在
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name = 'access_type';

-- 检查用户数据
SELECT id, username, email, access_type, created_at 
FROM user_profiles 
LIMIT 5;
```

## ✅ 启动检查

- [ ] 运行 `npm run dev` 无错误
- [ ] 开发服务器在 http://localhost:5174 启动
- [ ] 浏览器能访问管理后台
- [ ] 无控制台错误

## ✅ 功能检查

### 数据仪表板
- [ ] 统计卡片显示正确（用户数、消息数）
- [ ] 用户消息数柱状图显示
- [ ] 访问类型分布饼图显示
- [ ] 用户详情表格显示所有用户
- [ ] 时间格式正确显示

### 用户管理
- [ ] 用户列表正确加载
- [ ] 搜索框可以搜索用户名和邮箱
- [ ] 过滤按钮工作正常（全部/软件/API/未分配）
- [ ] 点击"软件"按钮可以分配访问类型
- [ ] 点击"API"按钮可以分配访问类型
- [ ] 点击"清除"按钮可以移除访问类型
- [ ] 保存后界面即时更新
- [ ] 刷新按钮工作正常

## ✅ 安全检查

- [ ] `.env.local` 不在版本控制中
- [ ] `.gitignore` 包含 `.env*` 规则
- [ ] Service Role Key 未泄露
- [ ] 管理后台只在内部网络访问（生产环境）

## ✅ 构建检查（可选）

- [ ] 运行 `npm run build` 成功
- [ ] `dist/` 目录已生成
- [ ] 运行 `npm run preview` 可以预览
- [ ] 生产版本功能正常

## 🐛 常见问题排查

### 问题: "Missing Supabase environment variables"
- 检查 `.env.local` 文件是否存在
- 确认环境变量名称正确（必须以 `VITE_` 开头）
- 重启开发服务器

### 问题: 无法获取用户数据
- 检查 Supabase URL 和 Key 是否正确
- 确认使用了 Service Role Key（具有完整权限）
- 检查浏览器网络标签查看请求状态
- 验证数据库中有数据

### 问题: 图表不显示
- 确认 recharts 依赖已安装
- 检查是否有足够的数据（至少1个用户）
- 打开浏览器控制台查看错误

### 问题: 端口冲突
- 检查 5174 端口是否被占用
- 修改 `vite.config.ts` 中的端口号
- 重启开发服务器

## 📝 部署前检查（生产环境）

- [ ] 环境变量配置在部署平台（Vercel/Netlify等）
- [ ] 构建命令设置为 `npm run build`
- [ ] 输出目录设置为 `dist`
- [ ] 添加了管理员身份验证（推荐）
- [ ] 限制了访问IP或添加了防火墙规则
- [ ] 设置了错误监控（Sentry等）
- [ ] 配置了访问日志

## ✨ 可选增强

- [ ] 添加管理员登录功能
- [ ] 配置数据刷新间隔
- [ ] 添加数据导出功能
- [ ] 集成邮件通知
- [ ] 设置备份策略
- [ ] 添加操作日志记录

## 📞 获取帮助

如果遇到问题:
1. 查看浏览器控制台错误
2. 查看 `QUICKSTART.md` 中的常见问题
3. 查看 `ADMIN_GUIDE.md` 中的故障排除部分
4. 检查 Supabase 项目状态
5. 联系开发团队

---

**祝贺！** 完成所有检查项后，你的管理后台就可以正常使用了！ 🎉

