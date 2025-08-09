const fetch = require('node-fetch');
require('dotenv').config();

console.log('🔍 OpenAI API 调试测试');
console.log('='.repeat(50));

// 检查环境变量
console.log('\n📋 环境变量检查:');
console.log('OPENAI_API_KEY存在:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY长度:', process.env.OPENAI_API_KEY?.length || 0);
console.log('OPENAI_BASE_URL:', process.env.OPENAI_BASE_URL);

// 测试API连接
async function testOpenAIConnection() {
  console.log('\n🌐 测试API连接...');
  
  try {
    const response = await fetch(`${process.env.OPENAI_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('响应状态:', response.status);
    console.log('响应状态文本:', response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API连接失败');
      console.log('错误响应:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ API连接成功');
    console.log('可用模型数量:', data.data?.length || 0);
    
    // 检查是否有gpt-5-mini模型
    const hasGpt5Mini = data.data?.some(model => model.id === 'openai/gpt-5-mini');
    console.log('是否支持 openai/gpt-5-mini:', hasGpt5Mini);
    
    if (!hasGpt5Mini) {
      console.log('⚠️  模型 openai/gpt-5-mini 不可用');
      console.log('可用的OpenAI模型:');
      data.data?.filter(model => model.id.includes('openai')).forEach(model => {
        console.log(`  - ${model.id}`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('❌ API连接测试失败:', error.message);
    return false;
  }
}

// 测试聊天完成API
async function testChatCompletion() {
  console.log('\n💬 测试聊天完成API...');
  
  try {
    const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: '你是一个测试助手。'
          },
          {
            role: 'user',
            content: '请回复"测试成功"'
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    console.log('响应状态:', response.status);
    console.log('响应状态文本:', response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ 聊天完成API调用失败');
      console.log('错误响应:', errorText);
      
      // 尝试解析错误信息
      try {
        const errorJson = JSON.parse(errorText);
        console.log('错误详情:', errorJson);
      } catch (e) {
        console.log('无法解析错误JSON');
      }
      
      return false;
    }

    const data = await response.json();
    console.log('✅ 聊天完成API调用成功');
    console.log('响应内容:', data.choices?.[0]?.message?.content);
    console.log('使用的模型:', data.model);
    console.log('Token使用情况:', data.usage);
    
    return true;
  } catch (error) {
    console.log('❌ 聊天完成API测试失败:', error.message);
    return false;
  }
}

// 测试实验生成的具体请求
async function testExperimentGeneration() {
  console.log('\n🧪 测试实验生成请求...');
  
  const systemPrompt = `你是一个专业的交互式实验设计师。请根据用户的描述生成一个完整的交互式实验。

重要要求：
1. js_content中绝对不能包含任何HTML标签（如<script>、<div>、<span>等）
2. js_content中不能使用innerHTML、outerHTML等方法插入HTML内容
3. 必须返回有效的JSON格式

请严格按照以下JSON格式返回：
{
  "title": "实验标题",
  "description": "实验描述",
  "html_content": "完整的HTML代码",
  "css_content": "CSS样式代码",
  "js_content": "纯JavaScript代码，不包含任何HTML标签",
  "parameters": [{"name":"参数1","type":"range","min":1,"max":10,"default":5,"description":"参数描述"}]
}`;

  try {
    const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: '创建一个简单的计数器实验'
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    console.log('响应状态:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ 实验生成请求失败');
      console.log('错误响应:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ 实验生成请求成功');
    
    const responseContent = data.choices?.[0]?.message?.content;
    console.log('响应长度:', responseContent?.length);
    console.log('响应前500字符:', responseContent?.substring(0, 500));
    
    // 尝试解析JSON
    try {
      let jsonStr = responseContent;
      
      // 尝试提取```json代码块
      const jsonBlockMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1];
        console.log('✅ 找到JSON代码块');
      } else {
        // 尝试提取第一个完整的JSON对象
        const jsonMatch = responseContent.match(/\{[\s\S]*?\}(?=\s*$|\s*```|\s*\n\n)/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
          console.log('✅ 找到JSON对象');
        } else {
          console.log('⚠️  未找到明确的JSON结构');
        }
      }
      
      const experimentData = JSON.parse(jsonStr);
      console.log('✅ JSON解析成功');
      console.log('实验标题:', experimentData.title);
      console.log('JS代码长度:', experimentData.js_content?.length);
      
      return true;
    } catch (parseError) {
      console.log('❌ JSON解析失败:', parseError.message);
      console.log('尝试解析的内容:', responseContent);
      return false;
    }
    
  } catch (error) {
    console.log('❌ 实验生成测试失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('开始运行诊断测试...\n');
  
  const connectionTest = await testOpenAIConnection();
  const chatTest = await testChatCompletion();
  const experimentTest = await testExperimentGeneration();
  
  console.log('\n📊 测试结果总结:');
  console.log('='.repeat(50));
  console.log('API连接测试:', connectionTest ? '✅ 通过' : '❌ 失败');
  console.log('聊天完成测试:', chatTest ? '✅ 通过' : '❌ 失败');
  console.log('实验生成测试:', experimentTest ? '✅ 通过' : '❌ 失败');
  
  if (!connectionTest) {
    console.log('\n🔧 建议修复步骤:');
    console.log('1. 检查OPENAI_API_KEY是否正确');
    console.log('2. 检查OPENAI_BASE_URL是否可访问');
    console.log('3. 检查网络连接');
  } else if (!chatTest) {
    console.log('\n🔧 建议修复步骤:');
    console.log('1. 检查模型名称是否正确');
    console.log('2. 检查API密钥权限');
    console.log('3. 检查请求格式');
  } else if (!experimentTest) {
    console.log('\n🔧 建议修复步骤:');
    console.log('1. 调整系统提示词');
    console.log('2. 减少max_tokens');
    console.log('3. 检查响应格式');
  }
}

runAllTests().catch(console.error);