# Getting Started

Follow these steps to spin up the Experiment Visualizer locally.

## Prerequisites
- Node.js 18 or newer
- pnpm (recommended) or npm
- Supabase account
- OpenRouter API key

## Setup
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Create `.env` in the repo root and add:
   ```bash
   OPENAI_API_KEY=your_openrouter_api_key_here
   OPENAI_BASE_URL=https://openrouter.ai/api/v1
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   JWT_SECRET=replace_with_strong_random_secret
   NODE_ENV=development
   ```
3. Apply Supabase migrations:
   ```bash
   supabase db push
   ```
4. Run the stack:
   ```bash
   pnpm dev
   ```
   - Client: <http://localhost:5173>
   - API: <http://localhost:3001>

## Validation
- Type check: `pnpm check`
- Lint: `pnpm lint`
- Integration tests (after starting the API): `node test-complete-integration.js`

Need more detail? The canonical guide lives in [`docs/getting-started.md`](../getting-started.md).***
