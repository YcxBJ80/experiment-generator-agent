# Backend Streaming Flow

This audit explains how `/api/messages/generate-stream` delivers Server-Sent Events (SSE) and persists results.

## 1. Entry point & mode selection
- Route: `server/routes/messages.ts`, handler for `POST /api/messages/generate-stream`.
- Validates the `prompt` and short-circuits with `400` JSON on missing input.
- Loads prior history via `DatabaseService.getMessages` + `buildChatHistory`, then decides whether to run **experiment mode** or **chat mode** (experiment mode when the conversation only has root turns).

## 2. Experiment ID provisioning
- Experiment turns require a `message_id` before streaming.
- Generates `experimentId = randomUUID()` and writes it to the placeholder assistant message with `DatabaseService.updateMessage`.
- If persistence fails, the handler emits a fatal SSE event (`data: Failed to prepare...`) followed by `[DONE]`, and exits before calling OpenRouter.

## 3. OpenRouter streaming loop
- Invokes `openai.chat.completions.create({ stream: true, ...payload })`.
- For each streamed `delta`:
  - Reads `chunk.choices?.[0]?.delta?.content`.
  - Appends to `fullContent`, increments `chunkCount`, and sends `res.write(\`data: ${content}\n\n\`)`.
  - Logs every tenth chunk for visibility.
- On completion:
  - Pushes a sentinel `data: [DONE]\n\n`.
  - Ends the response and logs total chunk count and byte length.

## 4. Persisting the final assistant message
- When streaming finishes and a `message_id` exists:
  - **Experiment mode**
    - Extracts the first fenced ```html``` block and trims it.
    - Derives a fallback title if the block contains `<title>`.
    - Ensures the pre-generated `experimentId` remains; if not, generates a new one and logs a warning.
    - Updates Supabase with `content`, `experiment_id`, and `html_content`.
  - **Chat mode**
    - Persists the trimmed `fullContent` string.
- Missing HTML simply results in storing the textual content; the experiment metadata stays empty.

## 5. Error handling
- **OpenRouter failure:** logs the stack, streams an SSE payload describing the error (with a leading emoji), and terminates with `[DONE]`.
- **Missing OpenAI client:** immediately emits `data: ❌ OpenAI client not initialized\n\n` and `[DONE]`.
- **Unexpected exception:** falls back to a JSON `500` response outside the SSE flow.

## 6. Non-stream fallback
- The `/api/messages/generate` fallback path now also pre-generates an `experiment_id` before requesting generation, aborting early if the ID cannot be created.

Keep this document updated when the streaming handler changes so that client engineers and SREs can reason about data flow quickly.***
