import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-Hk3Bji1rJgmUfcfQCWURSuWfNixo5f2GU8b5UkC102VuVKbd',
  baseURL: 'https://api.moonshot.cn/v1'
});

async function testKimiAPI() {
  console.log('🧪 测试Kimi K2 API...');
  
  try {
    const start = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: 'kimi-k2-0711-preview',
      messages: [
        {
          role: 'system',
          content: '你是一个有用的助手。请用中文回答。'
        },
        {
          role: 'user',
          content: '请简单介绍一下你自己，并说明你的能力。'
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const duration = Date.now() - start;
    
    console.log('✅ API调用成功！');
    console.log('⏱️ 耗时:', duration + 'ms');
    console.log('📝 响应内容:');
    console.log(completion.choices[0]?.message?.content);
    console.log('📊 使用情况:');
    console.log('- 提示词tokens:', completion.usage?.prompt_tokens);
    console.log('- 完成tokens:', completion.usage?.completion_tokens);
    console.log('- 总tokens:', completion.usage?.total_tokens);
    
  } catch (error) {
    console.error('❌ API调用失败:');
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    
    if (error.response) {
      console.error('HTTP状态码:', error.response.status);
      console.error('HTTP状态文本:', error.response.statusText);
      try {
        const errorBody = await error.response.text();
        console.error('错误响应体:', errorBody);
      } catch (e) {
        console.error('无法读取错误响应体');
      }
    }
  }
}

testKimiAPI();