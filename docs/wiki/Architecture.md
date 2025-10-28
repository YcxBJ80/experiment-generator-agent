# Architecture Overview

```
React Client (Vite + TS)  ⇄  Express Server (Node + TS)  ⇄  Perplexity MCP Bridge
            │                               │
            ▼                               ▼
      Supabase (Postgres)              OpenRouter GPT
```

## Key directories
- `src/` – Vite React application (`pages/`, `components/`, `hooks/`, `lib/`, `assets/`)
- `server/` – Express routes and services (business logic, Supabase access)
- `api/` – Server bootstrap files (Express app wiring)
- `perplexity-mcp-zerver/` – Model Context Protocol bridge
- `supabase/` – Database migrations
- `docs/` – Documentation hub

## Data flow in experiment mode
1. User message originates from `src/pages/Home.tsx`.
2. API endpoint `/api/messages/generate-stream` orchestrates:
   - Storing user and assistant messages.
   - Requesting completions from OpenRouter.
   - Tracking experiment IDs from Supabase.
3. The demo page (`/demo/:id`) renders experiments inside an isolated iframe.

## Streaming pipeline reference
- Backend: [`docs/guides/streaming-backend.md`](../guides/streaming-backend.md)
- Frontend: [`docs/guides/streaming-frontend.md`](../guides/streaming-frontend.md)
- Rendering checklist: [`docs/guides/streaming-render-check.md`](../guides/streaming-render-check.md)

Keep this page synced with the canonical architecture doc at [`docs/architecture.md`](../architecture.md).***
