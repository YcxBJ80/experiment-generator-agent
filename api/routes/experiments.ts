import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { perplexityMCPClient } from '../lib/perplexityMcpClient.js';
import { JavaScriptValidator } from '../lib/jsValidator.js';

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
 * 生成实验demo
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
    const systemPrompt = `You are an AI agent specialized in creating interactive HTML-based experiment demos.
You follow this pipeline for every request:

1. Understand User Request
   - Carefully interpret the user’s described experiment or concept.
   - Ask clarifying questions if needed to ensure full understanding of the user’s goal, audience, and constraints.

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

3. Interactive HTML Demo Creation
   - Generate a self-contained HTML file with embedded JavaScript and CSS as needed.
   - Ensure the demo is interactive, visually appealing, and educational.
   - Include UI elements such as sliders, buttons, charts, or animations to let the user manipulate experiment parameters.
   - The code should be clean, commented, and runnable as-is with no external dependencies (unless explicitly requested).
   - Provide brief instructions for how to use the demo within the HTML (as visible text or in comments).

4. Output Format
   - First, present a short summary of the gathered information.
   - Then, output the complete HTML code inside a fenced code block labeled with \`html\`.
   - Make sure the code is correct and free of syntax errors.

General Rules:
- Always aim for high educational value.
- Keep accessibility and clear visualization in mind.
- Avoid unverified or unsafe algorithms/experiments.
- Use neutral and factual tone in summaries.
- If the request is vague, ask questions before starting.
- If something is physically dangerous, simulate it safely instead of providing real-life unsafe instructions.

User request: "${prompt}"

You have the following Perplexity knowledge available (already retrieved):
${perplexityKnowledge}

Now produce the summary followed by a complete, standalone HTML document inside a fenced code block labeled html. Do not include any external URLs or dependencies.`;

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

    // 如果没有OpenAI数据，返回错误
    if (!experimentData) {
      throw new Error('无法生成实验：OpenAI API调用失败，且没有可用的备用数据');
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
    
    // 这里应该从数据库获取实验数据
    // 目前返回模拟数据
    const mockExperiment = {
      id,
      title: '单摆运动实验',
      html_content: `
        <div style="display: flex; flex-direction: column; align-items: center; padding: 20px; background: #0f0f0f; color: white; min-height: 100vh;">
          <h2 style="margin-bottom: 30px; color: #ffffff;">单摆运动演示</h2>
          <div style="position: relative; width: 400px; height: 400px; border: 1px solid #2a2a2a; background: #1a1a1a; border-radius: 8px;">
            <svg width="400" height="400" style="position: absolute; top: 0; left: 0;">
              <circle cx="200" cy="50" r="5" fill="#4a5568" />
              <line id="pendulum-line" x1="200" y1="50" x2="200" y2="250" stroke="#718096" stroke-width="2" />
              <circle id="pendulum-ball" cx="200" cy="250" r="15" fill="#4a5568" />
            </svg>
          </div>
          <div style="margin-top: 20px; display: flex; gap: 10px; align-items: center;">
            <button id="start-btn" style="padding: 8px 16px; background: #4a5568; color: white; border: none; border-radius: 4px; cursor: pointer;">开始</button>
            <button id="stop-btn" style="padding: 8px 16px; background: #2d3748; color: white; border: none; border-radius: 4px; cursor: pointer;">停止</button>
            <label style="margin-left: 20px; color: #e5e5e5;">摆长: <input id="length-slider" type="range" min="100" max="300" value="200" style="margin-left: 8px;" /></label>
          </div>
        </div>
      `,
      css_content: 'body { margin: 0; padding: 0; background: #0f0f0f; }',
      js_content: `
        let isRunning = false;
        let angle = Math.PI / 4;
        let angularVelocity = 0;
        let length = 200;
        const gravity = 0.5;
        const damping = 0.995;
        
        function updatePendulum() {
          if (!isRunning) return;
          
          const angularAcceleration = -(gravity / length) * Math.sin(angle);
          angularVelocity += angularAcceleration;
          angularVelocity *= damping;
          angle += angularVelocity;
          
          const x = 200 + length * Math.sin(angle);
          const y = 50 + length * Math.cos(angle);
          
          document.getElementById('pendulum-line').setAttribute('x2', x);
          document.getElementById('pendulum-line').setAttribute('y2', y);
          document.getElementById('pendulum-ball').setAttribute('cx', x);
          document.getElementById('pendulum-ball').setAttribute('cy', y);
          
          requestAnimationFrame(updatePendulum);
        }
        
        document.getElementById('start-btn').addEventListener('click', () => {
          isRunning = true;
          updatePendulum();
        });
        
        document.getElementById('stop-btn').addEventListener('click', () => {
          isRunning = false;
        });
        
        document.getElementById('length-slider').addEventListener('input', (e) => {
          length = parseInt(e.target.value);
          if (!isRunning) {
            const x = 200 + length * Math.sin(angle);
            const y = 50 + length * Math.cos(angle);
            document.getElementById('pendulum-line').setAttribute('x2', x);
            document.getElementById('pendulum-line').setAttribute('y2', y);
            document.getElementById('pendulum-ball').setAttribute('cx', x);
            document.getElementById('pendulum-ball').setAttribute('cy', y);
          }
        });
      `
    };

    res.json({
      success: true,
      data: mockExperiment
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