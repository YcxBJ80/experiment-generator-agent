import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { perplexityMCPClient } from '../lib/perplexityMcpClient.js';
import { JavaScriptValidator } from '../lib/jsValidator.js';
import { DatabaseService, type Message as DbMessage } from '../lib/supabase.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { UserService } from '../services/userService.js';
import { extractExperimentHtml } from '../lib/htmlUtils.js';

// Ensure environment variables are loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const router = express.Router();

// Conversations endpoints (integrated into messages)
router.get('/conversations', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const conversations = await DatabaseService.getConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.post('/conversations', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { title } = req.body;
    const conversation = await DatabaseService.createConversation(title || 'New Conversation', userId);
    
    if (!conversation) {
      return res.status(500).json({ error: 'Failed to create conversation' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.put('/conversations/:id/title', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { title } = req.body;
    
    const success = await DatabaseService.updateConversationTitle(id, title, userId);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update conversation title' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation title:', error);
    res.status(500).json({ error: 'Failed to update conversation title' });
  }
});

router.delete('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const success = await DatabaseService.deleteConversation(id, userId);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete conversation' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Messages endpoints
router.get('/conversations/:conversationId/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { conversationId } = req.params;
    const messages = await DatabaseService.getMessages(conversationId, userId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/conversations/:conversationId/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { conversationId } = req.params;
    const messageData = {
      ...req.body,
      conversation_id: conversationId,
      user_id: userId
    };
    
    const message = await DatabaseService.createMessage(messageData);
    
    if (!message) {
      return res.status(500).json({ error: 'Failed to create message' });
    }
    
    res.json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

/**
 * Validate and clean JavaScript code, prevent HTML tags from mixing in
 */
function validateAndCleanJavaScript(jsCode: string): string {
  try {
    // Remove possible markdown code block markers
    let cleanedCode = jsCode.replace(/```javascript\s*/g, '').replace(/```js\s*/g, '').replace(/```\s*/g, '');
    
    // Remove real HTML tags (more precise matching)
    // Only match real HTML tags, such as <div>, <script>, </div> etc.
    cleanedCode = cleanedCode.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?\s*>/g, '');
    
    // Remove script tags and their content
    cleanedCode = cleanedCode.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Check if there are still suspicious HTML tag patterns (but keep comparison operators)
    const htmlTagPattern = /<\/?[a-zA-Z]/;
    if (htmlTagPattern.test(cleanedCode)) {
      console.warn('⚠️ Possible HTML tag residue detected in JavaScript code');
    }
    
    // Basic syntax check - check bracket matching
    const openBraces = (cleanedCode.match(/\{/g) || []).length;
    const closeBraces = (cleanedCode.match(/\}/g) || []).length;
    const openParens = (cleanedCode.match(/\(/g) || []).length;
    const closeParens = (cleanedCode.match(/\)/g) || []).length;
    
    if (openBraces !== closeBraces) {
      console.warn('⚠️ Curly braces do not match in JavaScript code');
    }
    
    if (openParens !== closeParens) {
      console.warn('⚠️ Parentheses do not match in JavaScript code');
    }
    
    return cleanedCode.trim();
  } catch (error) {
    console.error('JavaScript code validation failed:', error);
    return jsCode; // Return original code
  }
}

// OpenAI client configuration
let openai: OpenAI | null = null;

try {
  console.log('Checking environment variables:');
  console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  console.log('OPENAI_BASE_URL:', process.env.OPENAI_BASE_URL);
  
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
    });
    console.log('✅ OpenAI client initialized successfully');
  } else {
    console.warn('❌ OPENAI_API_KEY environment variable not set');
  }
} catch (error) {
  console.warn('❌ OpenAI client initialization failed:', error);
}

interface GenerateExperimentRequest {
  prompt: string;
  conversation_id?: string;
  model?: string;
}

type ChatHistoryMessage = { role: 'user' | 'assistant'; content: string };

function buildExperimentSystemPrompt(userPrompt: string, knowledge: string): string {
  return `You are an AI agent specialized in creating highly interactive and visually stunning HTML-based experiment demos with rich animations and dynamic visualizations.


You follow this pipeline for every request:

- Global formatting rules:
  * Present all narrative content using well-structured Markdown (headings, lists, tables, and code blocks where appropriate).
  * Typeset every mathematical expression using LaTeX syntax — use inline math with \`$ ... $\` and block math with \`$$ ... $$\` — so the client can render formulas in real time.
  * CRITICAL: All mathematical formulas MUST be wrapped in dollar signs. For example, write \`$F = BIL\\sin\\theta$\` instead of \`F=BILsinθ\`. Always use LaTeX commands like \\sin, \\cos, \\theta, \\alpha, etc. for mathematical functions and Greek letters.
  * Inside every LaTeX math expression, use only ASCII/English characters and symbols; never include Chinese or other non-Latin characters within the formula content.
  * When you need Greek letters or special symbols, always use LaTeX commands (for example \\alpha, \\Delta, \\varepsilon) instead of inserting Unicode characters directly.

1. Understand User Request
   - Carefully interpret the user's described experiment or concept.
   - Ask clarifying questions if needed to ensure full understanding of the user's goal, audience, and constraints.


2. Information Gathering via Perplexity MCP
   - Use the Perplexity MCP tools to find accurate and relevant information about the experiment.
   - Available Perplexity MCP tools:
     * search: Execute search queries on Perplexity.ai with brief/normal/detailed response types
     * get_documentation: Request documentation and examples for technologies/libraries
     * find_apis: Find and evaluate APIs based on requirements and context
     * check_deprecated_code: Analyze code snippets for deprecated features
     * extract_url_content: Extract main article content from URLs using browser automation
     * chat_perplexity: Maintain continuous conversation with Perplexity AI
   - Summarize key concepts, physical principles, equations, or historical background necessary for the demo.
   - Only use verified, factual information and cite Perplexity as the source.

3. Interactive HTML Demo Creation with Rich Animations
   - Generate a self-contained HTML file with embedded JavaScript and CSS as needed.
   - ANIMATION REQUIREMENTS (CRITICAL):
     * Include smooth, continuous animations that illustrate the core concepts
     * Add particle systems where relevant (e.g., air molecules for Bernoulli's principle, electrons for circuits, atoms for chemical reactions)
     * The components that are crucial for the demo should be is different color than the background (normally dark colors)
     * Use CSS animations, transitions, and JavaScript-driven animations extensively
     * Create visual feedback for all user interactions (hover effects, click animations, parameter changes)
     * Implement realistic physics simulations with proper timing and easing
     * Add visual indicators like trails, paths, force vectors, field lines, or wave propagations
     * Use color changes, size variations, and movement to show state changes
     * Include loading animations and smooth transitions between different states
   
   - SPECIFIC ANIMATION EXAMPLES TO IMPLEMENT:
     * For fluid dynamics: flowing particles, pressure visualization, streamlines
     * For mechanics: moving objects with trails, force vectors, energy transformations
     * For electricity: flowing electrons, field visualizations, sparks and glows
     * For chemistry: molecular movements, bond formations/breaking, reaction progress
     * For optics: light rays, wave propagations, interference patterns
     * For thermodynamics: particle motion speed changes, heat flow visualization
   
   - HTML LAYOUT REQUIREMENTS:
     * Use a two-column layout with flexbox or CSS Grid
     * LEFT SIDE (40-80% width, default 60-70%): Main demo visualization area
     * RIGHT SIDE (20-60% width, default 30-40%): Control panel with parameters, sliders, formulas, and background information
     * RESIZABLE LAYOUT: Add a draggable divider between left and right panels
       - Include a vertical divider bar (3-5px wide) between the two columns
       - Make the divider draggable with mouse cursor change on hover (cursor: col-resize)
       - Allow users to drag the divider to adjust column widths dynamically
       - Constrain left panel width to 40%-80% range, right panel adjusts accordingly (20%-60%)
       - Add visual feedback during dragging (highlight divider, show resize cursor)
       - Implement smooth transitions and prevent text selection during drag
       - Store the user's preferred layout ratio in localStorage for persistence
     * Ensure responsive design that adapts to different screen sizes
     * Use proper spacing and visual hierarchy between sections
   
   - INTERACTIVITY REQUIREMENTS:
     * RIGHT SIDE PANEL must include:
       - Parameter adjustment sliders with real-time value display
      - Mathematical formulas and equations related to the concept
      - Historical background and interesting facts
      - Real-time calculations and measurements display
      - Play/pause/reset controls for animations
      - Speed control for animations
      - Dedicated particle system controls, including a toggle that cleanly turns all particle effects on or off with instant visual feedback
      - Different viewing modes or simulation presets
     * LEFT SIDE DEMO must include:
       - Main visualization area with smooth animations
       - Hover effects that reveal additional information
       - Click-and-drag interactions where appropriate
       - Visual feedback for parameter changes
       - Clear labels and measurement indicators
   
   - VISUAL DESIGN REQUIREMENTS:
     * Use modern, clean design with subtle shadows and gradients
     * Implement responsive layouts that work on different screen sizes
     * Add visual depth with layered elements and proper z-indexing
     * Use consistent color schemes that enhance understanding
     * Include clear labels, legends, and measurement displays
   
   - The code should be clean, well-commented, and runnable as-is with no external dependencies.
   - Provide clear instructions for how to use the demo within the HTML.
   - CRITICAL JAVASCRIPT VARIABLE DECLARATION RULES:
     * ALL variables must be declared BEFORE they are used to prevent "ReferenceError: Cannot access before initialization"
     * Declare all global variables (like 'state', 'canvas', 'ctx') at the TOP of the script section
     * Ensure function definitions come BEFORE any function calls that use them
     * Use proper variable declaration order: const/let declarations → function definitions → initialization code → event listeners
     * Never reference variables in function calls before they are declared and initialized
     * Pay special attention to variables used in drawScene(), resizeCanvas(), and similar functions
   - IMPORTANT STYLING REQUIREMENTS:
     * ALL text content must use dark colors (e.g., #000000, #333333, #2d3748, #1a202c, or other dark shades)
     * ALL backgrounds must use light colors (e.g., #ffffff, #f7fafc, #edf2f7, #e2e8f0, or other light shades)
     * Ensure sufficient contrast between text and background for readability
     * Apply these color constraints to all elements including buttons, labels, headings, and body text
4. Output Format
   - First, present a short summary of the gathered information and the animations you will include.
   - Then, output the complete HTML code inside a fenced code block labeled with \`html\`.
   - Make sure the code is correct and free of syntax errors.

General Rules:
- Always aim for maximum visual impact and educational value through animations.
- Absolutely ensure the generated experiment runs without runtime errors—buggy code is unacceptable.
- Guarantee every visual and interactive element is positioned correctly and remains aligned throughout animations and layout changes.
- Prioritize smooth, realistic animations that enhance understanding.
- Keep accessibility and clear visualization in mind.
- Avoid unverified or unsafe algorithms/experiments.
- Use neutral and factual tone in summaries.
- If the request is vague, ask questions before starting.
- If something is physically dangerous, simulate it safely instead of providing real-life unsafe instructions.

User request: "${userPrompt}"

You have the following Perplexity knowledge available (already retrieved):
${knowledge}

Now produce the summary followed by a complete, standalone HTML document inside a fenced code block labeled html. Focus heavily on creating stunning animations and visual effects that make the concepts come alive. Do not include any external URLs or dependencies.`;
}

function buildChatSystemPrompt(perplexityKnowledge: string): string {
  return `You are a scientific conversation copilot who continues assisting after an interactive experiment demo has been generated. Use the conversation history that follows this system message to preserve context, reference earlier demos, and answer follow-up questions with precise, actionable guidance.

Perplexity MCP tools remain available whenever you need fresh, factual insights:
  * search: Execute search queries on Perplexity.ai with brief/normal/detailed response types
  * get_documentation: Request documentation and examples for technologies/libraries
  * find_apis: Find and evaluate APIs based on requirements and context
  * check_deprecated_code: Analyze code snippets for deprecated features
  * extract_url_content: Extract main article content from URLs using browser automation
  * chat_perplexity: Maintain continuous conversation with Perplexity AI

Call a tool only when it materially improves the answer, and cite Perplexity when you rely on its findings. Default to concise prose responses; supply focused code snippets or parameter changes when they help, but do not regenerate full HTML demos unless the user explicitly asks.

All mathematical expressions in your replies must use KaTeX-compatible syntax: wrap inline math in \`$...$\`, block-level equations in \`$$...$$\`, and avoid alternative formats. CRITICAL: Every formula must be wrapped in dollar signs. For example, write \`$F = BIL\\sin\\theta$\` NOT \`F=BILsinθ\`. Always use LaTeX commands like \\sin, \\cos, \\theta for functions and Greek letters.

You have the following Perplexity knowledge available (already retrieved):
${perplexityKnowledge}

Incorporate this context when it is relevant. If it is not applicable, acknowledge that and proceed with your best informed guidance.`;
}

function mapMessageToChatEntry(message: DbMessage): ChatHistoryMessage | null {
  const trimmedContent = (message.content || '').trim();

  if (!trimmedContent && !message.experiment_id) {
    return null;
  }

  if (message.type === 'assistant' && message.experiment_id) {
    const [summaryPart] = trimmedContent.split('```html');
    const summary = summaryPart?.trim();
    const fallbackSummary = summary && summary.length > 0
      ? summary
      : 'I previously generated an interactive HTML experiment demo for you.';
    return {
      role: 'assistant',
      content: `${fallbackSummary}\n\n[Experiment HTML omitted for brevity. Experiment ID: ${message.experiment_id}]`
    };
  }

  return {
    role: message.type,
    content: trimmedContent
  };
}

function buildChatHistory(messages: DbMessage[], placeholderId?: string): ChatHistoryMessage[] {
  return messages
    .filter(msg => !msg.is_conversation_root)
    .filter(msg => msg.id !== placeholderId)
    .map(mapMessageToChatEntry)
    .filter((entry): entry is ChatHistoryMessage => Boolean(entry));
}

/**
 * Generate experiment demo with streaming
 */
router.post('/generate-stream', requireAuth, async (req: AuthenticatedRequest, res: ExpressResponse) => {
  console.log('🔥 Stream endpoint called!');
  console.log('Request body:', req.body);
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get user's access_type to determine if they can generate experiments
    const userProfile = await UserService.findById(userId);
    const isApiUser = userProfile?.access_type === 'api';
    console.log('👤 User access_type:', userProfile?.access_type, '| API user:', isApiUser);

    const { prompt, conversation_id, message_id, model }: GenerateExperimentRequest & { message_id?: string } = req.body;
    
    const selectedModel = model || 'openai/gpt-5';

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Please provide experiment requirement description'
      });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    let chatHistory: ChatHistoryMessage[] = [];
    let experimentId: string | null = null;

    const sendSSEEvent = (payload: string) => {
      const lines = payload.split(/\r?\n/);
      for (const line of lines) {
        res.write(`data: ${line}\n`);
      }
      res.write('\n');
    };

    if (conversation_id) {
      try {
        const conversationMessages = await DatabaseService.getMessages(conversation_id, userId);
        chatHistory = buildChatHistory(conversationMessages, message_id);
      } catch (historyError) {
        console.error('Failed to load conversation history:', historyError);
        chatHistory = [];
      }
    }

    const isFirstTurn = chatHistory.length <= 1;
    // API users always use chat mode, software users use experiment mode on first turn
    const mode: 'experiment' | 'chat' = isApiUser ? 'chat' : (isFirstTurn ? 'experiment' : 'chat');
    console.log('Conversation history length:', chatHistory.length, 'isFirstTurn:', isFirstTurn, 'isApiUser:', isApiUser, 'mode:', mode);

    if (mode === 'experiment') {
      if (!message_id) {
        console.error('❌ Missing message_id, cannot assign experiment_id before streaming');
        sendSSEEvent('Failed to prepare experiment response: missing message identifier.');
        sendSSEEvent('[DONE]');
        res.end();
        return;
      }

      try {
        experimentId = randomUUID();
        const updated = await DatabaseService.updateMessage(
          message_id,
          {
            experiment_id: experimentId
          },
          userId
        );

        if (!updated) {
          throw new Error('Database update returned null');
        }

        console.log('✅ Experiment ID generated before streaming:', experimentId);
      } catch (idError) {
        console.error('❌ Failed to generate or persist experiment_id:', idError);
        sendSSEEvent('Failed to prepare experiment response. Please try again later.');
        sendSSEEvent('[DONE]');
        res.end();
        return;
      }
    }

    console.log('Getting Perplexity knowledge...');
    const perplexityKnowledge = await perplexityMCPClient.getExperimentKnowledge(prompt);
    console.log('Perplexity knowledge retrieval completed');
    console.log(`🧭 Conversation mode for this request: ${mode}`);

    const systemPrompt = mode === 'experiment'
      ? buildExperimentSystemPrompt(prompt, perplexityKnowledge)
      : buildChatSystemPrompt(perplexityKnowledge);

    let openAIMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;

    if (mode === 'experiment') {
      openAIMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ];
    } else {
      openAIMessages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory
      ];

      if (!chatHistory.length || chatHistory[chatHistory.length - 1].role !== 'user') {
        openAIMessages.push({ role: 'user', content: prompt });
      }
    }

    console.log('🔍 Checking openai client status:', !!openai);
    if (openai) {
      try {
        console.log('🚀 Starting streaming OpenAI API call...');
        console.log('Model:', selectedModel);
        console.log('Payload message count:', openAIMessages.length);
        
        const stream = await openai.chat.completions.create({
          model: selectedModel,
          messages: openAIMessages,
          temperature: 0.7,
          max_tokens: 40000,
          stream: true
        });

        let fullContent = '';
        let chunkCount = 0;
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            chunkCount++;
            
            sendSSEEvent(content);

            if (chunkCount % 10 === 0) {
              console.log(`📦 Sent ${chunkCount} chunks, current length: ${fullContent.length}`);
            }
          }
        }
        
        sendSSEEvent('[DONE]');
        res.end();
        
        console.log('✅ Streaming response completed, total chunks:', chunkCount, 'total length:', fullContent.length);
        
        if (message_id && fullContent) {
          if (mode === 'experiment') {
            try {
              console.log('🔧 Processing experiment output and updating message...');
              const { html: extractedHtml, title: extractedTitle } = extractExperimentHtml(fullContent);
              const resolvedExperimentId = experimentId ?? randomUUID();
              if (!experimentId) {
                console.warn('⚠️ Experiment ID was not set before streaming; generated fallback ID:', resolvedExperimentId);
              }

              const updatePayload: Record<string, unknown> = {
                content: fullContent,
                experiment_id: resolvedExperimentId
              };

              if (extractedHtml) {
                updatePayload.html_content = extractedHtml;
              }

              await DatabaseService.updateMessage(
                message_id,
                updatePayload,
                userId
              );

              if (extractedHtml) {
                console.log(
                  '✅ Message updated with experiment_id:',
                  resolvedExperimentId,
                  'Title:',
                  extractedTitle || 'Experiment Demo'
                );
              } else {
                console.warn('⚠️ Experiment response did not include an extractable HTML block');
              }
            } catch (error) {
              console.error('❌ Error processing experiment data or updating message:', error);
            }
          } else {
            try {
              await DatabaseService.updateMessage(
                message_id,
                {
                  content: fullContent.trim()
                },
                userId
              );
              console.log('✅ Chat response stored for message:', message_id);
            } catch (error) {
              console.error('❌ Failed to persist chat response:', error);
            }
          }
        } else {
          console.warn('⚠️ Missing fullContent or message_id, skipping message update');
        }
        
      } catch (error) {
        console.error('OpenAI API call failed:', error);
        sendSSEEvent(`❌ Error occurred while generating response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        sendSSEEvent('[DONE]');
        res.end();
      }
    } else {
      sendSSEEvent('❌ OpenAI client not initialized');
      sendSSEEvent('[DONE]');
      res.end();
    }
    
  } catch (error) {
    console.error('Response generation failed:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Response generation failed'
      });
    }
  }
});

/**
 * Create message
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: ExpressResponse) => {
  try {
    const { conversation_id, content, type, experiment_id, html_content, css_content, js_content } = req.body;
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log(`📝 Creating message, conversation ID: ${conversation_id}, type: ${type}`);
    
    if (!conversation_id || type === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: conversation_id, type'
      });
    }

    // User messages must always include content
    if (type === 'user' && !content) {
      return res.status(400).json({
        success: false,
        error: 'User message content cannot be empty'
      });
    }

    if (!['user', 'assistant'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'type must be user or assistant'
      });
    }

    // Persist the message
    const message = await DatabaseService.createMessage({
      conversation_id,
      content,
      type,
      experiment_id: experiment_id || null,
      html_content: html_content || null,
      css_content: css_content || null,
      js_content: js_content || null,
      user_id: userId
    });

    if (!message) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create message'
      });
    }

    console.log(`✅ Message created successfully, ID: ${message.id}`);
    
    res.json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Failed to create message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create message'
    });
  }
});

/**
 * Update message
 */
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    console.log(`📝 Updating message, ID: ${id}`);
    console.log('Update content:', updates);
    
    const updatedMessage = await DatabaseService.updateMessage(id, updates, userId);
    
    if (!updatedMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message does not exist or update failed'
      });
    }

    console.log(`✅ Message updated successfully, ID: ${id}`);
    
    res.json({
      success: true,
      data: updatedMessage
    });

  } catch (error) {
    console.error('Failed to update message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update message'
    });
  }
});

/**
 * Get experiment details
 */
router.get('/:id', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Getting experiment details, ID: ${id}`);
    
    // Retrieve experiment data from the database
    const experiment = await DatabaseService.getExperimentById(id);
    
    if (!experiment) {
      console.log(`❌ Experiment not found, ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Experiment does not exist'
      });
    }

    console.log(`✅ Found experiment, ID: ${id}`);
    
    // Return the experiment payload
    res.json({
      success: true,
      data: {
        experiment_id: experiment.id,
        title: experiment.title || 'Experiment Demo',
        html_content: experiment.html_content || '',
        css_content: '', // Extract from html_content or leave empty
        js_content: ''   // Extract from html_content or leave empty
      }
    });

  } catch (error) {
    console.error('Failed to get experiment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get experiment'
    });
  }
});

export default router;
