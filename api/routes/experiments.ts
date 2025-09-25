import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { perplexityMCPClient } from '../lib/perplexityMcpClient.js';

import { DatabaseService } from '../lib/supabase.js';

// Ensure environment variables are loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const router = express.Router();

/**
 * Validate and clean JavaScript code, prevent HTML tags from mixing in
 */
function validateAndCleanJavaScript(jsCode: string): string {
  try {
    // Remove possible markdown code block markers
    let cleanedCode = jsCode.replace(/```javascript\s*/g, '').replace(/```js\s*/g, '').replace(/```\s*/g, '');
    
    // Remove real HTML tags (more precise matching)
    // Only match real HTML tags, such as <div>, <script>, </div> etc
    cleanedCode = cleanedCode.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?\s*>/g, '');
    
    // Remove script tags and their content
    cleanedCode = cleanedCode.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Check for suspicious HTML tag patterns (but preserve comparison operators)
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

Now produce the summary followed by a complete, standalone HTML document inside a fenced code block labeled html. Focus heavily on creating stunning animations and visual effects that make the concepts come alive. Do not include any external URLs or dependencies.`;

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
            
            // Send SSE format streaming data to frontend
            res.write(`data: ${content}\n\n`);
            
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
            
            // Parse generated content, extract HTML code block
            const htmlMatch = fullContent.match(/```html\s*([\s\S]*?)\s*```/);
            if (htmlMatch) {
              const htmlContent = htmlMatch[1].trim();
              
              // If experiment_id was not set before (backup plan)
              if (!experiment_id) {
                experiment_id = randomUUID();
                console.log('🔧 Backup plan: setting experiment_id:', experiment_id);
              }
              
              // Update message's complete content and HTML content
              await DatabaseService.updateMessage(message_id, {
                content: fullContent,
                experiment_id: experiment_id,
                html_content: htmlContent
              });
              
              console.log('✅ Message content update completed, experiment_id:', experiment_id);
            } else {
              console.warn('⚠️ Failed to extract HTML code block from generated content');
              // Update content even without HTML
              await DatabaseService.updateMessage(message_id, {
                content: fullContent
              });
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
 * Generate experiment demo (non-streaming, maintain compatibility)
 */
router.post('/generate', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { prompt, conversation_id }: GenerateExperimentRequest = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Please provide experiment requirement description'
      });
    }

    // First get relevant knowledge through Perplexity MCP
    console.log('Getting Perplexity knowledge...');
    const perplexityKnowledge = await perplexityMCPClient.getExperimentKnowledge(prompt);
    console.log('Perplexity knowledge acquisition completed');

    // Build new system prompt (require output summary + complete HTML document in `html` code block)
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
   
   - SPECIFIC ANIMATION EXAMPLES TO IMPLEMENT:
     * For fluid dynamics: flowing particles, pressure visualization, streamlines
     * For mechanics: moving objects with trails, force vectors, energy transformations
     * For electricity: flowing electrons, field visualizations, sparks and glows
     * For chemistry: molecular movements, bond formations/breaking, reaction progress
     * For optics: light rays, wave propagations, interference patterns
     * For thermodynamics: particle motion speed changes, heat flow visualization
   
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

Now produce the summary followed by a complete, standalone HTML document inside a fenced code block labeled html. Focus heavily on creating stunning animations and visual effects that make the concepts come alive. Do not include any external URLs or dependencies.`;

    let experimentData;

    // Call OpenAI API to generate experiment
    console.log('🔍 Checking openai client status:', !!openai);
    if (openai) {
        try {
          console.log('🚀 Calling OpenAI API...');
          console.log('Model:', 'moonshotai/kimi-k2');
          console.log('Prompt length:', prompt.length);
          
          const response = await openai.chat.completions.create({
          model: 'moonshotai/kimi-k2',
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
              // Prioritize parsing new output format: summary + ```html code block
              const htmlCodeBlockMatch = responseContent.match(/```html\s*([\s\S]*?)\s*```/i);
              const htmlFromBlock = htmlCodeBlockMatch ? htmlCodeBlockMatch[1].trim() : null;
              let summaryText = '';
              if (htmlFromBlock) {
                // Summary is the text before the code block
                const idx = responseContent.indexOf(htmlCodeBlockMatch[0]);
                summaryText = idx > 0 ? responseContent.slice(0, idx).trim() : '';
              }

              // If no ```html code block is found, try to match <html>...</html> directly
              const htmlTagMatch = htmlFromBlock ? null : responseContent.match(/<html[\s\S]*<\/html>/i);
              const htmlRaw = htmlFromBlock || (htmlTagMatch ? htmlTagMatch[0] : null);

              let rawData;
              if (htmlRaw) {
                // Extract title, body, style, script from complete HTML
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
                  title: (titleMatch ? titleMatch[1].trim() : `${prompt} Demo`),
                  description: summaryText || `Interactive experiment demo based on "${prompt}" (Information source: Perplexity)`,
                  html_content: htmlContent,
                  css_content: cssContent,
                  js_content: jsContent,
                  parameters: []
                };
              } else {
                // Fall back to old JSON parsing logic
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
                  console.warn('First JSON parsing failed, attempting to fix format:', firstParseError.message);
                  try {
                    let cleanedStr = jsonStr
                      .replace(/,\s*}/g, '}')
                      .replace(/,\s*]/g, ']')
                      .replace(/([{,]\s*)(\w+):/g, '$1"$2":');
                    rawData = JSON.parse(cleanedStr);
                  } catch (secondParseError) {
                    console.warn('Second JSON parsing also failed, attempting manual field extraction:', secondParseError.message);
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
              
              // 直接使用生成的代码，不进行linter验证
              console.log('✅ Code generation completed');
              experimentData = rawData;
              
              console.log('✅ JSON parsing successful');
            } catch (parseError) {
              console.warn('❌ JSON parsing failed:', parseError.message);
              console.warn('First 1000 characters of original response:', responseContent.substring(0, 1000));
              experimentData = null;
            }
          }
      } catch (apiError) {
        console.error('🔍 Entering API error handling code block');
        console.error('❌ OpenAI API call failed:');
        console.error('Error type:', apiError.constructor.name);
        console.error('Error message:', apiError.message);
        console.error('Error details:', apiError);
        
        // If it's an HTTP error, try to get more information
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

    // If no OpenAI data, return error directly
    if (!experimentData) {
      console.log('❌ Experiment generation failed: OpenAI API call failed and no backup data');
      return res.status(500).json({
        success: false,
        error: 'OpenAI API call failed, unable to generate experiment. Please check API configuration or try again later.'
      });
    }

    // Generate experiment ID
    const experiment_id = randomUUID();

    const response: GenerateExperimentResponse = {
      experiment_id,
      title: experimentData.title || `${prompt} Demo`,
      description: experimentData.description || `Interactive experiment demo based on "${prompt}"`,
      html_content: experimentData.html_content || '',
      css_content: experimentData.css_content || '',
      js_content: experimentData.js_content || '',
      parameters: experimentData.parameters || [],
      status: 'success'
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Experiment generation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate experiment'
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
 * Extract code sections from HTML content
 */
function extractCodeSections(html: string): { htmlContent: string, cssContent: string, jsContent: string } {
  // Extract CSS from <style> tags
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const styleMatches = html.match(styleRegex);
  const cssContent = styleMatches ? styleMatches.map(match => {
    const codeMatch = match.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    return codeMatch ? codeMatch[1] : '';
  }).join('\n') : '';
  
  // Extract JavaScript from <script> tags
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  const scriptMatches = html.match(scriptRegex);
  const jsContent = scriptMatches ? scriptMatches.map(match => {
    const codeMatch = match.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    return codeMatch ? codeMatch[1] : '';
  }).join('\n') : '';
  
  // Extract HTML content (remove <style> and <script> tags)
  let htmlContent = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .trim();
  
  return { htmlContent, cssContent, jsContent };
}

/**
 * Combine code sections into complete HTML
 */
function combineCodeSections(htmlContent: string, cssContent: string, jsContent: string): string {
  let combined = htmlContent;
  
  if (cssContent) {
    // Add CSS in <style> tag
    const styleTag = `<style>\n${cssContent}\n</style>`;
    if (combined.includes('<head>')) {
      combined = combined.replace('<head>', `<head>\n${styleTag}`);
    } else {
      combined = `${styleTag}\n${combined}`;
    }
  }
  
  if (jsContent) {
    // Add JavaScript in <script> tag
    const scriptTag = `<script>\n${jsContent}\n</script>`;
    if (combined.includes('</body>')) {
      combined = combined.replace('</body>', `${scriptTag}\n</body>`);
    } else {
      combined = `${combined}\n${scriptTag}`;
    }
  }
  
  return combined;
}

export default router;