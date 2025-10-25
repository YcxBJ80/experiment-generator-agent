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

// Ensure environment variables are loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const router = express.Router();

// Conversations endpoints (integrated into messages)
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await DatabaseService.getConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.post('/conversations', async (req, res) => {
  try {
    const { title } = req.body;
    const conversation = await DatabaseService.createConversation(title || 'New Conversation');
    
    if (!conversation) {
      return res.status(500).json({ error: 'Failed to create conversation' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.put('/conversations/:id/title', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    const success = await DatabaseService.updateConversationTitle(id, title);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update conversation title' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation title:', error);
    res.status(500).json({ error: 'Failed to update conversation title' });
  }
});

router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await DatabaseService.deleteConversation(id);
    
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
router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await DatabaseService.getMessages(conversationId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messageData = {
      ...req.body,
      conversation_id: conversationId
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

interface GenerateExperimentResponse {
  experiment_id: string;
  title: string;
  description: string;
  html_content: string;
  css_content: string;
  js_content: string;
  parameters: Array<{
    name: string;
    type: string;
    min?: number;
    max?: number;
    default: any;
    description: string;
  }>;
  status: string;
}

type ChatHistoryMessage = { role: 'user' | 'assistant'; content: string };

function buildExperimentSystemPrompt(userPrompt: string, knowledge: string): string {
  return `You are an AI agent specialized in creating highly interactive and visually stunning HTML-based experiment demos with rich animations and dynamic visualizations.


You follow this pipeline for every request:


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
router.post('/generate-stream', async (req: ExpressRequest, res: ExpressResponse) => {
  console.log('🔥 Stream endpoint called!');
  console.log('Request body:', req.body);
  try {
    const { prompt, conversation_id, message_id, model }: GenerateExperimentRequest & { message_id?: string } = req.body;
    
    const selectedModel = model || 'openrouter/andromeda-alpha';

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

    if (conversation_id) {
      try {
        const conversationMessages = await DatabaseService.getMessages(conversation_id);
        chatHistory = buildChatHistory(conversationMessages, message_id);
      } catch (historyError) {
        console.error('Failed to load conversation history:', historyError);
        chatHistory = [];
      }
    }

    const isFirstTurn = chatHistory.length <= 1;
    console.log('Conversation history length:', chatHistory.length, 'isFirstTurn:', isFirstTurn);

    console.log('Getting Perplexity knowledge...');
    const perplexityKnowledge = await perplexityMCPClient.getExperimentKnowledge(prompt);
    console.log('Perplexity knowledge retrieval completed');

    const mode: 'experiment' | 'chat' = isFirstTurn ? 'experiment' : 'chat';
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
        let experimentId: string | null = null;
        let hasUpdatedExperimentId = false;
        
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            chunkCount++;
            
            res.write(`data: ${content}\n\n`);
            
            if (mode === 'experiment' && message_id && !hasUpdatedExperimentId && fullContent.includes('```html')) {
              try {
                experimentId = randomUUID();
                console.log('🔧 HTML code block detected, setting experiment_id immediately:', experimentId);
                
                await DatabaseService.updateMessage(message_id, {
                  experiment_id: experimentId
                });
                
                hasUpdatedExperimentId = true;
                console.log('✅ experiment_id stored early for streaming message');
              } catch (updateError) {
                console.error('❌ Failed to set experiment_id during stream:', updateError);
              }
            }

            if (chunkCount % 10 === 0) {
              console.log(`📦 Sent ${chunkCount} chunks, current length: ${fullContent.length}`);
            }
          }
        }
        
        res.write('data: [DONE]\n\n');
        res.end();
        
        console.log('✅ Streaming response completed, total chunks:', chunkCount, 'total length:', fullContent.length);
        
        if (message_id && fullContent) {
          if (mode === 'experiment') {
            try {
              console.log('🔧 Processing experiment output and updating message...');
              
              const htmlMatch = fullContent.match(/```html\s*([\s\S]*?)\s*```/);
              if (htmlMatch) {
                const htmlContent = htmlMatch[1].trim();
                const resolvedExperimentId = experimentId || randomUUID();
                
                const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
                const title = titleMatch ? titleMatch[1] : 'Experiment Demo';
                
                await DatabaseService.updateMessage(message_id, {
                  content: fullContent,
                  experiment_id: resolvedExperimentId,
                  html_content: htmlContent
                });
                
                console.log('✅ Message updated with experiment_id:', resolvedExperimentId, 'Title:', title);
              } else {
                console.warn('⚠️ Failed to extract HTML code block from generated content');
                await DatabaseService.updateMessage(message_id, {
                  content: fullContent
                });
              }
            } catch (error) {
              console.error('❌ Error processing experiment data or updating message:', error);
            }
          } else {
            try {
              await DatabaseService.updateMessage(message_id, {
                content: fullContent.trim()
              });
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
        res.write(`data: \n\n❌ Error occurred while generating response: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } else {
      res.write('data: \n\n❌ OpenAI client not initialized\n\n');
      res.write('data: [DONE]\n\n');
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
 * 生成实验demo（非流式，保留兼容性）
 */
router.post('/generate-stream', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { prompt, conversation_id, model }: GenerateExperimentRequest = req.body;
    
    // Set default model if not provided
    const selectedModel = model || 'openrouter/andromeda-alpha';

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Please provide experiment requirement description'
      });
    }

    // 首先通过Perplexity MCP获取相关知识
    console.log('Getting Perplexity knowledge...');
    const perplexityKnowledge = await perplexityMCPClient.getExperimentKnowledge(prompt);
    console.log('Perplexity knowledge retrieval completed');

    let attempts = 0;

    // 构建新的系统提示词（要求输出概述 + `html` 代码块的完整HTML文档）
    const systemPrompt = `You are an AI agent specialized in creating highly interactive and visually stunning HTML-based experiment demos with rich animations and dynamic visualizations.

You follow this pipeline for every request:

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
     * RESIZABLE LAYOUT: Add a draggable divider between left and right panels:
       - Divider should be 3-5px wide with a subtle background color
       - Show 'col-resize' cursor on hover
       - Allow users to drag to adjust panel widths dynamically
       - Constrain left panel width to 40-80% range
       - Provide visual feedback during dragging (e.g., highlight divider)
       - Include smooth transitions when releasing the drag
       - Persist the layout ratio in localStorage for user preference
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
- Prioritize smooth, realistic animations that enhance understanding.
- Keep accessibility and clear visualization in mind.
- Avoid unverified or unsafe algorithms/experiments.
- Use neutral and factual tone in summaries.
- If the request is vague, ask questions before starting.
- If something is physically dangerous, simulate it safely instead of providing real-life unsafe instructions.

User request: "${prompt}"

You have the following Perplexity knowledge available (already retrieved):
${perplexityKnowledge}

Now produce the summary followed by a complete, standalone HTML document inside a fenced code block labeled html. Focus heavily on creating stunning animations and visual effects that make the concepts come alive. Do not include any external URLs or dependencies.`;

    let experimentData;

    // 调用OpenAI API生成实验
    console.log('🔍 检查openai客户端状态:', !!openai);
    if (openai) {
        try {
          const maxAttempts = 3;
        
        while (attempts < maxAttempts && !experimentData) {
          attempts++;
          console.log(`🚀 Attempt ${attempts} to call OpenAI API...`);
          console.log('Model:', selectedModel);
          console.log('Prompt length:', prompt.length);
          
          const response = await openai.chat.completions.create({
          model: selectedModel,
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 40000
          });

          const responseContent = response.choices[0]?.message?.content;
          console.log('OpenAI response length:', responseContent?.length);
          console.log('First 500 characters of OpenAI response:', responseContent?.substring(0, 500));
          
          if (responseContent) {
            try {
              // 优先解析新的输出格式：摘要 + ```html 代码块
              const htmlCodeBlockMatch = responseContent.match(/```html\s*([\s\S]*?)\s*```/i);
              const htmlFromBlock = htmlCodeBlockMatch ? htmlCodeBlockMatch[1].trim() : null;
              let summaryText = '';
              if (htmlFromBlock) {
                // 摘要为代码块之前的文本
                const idx = responseContent.indexOf(htmlCodeBlockMatch[0]);
                summaryText = idx > 0 ? responseContent.slice(0, idx).trim() : '';
              }

              // 如果没有找到```html代码块，尝试直接匹配<html>...</html>
              const htmlTagMatch = htmlFromBlock ? null : responseContent.match(/<html[\s\S]*<\/html>/i);
              const htmlRaw = htmlFromBlock || (htmlTagMatch ? htmlTagMatch[0] : null);

              let rawData;
              if (htmlRaw) {
                // 从完整HTML中提取title、body、style、script
                const titleMatch = htmlRaw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                const bodyMatch = htmlRaw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

                const styleMatches = [...htmlRaw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
                const scriptMatches = [...htmlRaw.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];

                const cssContent = styleMatches.map(m => m[1].trim()).join('\n\n');
                const jsContent = scriptMatches.map(m => m[1].trim()).join('\n\n');
                const htmlContent = bodyMatch ? bodyMatch[1].trim() : htmlRaw
                  .replace(/<!DOCTYPE[\s\S]*?>/i, '')
                  .replace(/<head[\s\S]*?<\/head>/i, '')
                  .replace(/<style[\s\S]*?<\/style>/gi, '')
                  .replace(/<script[\s\S]*?<\/script>/gi, '')
                  .replace(/<\/?html[^>]*>/gi, '')
                  .replace(/<\/?body[^>]*>/gi, '')
                  .trim();

                rawData = {
                  title: (titleMatch ? titleMatch[1].trim() : `${prompt}演示`),
                  description: summaryText || `基于"${prompt}"的交互式实验演示（信息来源：Perplexity）`,
                  html_content: htmlContent,
                  css_content: cssContent,
                  js_content: jsContent,
                  parameters: []
                };
              } else {
                // 回退到旧的JSON解析逻辑
                let jsonStr = responseContent.trim();
                const jsonBlockMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonBlockMatch) {
                  jsonStr = jsonBlockMatch[1].trim();
                } else {
                  const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    jsonStr = jsonMatch[0];
                  }
                }

                console.log('Extracted JSON string length:', jsonStr.length);
                console.log('First 200 characters of cleaned JSON:', jsonStr.substring(0, 200));

                try {
                  rawData = JSON.parse(jsonStr);
                } catch (firstParseError) {
                  console.warn('First JSON parse failed, trying to fix format:', firstParseError.message);
                  try {
                    let cleanedStr = jsonStr
                      .replace(/,\s*}/g, '}')
                      .replace(/,\s*]/g, ']')
                      .replace(/([{,]\s*)(\w+):/g, '$1"$2":');
                    rawData = JSON.parse(cleanedStr);
                  } catch (secondParseError) {
                    console.warn('Second JSON parse also failed, trying manual field extraction:', secondParseError.message);
                    const titleMatch2 = jsonStr.match(/"title"\s*:\s*"([^"]+)"/);
                    const descMatch2 = jsonStr.match(/"description"\s*:\s*"([^"]+)"/);
                    const htmlMatch2 = jsonStr.match(/"html_content"\s*:\s*"([\s\S]*?)"\s*,\s*"css_content"/);
                    const cssMatch2 = jsonStr.match(/"css_content"\s*:\s*"([\s\S]*?)"\s*,\s*"js_content"/);
                    const jsMatch2 = jsonStr.match(/"js_content"\s*:\s*"([\s\S]*?)"\s*[,}]/);
                    if (titleMatch2 && descMatch2) {
                      rawData = {
                        title: titleMatch2[1],
                        description: descMatch2[1],
                        html_content: htmlMatch2 ? htmlMatch2[1].replace(/\\"/g, '"') : '',
                        css_content: cssMatch2 ? cssMatch2[1].replace(/\\"/g, '"') : '',
                        js_content: jsMatch2 ? jsMatch2[1].replace(/\\"/g, '"') : '',
                        parameters: []
                      };
                      console.log('✅ Manual field extraction successful');
                    } else {
                      throw new Error('Unable to extract necessary fields');
                    }
                  }
                }
              }
              
              // 验证和清理JavaScript代码
              if (rawData.js_content) {
                rawData.js_content = validateAndCleanJavaScript(rawData.js_content);
                
                // 使用新的语法检查器
                const validationResult = JavaScriptValidator.validateSyntax(rawData.js_content);
                
                if (!validationResult.isValid) {
                  console.log(`Code generated in attempt ${attempts} has syntax errors:`, validationResult.errors);
                  
                  if (attempts < maxAttempts) {
                    // 生成修复提示词
                    const fixPrompt = JavaScriptValidator.generateFixPrompt(rawData.js_content, validationResult);
                    
                    console.log('Trying to have model fix syntax errors...');
                    const fixCompletion = await openai.chat.completions.create({
                      model: selectedModel,
                      messages: [
                        { role: 'system', content: '你是一个JavaScript代码修复专家。请修复提供的代码中的语法错误。' },
                        { role: 'user', content: fixPrompt }
                      ],
                      temperature: 0.3,
                      max_tokens: 40000
                    });
                    
                    const fixedResponse = fixCompletion.choices[0]?.message?.content;
                    if (fixedResponse) {
                      // 提取修复后的JavaScript代码
                      const codeMatch = fixedResponse.match(/```(?:javascript)?\n([\s\S]*?)\n```/);
                      if (codeMatch) {
                        rawData.js_content = codeMatch[1].trim();
                        
                        // 再次验证修复后的代码
                        const revalidationResult = JavaScriptValidator.validateSyntax(rawData.js_content);
                        if (revalidationResult.isValid) {
                          console.log('Code fix successful!');
                          experimentData = rawData;
                        } else {
                          console.log('Code fix failed, still has errors:', revalidationResult.errors);
                          // 如果修复失败，使用自动修复的代码
                          if (revalidationResult.fixedCode) {
                            rawData.js_content = revalidationResult.fixedCode;
                            experimentData = rawData;
                            console.log('Using auto-fixed code');
                          }
                        }
                      }
                    }
                  } else {
                    // 最后一次尝试，使用自动修复
                    if (validationResult.fixedCode) {
                      rawData.js_content = validationResult.fixedCode;
                      experimentData = rawData;
                      console.log('Using auto-fixed code as final result');
                    } else {
                      throw new Error(`Generated JavaScript code has unfixable syntax errors: ${validationResult.errors.join(', ')}`);
                    }
                  }
                } else {
                  console.log('Code syntax check passed!');
                  experimentData = rawData;
                }
              } else {
                experimentData = rawData;
              }
              
              console.log('✅ JSON解析成功');
            } catch (parseError) {
              console.warn('❌ JSON parsing failed:', parseError.message);
              console.warn('First 1000 characters of raw response:', responseContent.substring(0, 1000));
              if (attempts >= maxAttempts) {
                experimentData = null;
              }
            }
          }
        }
      } catch (apiError) {
        console.error('🔍 Entering API error handling code block');
        console.error('❌ OpenAI API call failed:');
        console.error('Error type:', apiError.constructor.name);
        console.error('Error message:', apiError.message);
        console.error('Error details:', apiError);
        
        // 如果是HTTP错误，尝试获取更多信息
        if (apiError.response) {
          console.error('HTTP status code:', apiError.response.status);
          console.error('HTTP status text:', apiError.response.statusText);
          console.error('Response headers:', apiError.response.headers);
          try {
            const errorBody = await apiError.response.text();
            console.error('Error response body:', errorBody);
          } catch (e) {
            console.error('Unable to read error response body');
          }
        }
        
        experimentData = null;
      }
    } else {
      console.warn('OpenAI client not initialized');
      experimentData = null;
    }

    // 如果没有OpenAI数据，直接返回错误
    if (!experimentData) {
      console.log('❌ Experiment generation failed: OpenAI API call failed and no backup data');
      return res.status(500).json({
        success: false,
        error: 'OpenAI API call failed, unable to generate experiment. Please check API configuration or try again later.'
      });
    }

    // 生成实验ID
    const experiment_id = randomUUID();

    const response: GenerateExperimentResponse = {
      experiment_id,
      title: experimentData.title || `${prompt}演示`,
      description: experimentData.description || `基于"${prompt}"的交互式实验演示`,
      html_content: experimentData.html_content || '',
      css_content: experimentData.css_content || '',
      js_content: experimentData.js_content || '',
      parameters: experimentData.parameters || [],
      status: 'success'
    };

    res.json({
      success: true,
      data: response,
      attempts: attempts || 1
    });

  } catch (error) {
    console.error('Experiment generation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Experiment generation failed'
    });
  }
});

/**
 * Create message
 */
router.post('/', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { conversation_id, content, type, experiment_id, html_content, css_content, js_content } = req.body;
    
    console.log(`📝 Creating message, conversation ID: ${conversation_id}, type: ${type}`);
    
    if (!conversation_id || type === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: conversation_id, type'
      });
    }

    // 对于用户消息，content不能为空
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

    // 创建消息
    const message = await DatabaseService.createMessage({
      conversation_id,
      content,
      type,
      experiment_id: experiment_id || null,
      html_content: html_content || null,
      css_content: css_content || null,
      js_content: js_content || null
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
router.put('/:id', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log(`📝 Updating message, ID: ${id}`);
    console.log('Update content:', updates);
    
    const updatedMessage = await DatabaseService.updateMessage(id, updates);
    
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
    
    // 从数据库获取实验数据
    const experiment = await DatabaseService.getExperimentById(id);
    
    if (!experiment) {
      console.log(`❌ Experiment not found, ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Experiment does not exist'
      });
    }

    console.log(`✅ Found experiment, ID: ${id}`);
    
    // 返回实验数据
    res.json({
      success: true,
      data: {
        experiment_id: experiment.id,
        title: experiment.title || 'Experiment Demo',
        html_content: experiment.html_content || '',
        css_content: '', // 从html_content中提取或留空
        js_content: ''   // 从html_content中提取或留空
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
