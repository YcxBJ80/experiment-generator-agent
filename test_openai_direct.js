// 直接测试OpenAI API
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 直接测试OpenAI API...');
console.log('API Key存在:', !!process.env.OPENAI_API_KEY);
console.log('Base URL:', process.env.OPENAI_BASE_URL);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
});

async function testAPI() {
  try {
    console.log('\n1. 测试简单的聊天完成...');
    const simpleCompletion = await openai.chat.completions.create({
      model: 'openai/gpt-5-mini',
      messages: [
        { role: 'user', content: 'Hello, just say "Hi"' }
      ],
      max_tokens: 50
    });
    
    console.log('简单测试响应:', simpleCompletion.choices[0]?.message?.content);
    console.log('响应长度:', simpleCompletion.choices[0]?.message?.content?.length);
    
    console.log('\n2. 测试实验生成请求...');
    const experimentCompletion = await openai.chat.completions.create({
      model: 'openai/gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: '你是一个实验生成助手。请返回JSON格式的响应。'
        },
        {
          role: 'user',
          content: '创建一个简单的计数器实验'
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });
    
    console.log('实验生成响应:', experimentCompletion.choices[0]?.message?.content);
    console.log('响应长度:', experimentCompletion.choices[0]?.message?.content?.length);
    
    console.log('\n3. 测试其他模型...');
    const otherModelCompletion = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.2-3b-instruct:free',
      messages: [
        { role: 'user', content: 'Hello, just say "Hi"' }
      ],
      max_tokens: 50
    });
    
    console.log('其他模型响应:', otherModelCompletion.choices[0]?.message?.content);
    console.log('响应长度:', otherModelCompletion.choices[0]?.message?.content?.length);
    
  } catch (error) {
    console.error('❌ API测试失败:', error);
    console.error('错误详情:', error.message);
    if (error.response) {
      console.error('HTTP状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testAPI();