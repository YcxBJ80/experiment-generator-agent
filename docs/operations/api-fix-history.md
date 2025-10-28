# API Fix History

Use this log to understand previous incidents involving large-language-model integrations and how they were solved.

## January 2025 – Perplexity path mismatch & OpenAI auth failures

### Symptoms
- `perplexity-mcp-zerver` failed to launch because the process attempted to load `.../hackathone2/perplexity-mcp-zerver/build/index.js`.
- OpenAI requests returned `401 User not found` and `403 Country, region, or territory not supported`.

### Fixes
1. **Corrected MCP entrypoint** – `api/lib/perplexityMcpClient.ts` now points at `experiment-generator-agent/perplexity-mcp-zerver/build/index.js`.
2. **Switched to OpenRouter** – added [OpenRouter](https://openrouter.ai/keys) configuration to bypass geographic restrictions.
3. **Documented environment requirements** – see [`docs/getting-started.md`](../getting-started.md) for the required `.env` variables.
4. **Created validation script** – `test-openai-config.js` helps check credentials before deploying.

### Follow-up actions
- Track API usage quotas to avoid hard limits.
- Add richer logging and retry logic to the LLM client.
- Offer multiple model options in the UI so users can select their preferred provider.

Keep adding incidents here so future debugging starts with historical context.***
