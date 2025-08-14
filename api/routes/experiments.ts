import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { perplexityMCPClient } from '../lib/perplexityMcpClient.js';
import { JavaScriptValidator } from '../lib/jsValidator.js';
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
    const systemPrompt = `You are an AI agent that creates interactive, visually striking, single-file HTML demos with smooth, rich animations.
Workflow:

Understand
Parse the user's goal, audience, and constraints.
Ask brief clarifying questions if needed.
Research (Perplexity MCP)
Tools: search, get_documentation, find_apis, check_deprecated_code, extract_url_content, chat_perplexity.
Use only verified facts/equations; cite Perplexity.
Build the demo
Output one self-contained HTML file (inline CSS/JS), no external dependencies, clean and well-commented.
Include short in-HTML usage instructions.
Animations: smooth/continuous; realistic timing/easing; particle systems when useful; visual indicators (trails, vectors, field lines, waves); include loading and state-transition animations.
Interactivity: sliders, buttons, play/pause/reset; hover/click feedback; drag interactions when helpful; real-time readouts; optional multiple views.
Design and layout:
Dark theme with high-contrast text.
Iridescent accent colors (teal–cyan–blue–violet–magenta), deep and saturated. Avoid light/pastel UI colors.
Modern, responsive layout with layered depth (shadows/gradients, proper z-index).
Ensure adequate space for every panel/canvas/legend/control.
Prevent overlap/occlusion: no element or text may be blocked.
Use responsive grid/flex, size clamps (min/max), wrapping, and scrollable panels where needed.
Keep tooltips/popovers non-blocking and dismissible; avoid covering key content.
Ensure labels, legends, and controls remain readable at all sizes.
Output format
First: a short neutral summary of the research and planned animations.
Then: the complete HTML inside a fenced code block labeled html, runnable as-is.
General rules:

Maximize educational value and clarity through animation.
Maintain accessibility, sufficient contrast, and comfortable tap targets.
Prefer correctness over flashiness; avoid unverified or unsafe methods.
If the request is vague, ask questions first.
Simulate dangerous scenarios; do not provide unsafe real-world instructions.

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

    let attempts = 0;

    // Build new system prompt (require output summary + complete HTML document in `html` code block)
const systemPrompt = `You are an AI agent that creates interactive, visually clear, single‑file HTML demos with smooth animations.

Workflow
- Understand: parse the user's goal, audience, and constraints; ask brief clarifying questions if needed.
- Build: output one self‑contained HTML file (inline CSS/JS), clean and commented, with short in‑HTML usage instructions. No external dependencies.
- Interactivity & animation: smooth/continuous motion with natural timing/easing; play/pause/reset; sliders/buttons; hover/click feedback; drag when helpful; real‑time readouts; optional multiple views.
- Design & layout: dark theme; high‑contrast text; modern responsive layout (grid/flex); adequate spacing; layered depth (shadows/gradients); prevent overlap/occlusion; keep labels/legends/controls readable at all sizes; tooltips are non‑blocking and dismissible.
- Color: use meaningful, domain‑relevant colors for experimental elements (e.g., inputs vs. outputs, positive vs. negative, vectors/fields/regions). Prefer deep, saturated accents (teal–cyan–blue–violet–magenta). If using light colors, keep them recognizable: maintain strong contrast, avoid very low opacity, and add outlines/glow/darker strokes when needed. Never let light colors become too faint to read.
- Education: maximize clarity with helpful visuals (trails, vectors, field lines, waves) and smooth loading/state‑transition animations.
- Accessibility & safety: ensure sufficient contrast and comfortable tap targets; simulate dangerous scenarios only; do not provide unsafe real‑world instructions.
- Facts: use only verified facts/equations; prefer correctness over flashiness. If unsure, ask.

Output format
1) A short neutral summary of the plan.
2) The complete runnable HTML (inline CSS/JS).
3) A brief list of a few relevant links about the experiment for further reading.

User request: "${prompt}"

You have the following Perplexity knowledge available (already retrieved):
${perplexityKnowledge}

Now produce the summary followed by a complete, standalone HTML document inside a fenced code block labeled html. Focus heavily on creating stunning animations and visual effects that make the concepts come alive. Do not include any external URLs or dependencies.`;

    let experimentData;

    // Call OpenAI API to generate experiment
    console.log('🔍 Checking openai client status:', !!openai);
    if (openai) {
        try {
          const maxAttempts = 3;
        
        while (attempts < maxAttempts && !experimentData) {
          attempts++;
          console.log(`🚀 Attempt ${attempts} to call OpenAI API...`);
          console.log('Model:', 'openai/gpt-5-mini');
          console.log('Prompt length:', prompt.length);
          
          const response = await openai.chat.completions.create({
          model: 'openai/gpt-5-mini',
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
              
              // Validate and clean JavaScript code
              if (rawData.js_content) {
                rawData.js_content = validateAndCleanJavaScript(rawData.js_content);
                
                // Use new syntax checker
                const validationResult = JavaScriptValidator.validateSyntax(rawData.js_content);
                
                if (!validationResult.isValid) {
                  console.log(`Code generated in attempt ${attempts} has syntax errors:`, validationResult.errors);
                  
                  if (attempts < maxAttempts) {
                    // Generate fix prompt
                    const fixPrompt = JavaScriptValidator.generateFixPrompt(rawData.js_content, validationResult);
                    
                    console.log('Attempting to have model fix syntax errors...');
                    const fixCompletion = await openai.chat.completions.create({
                      model: 'openai/gpt-5-mini',
                      messages: [
                        { role: 'system', content: 'You are a JavaScript code fixing expert. Please fix the syntax errors in the provided code.' },
                        { role: 'user', content: fixPrompt }
                      ],
                      temperature: 0.3,
                      max_tokens: 40000
                    });
                    
                    const fixedResponse = fixCompletion.choices[0]?.message?.content;
                    if (fixedResponse) {
                      // Extract fixed JavaScript code
                      const codeMatch = fixedResponse.match(/```(?:javascript)?\n([\s\S]*?)\n```/);
                      if (codeMatch) {
                        rawData.js_content = codeMatch[1].trim();
                        
                        // Re-validate the fixed code
                        const revalidationResult = JavaScriptValidator.validateSyntax(rawData.js_content);
                        if (revalidationResult.isValid) {
                          console.log('Code fix successful!');
                          experimentData = rawData;
                        } else {
                          console.log('Code fix failed, still has errors:', revalidationResult.errors);
                          // If fix failed, use auto-fixed code
                          if (revalidationResult.fixedCode) {
                            rawData.js_content = revalidationResult.fixedCode;
                            experimentData = rawData;
                            console.log('Using auto-fixed code');
                          }
                        }
                      }
                    }
                  } else {
                    // Last attempt, use auto-fix
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
              
              console.log('✅ JSON parsing successful');
            } catch (parseError) {
              console.warn('❌ JSON parsing failed:', parseError.message);
              console.warn('First 1000 characters of original response:', responseContent.substring(0, 1000));
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
      data: response,
      attempts: attempts || 1
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

export default router;