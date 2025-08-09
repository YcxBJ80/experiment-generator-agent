import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { perplexityMCPClient } from '../lib/perplexityMcpClient';
import { JavaScriptValidator } from '../lib/jsValidator';
import { DatabaseService } from '../lib/supabase';

// 确保环境变量已加载
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const router = express.Router();

/**
 * 验证和清理JavaScript代码，防止HTML标签混入
 */
function validateAndCleanJavaScript(jsCode: string): string {
  try {
    // 移除可能的markdown代码块标记
    let cleanedCode = jsCode.replace(/```javascript\s*/g, '').replace(/```js\s*/g, '').replace(/```\s*/g, '');
    
    // 移除真正的HTML标签（更精确的匹配）
    // 只匹配真正的HTML标签，如 <div>, <script>, </div> 等
    cleanedCode = cleanedCode.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?\s*>/g, '');
    
    // 移除script标签及其内容
    cleanedCode = cleanedCode.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // 检查是否还有可疑的HTML标签模式（但保留比较操作符）
    const htmlTagPattern = /<\/?[a-zA-Z]/;
    if (htmlTagPattern.test(cleanedCode)) {
      console.warn('⚠️ JavaScript代码中检测到可能的HTML标签残留');
    }
    
    // 基本的语法检查 - 检查括号匹配
    const openBraces = (cleanedCode.match(/\{/g) || []).length;
    const closeBraces = (cleanedCode.match(/\}/g) || []).length;
    const openParens = (cleanedCode.match(/\(/g) || []).length;
    const closeParens = (cleanedCode.match(/\)/g) || []).length;
    
    if (openBraces !== closeBraces) {
      console.warn('⚠️ JavaScript代码中花括号不匹配');
    }
    
    if (openParens !== closeParens) {
      console.warn('⚠️ JavaScript代码中圆括号不匹配');
    }
    
    return cleanedCode.trim();
  } catch (error) {
    console.error('JavaScript代码验证失败:', error);
    return jsCode; // 返回原始代码
  }
}

// OpenAI 客户端配置
let openai: OpenAI | null = null;

try {
  console.log('检查环境变量:');
  console.log('OPENAI_API_KEY存在:', !!process.env.OPENAI_API_KEY);
  console.log('OPENAI_BASE_URL:', process.env.OPENAI_BASE_URL);
  
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
    });
    console.log('✅ OpenAI客户端初始化成功');
  } else {
    console.warn('❌ OPENAI_API_KEY环境变量未设置');
  }
} catch (error) {
  console.warn('❌ OpenAI客户端初始化失败:', error);
}

interface GenerateExperimentRequest {
  prompt: string;
  conversation_id?: string;
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
 * 流式生成实验demo
 */
router.post('/generate-stream', async (req: Request, res: Response) => {
  console.log('🔥 流式端点被调用！');
  console.log('请求体:', req.body);
  try {
    const { prompt, conversation_id, message_id }: GenerateExperimentRequest & { message_id?: string } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: '请提供实验需求描述'
      });
    }

    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // 首先通过Perplexity MCP获取相关知识
    console.log('正在获取Perplexity知识...');
    const perplexityKnowledge = await perplexityMCPClient.getExperimentKnowledge(prompt);
    console.log('Perplexity知识获取完成');

    // 构建系统提示词
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
     * Include multiple sliders, buttons, and controls for real-time parameter adjustment
     * Provide play/pause/reset controls for animations
     * Add hover effects that reveal additional information or highlight components
     * Implement click-and-drag interactions where appropriate
     * Show real-time calculations and measurements
     * Include multiple viewing modes or perspectives
   
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

    // 调用OpenAI API生成实验（流式）
    console.log('🔍 检查openai客户端状态:', !!openai);
    if (openai) {
      try {
        console.log('🚀 开始流式调用OpenAI API...');
        console.log('模型:', 'openai/gpt-5-mini');
        console.log('提示词长度:', prompt.length);
        
        const stream = await openai.chat.completions.create({
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
          max_tokens: 40000,
          stream: true
        });

        let fullContent = '';
        let chunkCount = 0;
        
        for await (const chunk of stream) {
          if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
            const content = chunk.choices[0].delta.content;
            fullContent += content;
            chunkCount++;
            
            // 发送SSE格式的流式数据到前端
            res.write(`data: ${content}\n\n`);
            
            if (chunkCount % 10 === 0) {
              console.log(`📦 已发送 ${chunkCount} 个chunks，当前长度: ${fullContent.length}`);
            }
          }
        }
        
        // 发送完成信号
        res.write('data: [DONE]\n\n');
        res.end();
        
        console.log('✅ 流式响应完成，总chunks:', chunkCount, '总长度:', fullContent.length);
        
        // 在流式响应完成后，创建实验记录并更新消息
        if (fullContent && message_id) {
          try {
            console.log('🔧 开始处理实验数据和更新消息...');
            
            // 解析生成的内容，提取HTML代码块
            const htmlMatch = fullContent.match(/```html\s*([\s\S]*?)\s*```/);
            if (htmlMatch) {
              const htmlContent = htmlMatch[1].trim();
              
              // 生成实验ID
              const experiment_id = randomUUID();
              
              // 从HTML内容中提取标题（如果有的话）
              const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
              const title = titleMatch ? titleMatch[1] : '实验演示';
              
              // 创建实验记录（这里简化处理，实际应该有完整的实验数据结构）
              const experimentData = {
                experiment_id,
                title,
                description: `基于提示词"${prompt}"生成的实验演示`,
                html_content: htmlContent,
                css_content: '', // 流式生成的是完整HTML，CSS已内嵌
                js_content: '',  // 流式生成的是完整HTML，JS已内嵌
                parameters: [],
                status: 'completed'
              };
              
              console.log('📝 实验数据准备完成，experiment_id:', experiment_id);
              
              // 更新消息，添加experiment_id和内容
              await DatabaseService.updateMessage(message_id, {
                content: fullContent,
                experiment_id: experiment_id,
                html_content: htmlContent
              });
              
              console.log('✅ 消息更新完成，添加了experiment_id:', experiment_id);
            } else {
              console.warn('⚠️ 未能从生成内容中提取HTML代码块');
            }
          } catch (error) {
            console.error('❌ 处理实验数据或更新消息时出错:', error);
          }
        } else {
          console.warn('⚠️ 缺少fullContent或message_id，跳过实验记录创建');
        }
        
      } catch (error) {
        console.error('OpenAI API调用失败:', error);
        res.write(`data: \n\n❌ 生成实验时出现错误：${error instanceof Error ? error.message : '未知错误'}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } else {
      res.write('data: \n\n❌ OpenAI客户端未初始化\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
    }
    
  } catch (error) {
    console.error('生成实验失败:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '生成实验失败'
      });
    }
  }
});

/**
 * 生成实验demo（非流式，保留兼容性）
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, conversation_id }: GenerateExperimentRequest = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: '请提供实验需求描述'
      });
    }

    // 首先通过Perplexity MCP获取相关知识
    console.log('正在获取Perplexity知识...');
    const perplexityKnowledge = await perplexityMCPClient.getExperimentKnowledge(prompt);
    console.log('Perplexity知识获取完成');

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
   
   - INTERACTIVITY REQUIREMENTS:
     * Include multiple sliders, buttons, and controls for real-time parameter adjustment
     * Provide play/pause/reset controls for animations
     * Add hover effects that reveal additional information or highlight components
     * Implement click-and-drag interactions where appropriate
     * Show real-time calculations and measurements
     * Include multiple viewing modes or perspectives
   
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
          console.log(`🚀 第${attempts}次尝试调用OpenAI API...`);
          console.log('模型:', 'openai/gpt-5-mini');
          console.log('提示词长度:', prompt.length);
          
          const completion = await openai.chat.completions.create({
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

          const responseContent = completion.choices[0]?.message?.content;
          console.log('OpenAI响应长度:', responseContent?.length);
          console.log('OpenAI响应前500字符:', responseContent?.substring(0, 500));
          
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

                console.log('提取的JSON字符串长度:', jsonStr.length);
                console.log('清理后的JSON前200字符:', jsonStr.substring(0, 200));

                try {
                  rawData = JSON.parse(jsonStr);
                } catch (firstParseError) {
                  console.warn('第一次JSON解析失败，尝试修复格式:', firstParseError.message);
                  try {
                    let cleanedStr = jsonStr
                      .replace(/,\s*}/g, '}')
                      .replace(/,\s*]/g, ']')
                      .replace(/([{,]\s*)(\w+):/g, '$1"$2":');
                    rawData = JSON.parse(cleanedStr);
                  } catch (secondParseError) {
                    console.warn('第二次JSON解析也失败，尝试手动提取字段:', secondParseError.message);
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
                      console.log('✅ 手动提取字段成功');
                    } else {
                      throw new Error('无法提取必要字段');
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
                  console.log(`第${attempts}次生成的代码存在语法错误:`, validationResult.errors);
                  
                  if (attempts < maxAttempts) {
                    // 生成修复提示词
                    const fixPrompt = JavaScriptValidator.generateFixPrompt(rawData.js_content, validationResult);
                    
                    console.log('尝试让模型修复语法错误...');
                    const fixCompletion = await openai.chat.completions.create({
                      model: 'openai/gpt-5-mini',
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
                          console.log('代码修复成功！');
                          experimentData = rawData;
                        } else {
                          console.log('代码修复失败，仍有错误:', revalidationResult.errors);
                          // 如果修复失败，使用自动修复的代码
                          if (revalidationResult.fixedCode) {
                            rawData.js_content = revalidationResult.fixedCode;
                            experimentData = rawData;
                            console.log('使用自动修复的代码');
                          }
                        }
                      }
                    }
                  } else {
                    // 最后一次尝试，使用自动修复
                    if (validationResult.fixedCode) {
                      rawData.js_content = validationResult.fixedCode;
                      experimentData = rawData;
                      console.log('使用自动修复的代码作为最终结果');
                    } else {
                      throw new Error(`生成的JavaScript代码存在无法修复的语法错误: ${validationResult.errors.join(', ')}`);
                    }
                  }
                } else {
                  console.log('代码语法检查通过！');
                  experimentData = rawData;
                }
              } else {
                experimentData = rawData;
              }
              
              console.log('✅ JSON解析成功');
            } catch (parseError) {
              console.warn('❌ JSON解析失败:', parseError.message);
              console.warn('原始响应前1000字符:', responseContent.substring(0, 1000));
              if (attempts >= maxAttempts) {
                experimentData = null;
              }
            }
          }
        }
      } catch (apiError) {
        console.error('🔍 进入API错误处理代码块');
        console.error('❌ OpenAI API调用失败:');
        console.error('错误类型:', apiError.constructor.name);
        console.error('错误消息:', apiError.message);
        console.error('错误详情:', apiError);
        
        // 如果是HTTP错误，尝试获取更多信息
        if (apiError.response) {
          console.error('HTTP状态码:', apiError.response.status);
          console.error('HTTP状态文本:', apiError.response.statusText);
          console.error('响应头:', apiError.response.headers);
          try {
            const errorBody = await apiError.response.text();
            console.error('错误响应体:', errorBody);
          } catch (e) {
            console.error('无法读取错误响应体');
          }
        }
        
        experimentData = null;
      }
    } else {
      console.warn('OpenAI客户端未初始化');
      experimentData = null;
    }

    // 如果没有OpenAI数据，直接返回错误
    if (!experimentData) {
      console.log('❌ 实验生成失败：OpenAI API调用失败且无备用数据');
      return res.status(500).json({
        success: false,
        error: 'OpenAI API调用失败，无法生成实验。请检查API配置或稍后重试。'
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
    console.error('实验生成失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '实验生成失败'
    });
  }
});

/**
 * 获取实验详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🔍 获取实验详情，ID: ${id}`);
    
    // 从数据库获取实验数据
    const experiment = await DatabaseService.getExperimentById(id);
    
    if (!experiment) {
      console.log(`❌ 未找到实验，ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: '实验不存在'
      });
    }

    console.log(`✅ 找到实验，ID: ${id}`);
    
    // 返回实验数据
    res.json({
      success: true,
      data: {
        experiment_id: experiment.id,
        title: experiment.title || '实验演示',
        html_content: experiment.html_content || '',
        css_content: '', // 从html_content中提取或留空
        js_content: ''   // 从html_content中提取或留空
      }
    });

  } catch (error) {
    console.error('获取实验失败:', error);
    res.status(500).json({
      success: false,
      error: '获取实验失败'
    });
  }
});

export default router;