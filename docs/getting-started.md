# Getting Started

This guide walks you through setting up the Experiment Visualizer locally, from installing prerequisites to launching the full stack.

## Prerequisites

- **Node.js 18+** – the project targets modern ECMAScript features.
- **pnpm** (recommended) or **npm** – package manager.
- **Supabase account** – for the backing Postgres database.
- **OpenRouter API key** – the platform uses OpenRouter to proxy GPT-style models.

## 1. Install dependencies

```bash
pnpm install   # preferred
# or
npm install
```

> If you haven’t installed pnpm yet, see the [official instructions](https://pnpm.io/installation).

## 2. Configure environment variables

Create a file named `.env` in the repository root and populate the following values:

```bash
# OpenAI API (via OpenRouter)
OPENAI_API_KEY=your_openrouter_api_key_here
OPENAI_BASE_URL=https://openrouter.ai/api/v1

# Supabase
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Authentication
JWT_SECRET=replace_with_strong_random_secret

# General
NODE_ENV=development
```

Tips:

- Never commit `.env` – it’s already in `.gitignore`.
- When deploying (e.g. to Vercel), copy the same variables into the platform’s environment settings.
- Generate OpenRouter keys at <https://openrouter.ai/keys> and Supabase credentials from **Settings → API** in your Supabase project.

## 3. Apply database migrations

Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run:

```bash
supabase db push
```

This command creates all required tables (`messages`, `surveys`, `user_profiles`, and more) along with required indexes and triggers.

## 4. Run the app

```bash
# Frontend + backend concurrently
pnpm dev

# Or run them separately for focused debugging
pnpm client:dev
pnpm server:dev
```

- Client: <http://localhost:5173>
- API: <http://localhost:3001>

## 5. Validate your setup

- **Type check:** `pnpm check`
- **Lint:** `pnpm lint`
- **Integration smoke tests:** Start the API server (`pnpm server:dev`), then run `node test-complete-integration.js` or `node test-delete-e2e.js`.

If everything passes, you’re ready to build experiments!***
