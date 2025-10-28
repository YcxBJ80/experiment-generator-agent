# Experiment Visualizer

An AI-assisted platform that turns natural language prompts into interactive HTML/CSS/JS experiments. The project couples a Vite + React client with an Express + Supabase backend and integrates OpenRouter (GPT-compatible) models plus a Perplexity MCP bridge.

## At a glance

- **Conversational experiment builder** – chat with the assistant to generate runnable experiments.
- **Streaming UX** – Server-Sent Events (SSE) pipe responses to the UI in real time.
- **Supabase persistence** – conversations, experiments, and surveys live in Postgres.
- **Perplexity integration** – MCP bridge ready for live knowledge retrieval.

## Repository structure

```
.
├── api/                   # Express bootstrap (middleware, app factory)
├── server/                # Routes, services, Supabase helpers
├── src/                   # Vite React client (pages, hooks, components, lib, assets)
├── docs/                  # Documentation hub (see docs/README.md)
│   ├── getting-started.md
│   ├── architecture.md
│   ├── guides/            # Streaming deep-dives
│   ├── operations/        # Incident history
│   └── wiki/              # Ready-to-publish GitHub wiki pages
├── perplexity-mcp-zerver/ # Model Context Protocol bridge (Node CLI)
├── supabase/              # Database migrations
└── test-*.js              # Integration harnesses
```

## Getting started

1. **Install dependencies**
   ```bash
   pnpm install   # or npm install
   ```
2. **Configure environment variables** – create `.env` in the repo root using [`docs/getting-started.md`](docs/getting-started.md) as a template.
3. **Apply Supabase migrations**
   ```bash
   supabase db push
   ```
4. **Run the stack**
   ```bash
   pnpm dev          # frontend + backend
   # or
   pnpm client:dev   # http://localhost:5173
   pnpm server:dev   # http://localhost:3001
   ```

## Development workflow

| Task | Command |
| ---- | ------- |
| Type checking | `pnpm check` |
| Linting | `pnpm lint` |
| Build production bundle | `pnpm build` |
| Preview production build | `pnpm preview` |
| Run integration harness (after API is up) | `node test-complete-integration.js` |

## Documentation map

- **Docs hub:** [`docs/README.md`](docs/README.md)
- **Setup guide:** [`docs/getting-started.md`](docs/getting-started.md)
- **Architecture overview:** [`docs/architecture.md`](docs/architecture.md)
- **Streaming internals:** [`docs/guides/`](docs/guides)
- **Operational history:** [`docs/operations/api-fix-history.md`](docs/operations/api-fix-history.md)
- **Wiki drafts:** [`docs/wiki/`](docs/wiki)

## Conventions

- **TypeScript + ESLint** – keep code lint-clean and type-safe.
- **Tailwind + utility-first styling** – follow existing patterns in `src/pages` and `src/components`.
- **Conventional Commits** – use prefixes like `feat:`, `fix:`, `chore:` when committing.
- **Security** – store secrets in `.env.local` variants that are already gitignored.

## Need help?

- Check the documentation hub for deeper dives.
- Ask the assistant to generate experiments, then open `/demo/:id` to preview them in a sandboxed iframe.
- If streaming behaves oddly, run through the checklist at [`docs/guides/streaming-render-check.md`](docs/guides/streaming-render-check.md).***
