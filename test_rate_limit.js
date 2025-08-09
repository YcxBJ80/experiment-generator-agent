import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

async function testRateLimit() {
  console.log('🧪 测试速率限制问题...\n');
  
  for (let i = 1; i <= 3; i++) {
    console.log(`📡 第${i}次API调用...`);
    
    const start = Date.now();
    try {
      const completion = await openai.chat.completions.create({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [
          {
            role: 'user',
            content: '请说"你好"'
          }
        ],
        max_tokens: 50
      });
      
      const duration = Date.now() - start;
      const response = completion.choices[0]?.message?.content || '';
      
      console.log(`✅ 成功! 耗时: ${duration}ms`);
      console.log(`📝 响应: "${response}"`);
      console.log(`📊 响应长度: ${response.length}\n`);
      
    } catch (error) {
      const duration = Date.now() - start;
      console.log(`❌ 失败! 耗时: ${duration}ms`);
      console.log(`🔍 错误类型: ${error.constructor.name}`);
      console.log(`💬 错误消息: ${error.message}`);
      
      if (error.status) {
        console.log(`🌐 HTTP状态: ${error.status}`);
      }
      
      if (error.error?.message) {
        console.log(`📋 详细错误: ${error.error.message}`);
      }
      
      console.log('');
    }
    
    // 如果不是最后一次调用，等待一段时间
    if (i < 3) {
      console.log('⏳ 等待10秒后继续...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

testRateLimit().catch(console.error);