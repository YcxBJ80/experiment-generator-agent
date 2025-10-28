# Streaming Output Rendering Check

## Context
- **Environment examined:** React client consuming the Express SSE endpoint (`/api/messages/generate-stream`). This matches the “Web Frontend SSE” case from the provided troubleshooting guide.
- **Symptom reported:** streamed assistant text collapsed into a single line until the page refreshes.

## Findings
1. **Server-side streaming format**
   - Previously each OpenAI chunk was written with `res.write(\`data: ${content}\n\n\`)`.
   - If `content` contained `\n`, the SSE frame broke into extra lines lacking the `data:` prefix, so the client discarded them.
2. **Client-side parsing**
   - The reader split the response on `\n` and only processed lines starting with `data: `, so newline segments were dropped before they reached the UI.
3. **UI rendering**
   - While a chunk was streaming, we showed `message.content` inside a `whitespace-pre-wrap` container, so once the newline survived transport it would appear immediately.

## Fixes Applied
- **SSE payload encoding:** server now serializes each chunk as JSON (`data: {"content":"..."}\n\n`), guaranteeing that literal `\n` is preserved within the payload.
- **Client decoding:** `generateExperimentStream` parses the JSON and appends `parsed.content`, falling back gracefully if parsing fails.
- **Streaming preview:** unchanged—assistant bubbles still show the live buffer with `whitespace-pre-wrap`, while finalised messages re-render through `ReactMarkdown` (`remark-gfm`, `remark-math`, `remark-breaks`, `rehype-katex`, `rehype-raw`).

## Validation Steps
1. Run `npm run dev` and open the client.
2. Trigger a generation and watch the assistant bubble: line breaks appear while the response streams (no refresh required).
3. Confirm that inline `$a^2$` and block `$$E=mc^2$$` math render immediately once the chunk with LaTeX arrives.
4. Refresh the page to ensure the persisted conversation still renders with Markdown/LaTeX formatting (database-stored content remains intact).

These checks correspond to the troubleshooting guidance for the **Web Frontend SSE** scenario: the frontend now appends `textContent`-equivalent data (via React state) and the backend sends well-formed SSE frames so newline and indentation are honoured.
