# Streaming Pipeline

## Backend highlights
- Endpoint: `POST /api/messages/generate-stream`
- Generates an `experiment_id` before streaming experiment turns.
- Streams OpenRouter deltas as SSE `data:` frames, finishing with `[DONE]`.
- Persists the final assistant message and experiment metadata in Supabase.

Full write-up: [`docs/guides/streaming-backend.md`](../guides/streaming-backend.md)

## Frontend highlights
- `handleSendMessage` kicks off `generateExperimentStream`.
- Uses `ReadableStream.getReader()` to parse SSE lines, forwarding chunks into React state.
- Renders streaming text with `white-space: pre-wrap`, then hands the final content to `ReactMarkdown`.
- Polls for `experiment_id` updates so the “View Interactive Demo” CTA appears automatically.

Full write-up: [`docs/guides/streaming-frontend.md`](../guides/streaming-frontend.md)

## Validation checklist
- Run `npm run dev`, trigger a generation, confirm newlines display while streaming.
- Check that math markup renders correctly and persists after refresh.
- See [`docs/guides/streaming-render-check.md`](../guides/streaming-render-check.md) for the full test list.***
