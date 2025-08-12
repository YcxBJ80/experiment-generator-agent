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
router.post('/generate-stream', async (req: ExpressRequest, res: ExpressResponse) => {
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
    const systemPrompt = `You are an AI agent that creates interactive, visually striking, single-file HTML demos with smooth, rich animations.

Workflow:
1) Understand
   - Parse the user's goal, audience, and constraints.
   - Ask brief clarifying questions if needed.

2) Research (Perplexity MCP)
   - Tools: search, get_documentation, find_apis, check_deprecated_code, extract_url_content, chat_perplexity.
   - Use only verified facts/equations; cite Perplexity.

3) Build the demo
   - Output one self-contained HTML file (inline CSS/JS), no external dependencies, clean and well-commented.
   - Include short in-HTML usage instructions.
   - Animations: smooth/continuous; realistic timing/easing; particle systems when useful; visual indicators (trails, vectors, field lines, waves); include loading and state-transition animations.
   - Interactivity: sliders, buttons, play/pause/reset; hover/click feedback; drag interactions when helpful; real-time readouts; optional multiple views.
   - Design and layout:
     * Dark theme with high-contrast text.
     * Iridescent accent colors (teal–cyan–blue–violet–magenta), deep and saturated. Avoid light/pastel UI colors.
     * Modern, responsive layout with layered depth (shadows/gradients, proper z-index).
     * Ensure adequate space for every panel/canvas/legend/control.
     * Prevent overlap/occlusion: no element or text may be blocked.
     * Use responsive grid/flex, size clamps (min/max), wrapping, and scrollable panels where needed.
     * Keep tooltips/popovers non-blocking and dismissible; avoid covering key content.
     * Ensure labels, legends, and controls remain readable at all sizes.

4) Output format
   - First: a short neutral summary of the research and planned animations.
   - Then: the complete HTML inside a fenced code block labeled html, runnable as-is.

General rules:
- Maximize educational value and clarity through animation.
- Maintain accessibility, sufficient contrast, and comfortable tap targets.
- Prefer correctness over flashiness; avoid unverified or unsafe methods.
- If the request is vague, ask questions first.
- Simulate dangerous scenarios; do not provide unsafe real-world instructions.

User request: "${prompt}"

You have the following Perplexity knowledge available (already retrieved):
${perplexityKnowledge}

Now produce the summary followed by a complete, standalone HTML document inside a fenced code block labeled html. Focus heavily on creating stunning animations and visual effects that make the concepts come alive. Do not include any external URLs or dependencies.`;

    // 调用OpenAI API生成实验（流式）
    console.log('🔍 检查openai客户端状态:', !!openai);
    if (openai) {
      try {
        console.log('🚀 开始流式调用OpenAI API...');
        console.log('模型:', 'openai/gpt-5');
        console.log('提示词长度:', prompt.length);
        
        const stream = await openai.chat.completions.create({
          model: 'openai/gpt-5',
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
            
            // 发送SSE格式的流式数据到前端
            res.write(`data: ${content}\n\n`);
            
            // 检查是否已经有足够的内容来判断这是一个实验生成请求
            // 当检测到HTML代码块开始时，立即生成experiment_id并更新消息
            if (!hasUpdatedExperimentId && message_id && fullContent.includes('```html')) {
              try {
                experiment_id = randomUUID();
                console.log('🔧 检测到HTML代码块，立即设置experiment_id:', experiment_id);
                
                // 立即更新消息，添加experiment_id（内容稍后更新）
                await DatabaseService.updateMessage(message_id, {
                  experiment_id: experiment_id
                });
                
                hasUpdatedExperimentId = true;
                console.log('✅ experiment_id已提前设置，前端可以立即显示按钮');
              } catch (error) {
                console.error('❌ 提前设置experiment_id时出错:', error);
              }
            }
            
            if (chunkCount % 10 === 0) {
              console.log(`📦 已发送 ${chunkCount} 个chunks，当前长度: ${fullContent.length}`);
            }
          }
        }
        
        // 发送完成信号
        res.write('data: [DONE]\n\n');
        res.end();
        
        console.log('✅ 流式响应完成，总chunks:', chunkCount, '总长度:', fullContent.length);
        
        // 在流式响应完成后，更新完整内容和HTML内容
        if (fullContent && message_id) {
          try {
            console.log('🔧 开始更新完整消息内容...');
            
            // 解析生成的内容，提取HTML代码块
            const htmlMatch = fullContent.match(/```html\s*([\s\S]*?)\s*```/);
            if (htmlMatch) {
              const htmlContent = htmlMatch[1].trim();
              
              // 如果之前没有设置experiment_id（备用方案）
              if (!experiment_id) {
                experiment_id = randomUUID();
                console.log('🔧 备用方案：设置experiment_id:', experiment_id);
              }
              
              // 更新消息的完整内容和HTML内容
              await DatabaseService.updateMessage(message_id, {
                content: fullContent,
                experiment_id: experiment_id,
                html_content: htmlContent
              });
              
              console.log('✅ 消息内容更新完成，experiment_id:', experiment_id);
            } else {
              console.warn('⚠️ 未能从生成内容中提取HTML代码块');
              // 即使没有HTML，也要更新内容
              await DatabaseService.updateMessage(message_id, {
                content: fullContent
              });
            }
          } catch (error) {
            console.error('❌ 更新消息内容时出错:', error);
          }
        } else {
          console.warn('⚠️ 缺少fullContent或message_id，跳过内容更新');
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
router.post('/generate', async (req: ExpressRequest, res: ExpressResponse) => {
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
    const systemPrompt = `You are an AI agent that creates interactive, visually striking, single-file HTML demos with smooth, rich animations.

Workflow:
1. Understand
   - Parse the user's goal, audience, and constraints.
   - Ask brief clarifying questions if needed.

2. Research (Perplexity MCP)
   - Tools: search, get_documentation, find_apis, check_deprecated_code, extract_url_content, chat_perplexity.
   - Use only verified facts/equations; cite Perplexity.

3. Build the demo
   - Output one self-contained HTML file (inline CSS/JS), no external dependencies, clean and well-commented.
   - Include short in-HTML usage instructions.
   - Animations: smooth/continuous; realistic timing/easing; particle systems when useful; visual indicators (trails, vectors, field lines, waves); include loading and state-transition animations.
   - Interactivity: sliders, buttons, play/pause/reset; hover/click feedback; drag interactions when helpful; real-time readouts; optional multiple views.
   - Design and layout:
     * Dark theme with high-contrast text.
     * Iridescent accent colors (teal–cyan–blue–violet–magenta), deep and saturated. Avoid light/pastel UI colors.
     * Modern, responsive layout with layered depth (shadows/gradients, proper z-index).
     * Ensure adequate space for every panel/canvas/legend/control.
     * Prevent overlap/occlusion: no element or text may be blocked.
     * Use responsive grid/flex, size clamps (min/max), wrapping, and scrollable panels where needed.
     * Keep tooltips/popovers non-blocking and dismissible; avoid covering key content.
     * Ensure labels, legends, and controls remain readable at all sizes.

4. Output format
   - First: a short neutral summary of the research and planned animations.
   - Then: the complete HTML inside a fenced code block labeled html, runnable as-is.

General rules:
- Maximize educational value and clarity through animation.
- Maintain accessibility, sufficient contrast, and comfortable tap targets.
- Prefer correctness over flashiness; avoid unverified or unsafe methods.
- If the request is vague, ask questions first.
- Simulate dangerous scenarios; do not provide unsafe real-world instructions.

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
          console.log('模型:', 'openai/gpt-5');
          console.log('提示词长度:', prompt.length);
          
          const response = await openai.chat.completions.create({
          model: 'openai/gpt-5',
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
router.get('/:id', async (req: ExpressRequest, res: ExpressResponse) => {
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