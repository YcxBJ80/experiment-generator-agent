# Operations & Troubleshooting

## Recent incidents

### January 2025 – Perplexity path mismatch & OpenAI auth failures
- MCP server attempted to load a non-existent path (`.../hackathone2/perplexity-mcp-zerver/...`).
- OpenAI rejected requests with `401` and `403` errors due to regional restrictions.
- Fixes:
  1. Updated `api/lib/perplexityMcpClient.ts` to point at the correct `experiment-generator-agent` path.
  2. Switched to OpenRouter for GPT access, documented in the environment setup guide.
  3. Added `test-openai-config.js` to validate credentials.

See the detailed log: [`docs/operations/api-fix-history.md`](../operations/api-fix-history.md).

## Best practices
- Keep `.env` files out of version control; replicate values in your deployment platform.
- Run `pnpm check` and `pnpm lint` before creating PRs.
- Use the streaming checklist (`docs/guides/streaming-render-check.md`) when tweaking SSE behaviour.

## Need help?
- Consult the architecture overview to understand dependencies.
- Use the integration scripts (`test-*.js`) after the API is running at `http://localhost:3001`.***
