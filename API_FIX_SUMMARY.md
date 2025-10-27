# 大模型API调用问题修复总结

## 问题分析

从终端日志中发现了两个主要问题：

1. **Perplexity MCP服务器路径错误**：系统尝试访问 `/Users/yangchengxuan/Desktop/hackathone2/perplexity-mcp-zerver/build/index.js`，但这个路径不存在。
2. **OpenAI API认证失败**：返回401错误"User not found"，以及403错误"Country, region, or territory not supported"。

## 修复方案

### 1. 修复Perplexity MCP服务器路径

修改了 `api/lib/perplexityMcpClient.ts` 文件中的第41行，将错误的路径更改为正确的项目路径：

```typescript
// 修改前
args: ['/Users/yangchengxuan/Desktop/hackathone2/perplexity-mcp-zerver/build/index.js'],

// 修改后
args: ['/Users/yangchengxuan/Desktop/PROJECTS/Experiment Visualizer/experiment-generator-agent/perplexity-mcp-zerver/build/index.js'],
```

### 2. 修复OpenAI API配置

1. 创建了环境变量配置指南 `ENV_SETUP.md`，说明如何配置 `.env` 文件。
2. 创建了测试脚本 `test-openai-config.js` 用于验证API配置。
3. 发现OpenAI在您所在的地区不支持，因此需要使用OpenRouter。
4. 修改了 `api/routes/messages.ts` 文件中的默认模型名称，从 `openai/gpt-5-mini` 更改为 `openrouter/andromeda-alpha`。

## 环境变量配置

请确保在项目根目录下创建 `.env` 文件，并配置以下环境变量：

```bash
# OpenAI API Configuration (使用OpenRouter)
OPENAI_API_KEY=your_openrouter_api_key_here
OPENAI_BASE_URL=https://openrouter.ai/api/v1

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Other configurations
NODE_ENV=development
```

## 测试验证

1. 运行 `node test-openai-config.js` 验证OpenRouter API配置是否正确。
2. 确认 `perplexity-mcp-zerver` 可以正常运行。

## 注意事项

1. 请勿将 `.env` 文件提交到版本控制系统。
2. 如果使用Vercel部署，请在Vercel控制台中配置环境变量。
3. OpenRouter API密钥可以从 [OpenRouter官网](https://openrouter.ai/keys) 获取。
4. 运行 `supabase db push` 以应用最新的数据库迁移（其中 `supabase/migrations/20251028000000_ensure_user_profiles_table.sql` 会确保存在 `user_profiles` 表）。

## 后续建议

1. 考虑添加更多的错误处理和日志记录，以便更好地诊断问题。
2. 可以考虑添加多个模型选项，让用户可以选择不同的模型。
3. 可以考虑添加API使用量监控，以避免超出配额。
