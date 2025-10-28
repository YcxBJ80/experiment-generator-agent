# Streaming Output Rendering Checklist

Use this checklist when validating newline handling and markdown rendering across the streaming stack.

## Context
- **Environment tested:** React client consuming the Express SSE endpoint (`/api/messages/generate-stream`). This matches the *Web Frontend SSE* scenario from the streaming troubleshooting guide.
- **Reported symptom:** streamed assistant text collapsed into a single line until the page refreshed.

## What changed
1. **SSE payload encoding** – the backend serialises each chunk as JSON (`data: {"content":"..."}`), keeping newline characters inside the payload rather than breaking the SSE frame.
2. **Client decoding** – `generateExperimentStream` parses JSON when available and falls back to raw text if parsing fails, so no newline data is lost.
3. **Live preview styling** – the streaming assistant bubble retains `white-space: pre-wrap`, and the final markdown render uses `remark-breaks`, `remark-gfm`, and `rehype-raw/katex` to preserve formatting.

## Validation steps
1. Run `npm run dev` (or `pnpm dev`) and open the client.
2. Trigger a generation and confirm line breaks appear in the assistant bubble while the response streams—no refresh required.
3. Ensure inline math (`$a^2$`) and block math (`$$E=mc^2$$`) render immediately once their chunks arrive.
4. Refresh the page; previously streamed content should retain formatting after hydration.

If these steps pass, the streaming pipeline preserves whitespace end-to-end.***
