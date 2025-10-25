# Backend Streaming Flow Audit

## Entry Point & Mode Selection
- Request handler: `api/routes/messages.ts:377` (`POST /api/messages/generate-stream`).
- Validates `prompt`; returns `400` JSON error early if missing.
- Loads prior conversation history via `DatabaseService.getMessages` and `buildChatHistory` to decide mode (`experiment` vs `chat`) based on whether the prior turn count is `<= 1`.

## Experiment ID Provisioning
- On experiment turns the server now requires `message_id` before streaming.
- Generates `experimentId = randomUUID()` and persists it to the placeholder assistant message (`DatabaseService.updateMessage`) before any OpenRouter traffic.
- If persistence fails it emits a terminal SSE message (`data: Failed to prepare…`) followed by `[DONE]`, then closes the stream to avoid an OpenRouter call.

## OpenRouter Streaming Loop
- Calls `openai.chat.completions.create({ stream: true })` with the composed payload (`api/routes/messages.ts:480`).
- For each streamed delta:
  - Reads `chunk.choices?.[0]?.delta?.content`.
  - Appends to `fullContent` and increments `chunkCount`.
  - Emits the raw fragment through Server-Sent Events: `res.write(\`data: ${content}\n\n\`)`.
  - Logs every 10th chunk for observability.
- When the provider finishes:
  - Sends `data: [DONE]\n\n`.
  - Ends the response and logs total chunk count and length.

## Persisting the Final Message
- After completion, if `message_id` exists:
  - **Experiment mode**
    - Extracts the first ```html``` fenced block, trims it, and derives a title if present.
    - Reuses the pre-generated `experimentId`; if it somehow vanished, falls back to a fresh UUID and logs a warning.
    - Writes `content`, `experiment_id`, and `html_content` back to Supabase.
  - **Chat mode**
    - Stores the trimmed `fullContent` string.
- If no HTML block is found, it still stores `content` without HTML metadata.

## Failure Paths
- **OpenRouter error:** catches, logs the stack, sends a user-visible SSE payload containing the error message (note: the payload includes an empty `data:` line followed by the emoji text) and terminates with `[DONE]`.
- **Missing OpenAI client:** immediately responds with `data: ❌ OpenAI client not initialized` then `[DONE]`.
- **Unexpected outer error:** falls back to standard JSON `500`.

## Non-Streaming Endpoint Notes
- The legacy `/api/messages/generate-stream` (non-streaming fallback at `api/routes/messages.ts:582`) now also generates an `experiment_id` *before* requesting generation so that failure to create the ID aborts early.
