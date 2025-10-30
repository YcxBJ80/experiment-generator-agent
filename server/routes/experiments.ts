import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { perplexityMCPClient } from '../lib/perplexityMcpClient.js';
import { DatabaseService } from '../lib/supabase.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { extractExperimentHtml } from '../lib/htmlUtils.js';

// Ensure environment variables are loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const router = express.Router();



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

/**
 * Stream generate experiment demo
 */
router.post('/generate-stream', async (req: ExpressRequest, res: ExpressResponse) => {
  console.log('🔥 Streaming endpoint called!');
  console.log('Request body:', req.body);
  try {
    const { prompt, conversation_id, message_id, model }: GenerateExperimentRequest & { message_id?: string } = req.body;
    
    // Set default model if not provided
    const selectedModel = model || 'openai/gpt-5-mini';

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Please provide experiment requirement description'
      });
    }

    // Set SSE response headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // First get relevant knowledge through Perplexity MCP
    console.log('Getting Perplexity knowledge...');
    const perplexityKnowledge = await perplexityMCPClient.getExperimentKnowledge(prompt);
    console.log('Perplexity knowledge acquisition completed');

    // Build system prompt
    const systemPrompt = `
    
You are an AI agent specialized in creating highly interactive and visually stunning HTML-based experiment demos with rich animations and dynamic visualizations.


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
   - LAYOUT REQUIREMENTS (CRITICAL):
     * Use a two-column layout: LEFT side for demo visualization, RIGHT side for controls and information
     * Left column (60-70% width): Main demo area with animations and visualizations
     * Right column (30-40% width): Parameter controls, sliders, formulas, historical background, and additional information
     * Ensure responsive design that adapts to different screen sizes
     * Use flexbox or CSS Grid for proper layout structure
   - ANIMATION REQUIREMENTS (CRITICAL):
     * Include smooth, continuous animations that illustrate the core concepts
     * The components that are crucial for the demo should be is different color than the background (normally dark colors)
     * Use CSS animations, transitions, and JavaScript-driven animations extensively
     * Create visual feedback for all user interactions (hover effects, click animations, parameter changes)
     * Implement realistic physics simulations with proper timing and easing
     * Add visual indicators like trails, paths, force vectors, field lines, or wave propagations
     * Use color changes, size variations, and movement to show state changes
     * Include loading animations and smooth transitions between different states
     * Add an button for the user to control the particle system (close the system or not)
   
   - SPECIFIC ANIMATION EXAMPLES TO IMPLEMENT:
     * For fluid dynamics: flowing particles, pressure visualization, streamlines
     * For mechanics: moving objects with trails, force vectors, energy transformations
     * For electricity: flowing electrons, field visualizations, force vectors, sparks and glows
     * For chemistry: molecular movements, bond formations/breaking, reaction progress
     * For optics: light rays, wave propagations, interference patterns
     * For thermodynamics: particle motion speed changes, heat flow visualization
   
   - INTERACTIVITY REQUIREMENTS:
     * RIGHT 1/5 SIDE PANEL must include:
       - Parameter adjustment sliders with real-time value display
       - Mathematical formulas and equations related to the concept
         * Render every formula using LaTeX notation with proper inline (\`$ ... $\`) or block (\`$$ ... $$\`) delimiters.
       - Historical background and interesting facts
       - Real-time calculations and measurements display
       - Play/pause/reset controls for animations
       - Speed control for animations
       - Different viewing modes or simulation presets
     * LEFT 4/5 SIDE DEMO must include:
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
- Always aim for visual impact and educational value through animations.
- Prioritize smooth, realistic animations that enhance understanding.
- Keep accessibility and clear visualization in mind.
- Avoid unverified or unsafe algorithms/experiments.
- Use neutral and factual tone in summaries.
- If something is physically dangerous, simulate it safely instead of providing real-life unsafe instructions.

User request: "${prompt}"

You have the following Perplexity knowledge available (already retrieved):
${perplexityKnowledge}

Now produce the summary followed by a complete, standalone HTML document inside a fenced code block labeled html. Focus heavily on creating stunning animations and visual effects that make the concepts come alive. Do not include any external URLs or dependencies.

`;

    // Call OpenAI API to generate experiment (streaming)
    console.log('🔍 Checking openai client status:', !!openai);
    if (openai) {
      try {
        console.log('🚀 Starting streaming call to OpenAI API...');
        console.log('Model:', selectedModel);
        console.log('Prompt length:', prompt.length);
        
        const stream = await openai.chat.completions.create({
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
          max_tokens: 40000,
          stream: true
        });

        let fullContent = '';
        let chunkCount = 0;
        let experiment_id: string | null = null;
        let hasUpdatedExperimentId = false;
        
        for await (const chunk of stream) {
          if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
            const content = chunk.choices[0].delta.content;
            fullContent += content;
            chunkCount++;
            
            // Send SSE format streaming data to frontend as JSON payload to preserve newlines
            const payload = JSON.stringify({ content });
            res.write(`data: ${payload}\n\n`);
            
            // Check if there's enough content to determine this is an experiment generation request
            // When HTML code block is detected, immediately generate experiment_id and update message
            if (!hasUpdatedExperimentId && message_id && fullContent.includes('```html')) {
              try {
                experiment_id = randomUUID();
                console.log('🔧 HTML code block detected, immediately setting experiment_id:', experiment_id);
                
                // Immediately update message, add experiment_id (content will be updated later)
                await DatabaseService.updateMessage(message_id, {
                  experiment_id: experiment_id
                });
                
                hasUpdatedExperimentId = true;
                console.log('✅ experiment_id has been set in advance, frontend can immediately display button');
              } catch (error) {
                console.error('❌ Error occurred while setting experiment_id in advance:', error);
              }
            }
            
            if (chunkCount % 10 === 0) {
              console.log(`📦 Sent ${chunkCount} chunks, current length: ${fullContent.length}`);
            }
          }
        }
        
        // Send completion signal
        res.write('data: [DONE]\n\n');
        res.end();
        
        console.log('✅ Streaming response completed, total chunks:', chunkCount, 'total length:', fullContent.length);
        
        // After streaming response is completed, update complete content and HTML content
        if (fullContent && message_id) {
          try {
            console.log('🔧 Starting to update complete message content...');
            const { html: extractedHtml, title: extractedTitle } = extractExperimentHtml(fullContent);

            // If experiment_id was not set before (backup plan)
            if (!experiment_id) {
              experiment_id = randomUUID();
              console.log('🔧 Backup plan: setting experiment_id:', experiment_id);
            }

            const updatePayload: Record<string, unknown> = {
              content: fullContent,
              experiment_id
            };

            if (extractedHtml) {
              updatePayload.html_content = extractedHtml;
            }
            
            await DatabaseService.updateMessage(message_id, updatePayload);
            
            if (extractedHtml) {
              console.log('✅ Message content update completed, experiment_id:', experiment_id, 'Title:', extractedTitle || 'Experiment Demo');
            } else {
              console.warn('⚠️ Failed to extract experiment HTML from generated content');
            }
          } catch (error) {
            console.error('❌ Error occurred while updating message content:', error);
          }
        } else {
          console.warn('⚠️ Missing fullContent or message_id, skipping content update');
        }
        
      } catch (error) {
        console.error('OpenAI API call failed:', error);
        res.write(`data: \n\n❌ Error occurred while generating experiment: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } else {
      res.write('data: \n\n❌ OpenAI client not initialized\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
    }
    
  } catch (error) {
    console.error('Experiment generation failed:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate experiment'
      });
    }
  }
});



/**
 * Get experiment details
 */
router.get('/:id', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Getting experiment details, ID: ${id}`);
    
    // Get experiment data from database
    const experiment = await DatabaseService.getExperimentById(id);
    
    if (!experiment) {
      console.log(`❌ Experiment not found, ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    console.log(`✅ Experiment found, ID: ${id}`);
    
    // Return experiment data
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
      error: 'Failed to fetch experiment'
    });
  }
});



/**
 * Submit survey for experiment
 */
router.post('/survey', requireAuth, async (req: AuthenticatedRequest, res: ExpressResponse) => {
  try {
    const { experiment_id, reflects_real_world, visualization_rating, concept_understanding, suggestions } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    console.log(`📝 Submitting survey for experiment: ${experiment_id}`);
    
    // Validate required fields
    if (!experiment_id || typeof reflects_real_world !== 'boolean' || 
        !visualization_rating || !concept_understanding) {
      return res.status(400).json({
        success: false,
        error: 'Missing required survey fields'
      });
    }
    
    // Validate rating ranges
    if (visualization_rating < 1 || visualization_rating > 10 || 
        concept_understanding < 1 || concept_understanding > 10) {
      return res.status(400).json({
        success: false,
        error: 'Ratings must be between 1 and 10'
      });
    }
    
    // Save survey to database
    const surveyData = {
      experiment_id,
      reflects_real_world,
      visualization_rating: parseInt(visualization_rating),
      concept_understanding: parseInt(concept_understanding),
      suggestions: suggestions || '',
      user_id: userId
    };
    
    const survey = await DatabaseService.createSurvey(surveyData);
    
    console.log(`✅ Survey submitted successfully, ID: ${survey.id}`);
    
    res.json({
      success: true,
      data: {
        survey_id: survey.id,
        message: 'Survey submitted successfully'
      }
    });
    
  } catch (error) {
    console.error('Failed to submit survey:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit survey'
    });
  }
});

export default router;
