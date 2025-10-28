# Frontend Streaming Flow

This document covers how the client requests, ingests, and renders streaming responses from the server.

## 1. Kicking off the stream
- Inside `handleSendMessage` (`src/pages/Home.tsx`), once the user message is saved, an empty assistant placeholder is inserted and `generateExperimentStream` is invoked with `{ prompt, conversation_id, message_id, model }`.
- `streamingMessageId` points to the live assistant bubble so the UI knows which message is streaming.
- `isSearchingGenerating` stays `true` until the first chunk arrives, allowing the “Searching & Generating…” indicator to show.
- Experiment turns immediately start polling Supabase for the pre-generated `experiment_id` so the CTA can appear as soon as the ID lands.

## 2. Reading SSE events
- Implemented in `src/lib/api.ts` using `fetch` + `ReadableStream.getReader()`.
- Maintains a `buffer`, splits on newlines, and inspects lines beginning with `data: `.
- Tries to `JSON.parse` each payload into `{ content: string }`; on failure, falls back to treating the line as plain text and logs the parse miss.
- Recognises the sentinel `data: [DONE]` to close the stream cleanly.

## 3. Applying streamed chunks
- The `onChunk` callback (inline within `handleSendMessage`) runs for each fragment:
  - Unsets the search indicator on the first chunk.
  - Concatenates the fragment onto `message.content` in state so the React tree re-renders live.
  - Restarts experiment-id polling unless the ID is already known or the turn is normal chat.
- After `[DONE]`, `streamingMessageId` is cleared, marking the assistant message as complete.

## 4. Rendering behaviour
- While streaming, the assistant bubble uses `whitespace-pre-wrap` and shows a pulsing cursor, so literal newline characters remain visible.
- Once the stream ends, assistant content is rendered through `ReactMarkdown` with `remark-gfm`, `remark-math`, `remark-breaks`, `rehype-raw`, and `rehype-katex`, preserving markdown formatting and math.
- If `experiment_id` is present and the turn isn’t mid-stream, a “View Interactive Demo” button appears.
- User messages render as plaintext with the same `pre-wrap` styling, keeping user-entered indentation intact.

## 5. Experiment ID synchronisation
- `pollExperimentIdDuringStream` fetches `/api/messages/conversations/:id/messages` up to five times (2-second interval) while streaming to detect when the ID lands in Supabase.
- Failing that, `pollExperimentIdAfterStream` continues up to ten attempts (1-second interval) post-stream, logging a warning if the ID never materialises.
- Pure chat turns skip polling entirely to avoid unnecessary network work.

## 6. Error propagation
- Network or fetch failures fall into the outer `try/catch`, which writes an apologetic assistant message so the user sees feedback.
- Backend SSE error payloads arrive as regular chunks and append to the assistant message because the parser fallback forwards raw strings unchanged.

For rendering verification steps, see [`streaming-render-check.md`](./streaming-render-check.md).***
