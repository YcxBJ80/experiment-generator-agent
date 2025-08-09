import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE_URL = 'http://localhost:3004/api';

async function debugMessageSending() {
  console.log('🔍 开始调试消息发送功能...\n');
  
  try {
    // 1. 创建测试对话
    console.log('1. 创建测试对话...');
    const createConvResponse = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '消息发送调试测试' })
    });
    
    const conversationData = await createConvResponse.json();
    console.log('✅ 对话创建成功:', conversationData.id);
    
    // 2. 发送用户消息
    console.log('\n2. 发送用户消息...');
    const userMessageResponse = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationData.id,
        content: '创建一个简单的物理实验',
        type: 'user'
      })
    });
    
    const userMessageData = await userMessageResponse.json();
    console.log('✅ 用户消息发送成功:', userMessageData.id);
    
    // 3. 测试实验生成（这是关键步骤）
    console.log('\n3. 测试实验生成...');
    console.log('正在调用实验生成API，这可能需要一些时间...');
    
    const experimentResponse = await fetch(`${API_BASE_URL}/experiments/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '创建一个简单的物理实验',
        conversation_id: conversationData.id
      })
    });
    
    if (experimentResponse.ok) {
      const experimentData = await experimentResponse.json();
      console.log('✅ 实验生成成功:', experimentData.experiment_id);
      
      // 4. 发送助手消息
      console.log('\n4. 发送助手消息...');
      const assistantMessageResponse = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationData.id,
          content: '我已经为您创建了一个实验演示',
          type: 'assistant',
          experiment_id: experimentData.experiment_id,
          html_content: experimentData.html_content,
          css_content: experimentData.css_content,
          js_content: experimentData.js_content
        })
      });
      
      const assistantMessageData = await assistantMessageResponse.json();
      console.log('✅ 助手消息发送成功:', assistantMessageData.id);
      
    } else {
      const errorData = await experimentResponse.json();
      console.log('❌ 实验生成失败:', errorData);
      
      // 发送错误消息
      const errorMessageResponse = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationData.id,
          content: `抱歉，生成实验时出现错误：${errorData.error || '未知错误'}`,
          type: 'assistant'
        })
      });
      
      const errorMessageData = await errorMessageResponse.json();
      console.log('✅ 错误消息发送成功:', errorMessageData.id);
    }
    
    // 5. 验证消息历史
    console.log('\n5. 验证消息历史...');
    const messagesResponse = await fetch(`${API_BASE_URL}/conversations/${conversationData.id}/messages`);
    const messages = await messagesResponse.json();
    console.log(`✅ 获取到 ${messages.length} 条消息`);
    
    messages.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.type}] ${msg.content.substring(0, 50)}...`);
    });
    
    console.log('\n🎉 消息发送功能测试完成！');
    console.log('如果您在前端仍然无法发送消息，可能是前端代码的问题。');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行调试
debugMessageSending().catch(console.error);