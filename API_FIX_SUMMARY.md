# Large-Model API Fix Summary

## Issue analysis

Terminal logs exposed two main problems:

1. **Perplexity MCP path mismatch** – the system attempted to load `/Users/yangchengxuan/Desktop/hackathone2/perplexity-mcp-zerver/build/index.js`, which does not exist.
2. **OpenAI API authentication failure** – the OpenAI requests returned 401 `User not found` errors and 403 `Country, region, or territory not supported`.

## Fixes implemented

### 1. Corrected the Perplexity MCP server path

Line 41 in `api/lib/perplexityMcpClient.ts` now points to the project-local build artifact:

```typescript
// Before
args: ['/Users/yangchengxuan/Desktop/hackathone2/perplexity-mcp-zerver/build/index.js'],

// After
args: ['/Users/yangchengxuan/Desktop/PROJECTS/Experiment Visualizer/experiment-generator-agent/perplexity-mcp-zerver/build/index.js'],
```

### 2. Updated the OpenAI API configuration

1. Added `ENV_SETUP.md` with environment-variable instructions.
2. Added `test-openai-config.js` to sanity-check the API credentials.
3. Switched to OpenRouter because OpenAI blocks requests from the current region.
4. Changed the default model in `api/routes/messages.ts` to `openai/gpt-5`.

## Environment variables

Create a `.env` file in the project root and include the following values:

```bash
# OpenAI API Configuration (via OpenRouter)
OPENAI_API_KEY=your_openrouter_api_key_here
OPENAI_BASE_URL=https://openrouter.ai/api/v1

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Other configurations
NODE_ENV=development
```

## Verification steps

1. Run `node test-openai-config.js` to confirm the OpenRouter credentials.
2. Ensure `perplexity-mcp-zerver` still launches successfully.

## Notes

1. Do not commit the `.env` file.
2. Configure the same variables in Vercel (or whichever deployment platform you use).
3. Generate OpenRouter keys at [openrouter.ai/keys](https://openrouter.ai/keys).
4. Run `supabase db push` to apply the latest migrations (including `supabase/migrations/20251028000000_ensure_user_profiles_table.sql`, which guarantees the `user_profiles` table exists).

## Follow-up ideas

1. Add more error handling and logging to simplify troubleshooting.
2. Offer additional model choices so users can select their preferred provider.
3. Track API usage to avoid exceeding quota.
