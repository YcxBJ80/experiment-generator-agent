# Frontend Streaming Reception & Rendering Audit

## Streaming Request Kickoff
- Triggered inside `handleSendMessage` (`src/pages/Home.tsx:311`).
- After posting the user's message and inserting an empty assistant placeholder, `generateExperimentStream` is invoked with `{ prompt, conversation_id, message_id, model }`.
- Records `streamingMessageId` to identify the live assistant bubble and flips `isSearchingGenerating` until the first delta arrives.
- New polling helpers run immediately for experiment turns to watch for the pre-generated `experiment_id` and attach it to the placeholder once Supabase reflects it.

## Low-Level SSE Consumption
- Implemented in `src/lib/api.ts:133-206`.
- Uses `fetch` + `ReadableStream.getReader()` to process the response incrementally.
- Maintains a `buffer`, splits by newline, and inspects lines starting with `data: `.
- Attempts to `JSON.parse` each payload into `{ content: string }`; on failure (the common path because the backend emits plain text) it logs the parse error and forwards the raw string via `onChunk`.
- Treats `data: [DONE]` as the terminator, then releases the reader lock.

## Applying Streamed Chunks
- `onChunk` callback (inline in `handleSendMessage`, `src/pages/Home.tsx:539-576`):
  - Clears the “Searching & Generating…” indicator after the first fragment.
  - Appends the incoming text onto `message.content` in state, ensuring the assistant bubble rerenders live.
  - Restarts the experiment-id polling guard on every chunk to catch IDs that appear mid-stream (polling short-circuits if already resolved or the turn is pure chat).

## Rendering Behavior
- While `streamingMessageId === message.id`, the UI shows the raw accumulating text with `whitespace-pre-wrap` and an animated cursor (`src/pages/Home.tsx:772-777`).
- Once streaming finishes (`streamingMessageId` cleared):
  - Assistant messages render through `ReactMarkdown` (`src/pages/Home.tsx:778-786`) using the configured remark/rehype plugins to format markdown, code fences, etc.
  - If an `experiment_id` exists, a “View Interactive Demo” CTA appears beneath the bubble (`src/pages/Home.tsx:804-813`).
- User messages always render as plaintext with preserved newlines.

## Newline & Indentation Handling
- **During streaming** the assistant bubble applies `white-space: pre-wrap`, so newline characters from the SSE payload become visible line breaks while still allowing soft wrapping, and leading spaces are preserved as long as they are not trimmed by JavaScript concatenation.
- **After streaming** the markdown pass uses `remarkBreaks`, converting single newlines into `<br />` elements so soft breaks remain visible, and `remarkGfm`/`rehypeRaw` to keep fenced code blocks (with their indentation) inside `<pre><code>` wrappers.
- User-entered messages render with the same `whitespace-pre-wrap` styling (see `src/pages/Home.tsx:793-799`), ensuring manual indentation and newlines typed by the user are maintained.
- The streaming client now treats every SSE `data:` frame as plain text (no JSON parsing) and reassembles multi-line payloads with `\n`, so indentation emitted by the backend arrives intact.
- Code snippets delivered via markdown continue to honor indentation because the default ReactMarkdown renderer wraps them in `<pre>` elements that preserve whitespace exactly.

## Experiment ID Synchronisation
- During streaming:
  - `pollExperimentIdDuringStream` hits `/api/messages/conversations/:id/messages` up to five times (2s interval) until the placeholder row exposes `experiment_id`.
  - Successful retrieval stamps the ID into the local assistant message and stops further polling.
- After streaming:
  - `pollExperimentIdAfterStream` retries up to 10 times (1s interval) if the ID never appeared mid-stream, warning in console when all attempts fail.
- Chat-style follow-up turns short-circuit the polling logic to avoid redundant API calls.

## Error Propagation
- If the streaming fetch rejects, the `try/catch` in `handleSendMessage` writes an apology message to the conversation history so users see a final response.
- Server-side SSE error payloads reach the UI as plain text chunks; they append into the assistant message bubble because the parser fallback forwards raw strings verbatim.
