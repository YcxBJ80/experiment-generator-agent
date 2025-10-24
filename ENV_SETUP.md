# 环境变量配置指南

为了使项目正常运行，您需要创建 `.env` 文件并配置以下环境变量：

## 创建 .env 文件

在项目根目录下创建 `.env` 文件（注意：此文件已被 .gitignore 忽略，不会被提交到版本控制）

## 配置内容

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://openrouter.ai/api/v1

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Other configurations
NODE_ENV=development
```

## 获取 API 密钥

### OpenAI API 密钥
1. 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 登录并创建新的 API 密钥
3. 将密钥复制到 `OPENAI_API_KEY`

### Supabase 配置
1. 访问 [Supabase Dashboard](https://app.supabase.com)
2. 创建新项目或选择现有项目
3. 在 Settings > API 中找到 URL 和 anon key
4. 将它们分别复制到 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`

## 注意事项

- 请勿将 `.env` 文件提交到版本控制系统
- 如果使用 Vercel 部署，请在 Vercel 控制台中配置环境变量
- 如果使用其他部署方式，请参考相应文档配置环境变量
