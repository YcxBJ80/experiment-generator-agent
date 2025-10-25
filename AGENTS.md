# Repository Guidelines

## Project Structure & Module Organization
- `src/` houses the Vite React client; organize UI into `pages/` for routes, `components/` for shared widgets, `hooks/` for state helpers, `lib/` for API clients, and `assets/` for static media referenced via import.
- `api/` hosts the Express server; keep request handlers in `routes/`, shared business logic in `services/`, and server bootstrap in `server.ts`.
- `public/` contains static files served directly by Vite; `supabase/migrations/` tracks database schema changes; integration harnesses and manual HTML harnesses live at repo root under the `test-*` files.

## Build, Test, and Development Commands
- `npm run dev` launches the full stack (Vite client + Nodemon API) for local iteration.
- `npm run client:dev` and `npm run server:dev` start each side individually when debugging.
- `npm run build` produces the production bundle in `dist/`; follow with `npm run preview` to smoke test it.
- `npm run lint` runs the ESLint ruleset defined in `eslint.config.js`; `npm run check` executes `tsc --noEmit` to surface TypeScript issues.
- Run targeted integration checks with `node test-complete-integration.js` or `node test-delete-e2e.js` after the API is listening on `http://localhost:3001`.

## Coding Style & Naming Conventions
- Use TypeScript with ES modules; favor functional React components and hooks.
- Follow the project’s 2-space indentation and single-quote preference observed in existing files.
- Name React files in `PascalCase` and hooks in `camelCase` prefixed with `use`; service modules mirror API route names.
- Prefer Tailwind utility classes for layout, reserving `src/index.css` for design tokens.

## Testing Guidelines
- Integration scripts under `test-*.js` rely on a running local server; document any new scripts alongside invocation steps.
- Name automated scripts with the `test-` prefix and describe their scope in a header comment.
- Keep Supabase migrations in sync when schema changes; validate downstream effects by hitting `/api/health` or the relevant route.
- For UI changes, capture before/after states via `manual-test.html` harnesses when possible.

## Commit & Pull Request Guidelines
- Follow the existing Conventional Commit style (`feat:`, `fix:`, `chore:`) with concise, imperative summaries.
- Reference relevant issues in the commit body and PR description; include reproduction steps or demo GIFs for UI updates.
- Ensure lint, type check, and critical integration scripts succeed before requesting review, and note any intentionally skipped tests.

## Environment & Configuration
- Store secrets in `.env.local` files excluded from version control; see `ENV_SETUP.md` for required keys.
- When adjusting third-party credentials (Supabase, OpenAI, Perplexity), update the matching docs in `API_FIX_SUMMARY.md` to keep agents aligned.
