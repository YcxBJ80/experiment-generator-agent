#!/usr/bin/env node

/**
 * 诊断消息发送功能的问题
 */

const API_BASE_URL = 'http://localhost:3002/api';

async function debugMessageSending() {
  console.log('🔍 开始诊断消息发送功能...\n');
  
  try {
    // 1. 测试基础API连接
    console.log('1️⃣ 测试基础API连接...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    console.log('健康检查状态:', healthResponse.status);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ API连接正常:', healthData);
    } else {
      console.log('❌ API连接失败');
      return;
    }
    
    // 2. 测试获取对话列表
    console.log('\n2️⃣ 测试获取对话列表...');
    const conversationsResponse = await fetch(`${API_BASE_URL}/conversations`);
    console.log('对话列表状态:', conversationsResponse.status);
    if (conversationsResponse.ok) {
      const conversations = await conversationsResponse.json();
      console.log('✅ 获取到对话数量:', Array.isArray(conversations) ? conversations.length : 0);
      
      // 使用第一个对话或创建新对话
      let conversationId;
      if (Array.isArray(conversations) && conversations.length > 0) {
        conversationId = conversations[0].id;
        console.log('📝 使用现有对话:', conversationId);
      } else {
        // 创建新对话
        console.log('\n3️⃣ 创建新对话...');
        const createResponse = await fetch(`${API_BASE_URL}/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: '测试对话' })
        });
        
        if (createResponse.ok) {
          const newConv = await createResponse.json();
          conversationId = newConv.id;
          console.log('✅ 创建新对话成功:', conversationId);
        } else {
          console.log('❌ 创建对话失败');
          return;
        }
      }
      
      // 4. 测试创建用户消息
      console.log('\n4️⃣ 测试创建用户消息...');
      const userMessageResponse = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: '创建一个简单的物理实验',
          type: 'user'
        })
      });
      
      console.log('用户消息状态:', userMessageResponse.status);
      if (userMessageResponse.ok) {
        const userMessage = await userMessageResponse.json();
        console.log('✅ 用户消息创建成功:', userMessage.id);
      } else {
        const errorText = await userMessageResponse.text();
        console.log('❌ 用户消息创建失败:', errorText);
        return;
      }
      
      // 5. 测试创建助手消息
      console.log('\n5️⃣ 测试创建助手消息...');
      const assistantMessageResponse = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: '',
          type: 'assistant'
        })
      });
      
      console.log('助手消息状态:', assistantMessageResponse.status);
      if (assistantMessageResponse.ok) {
        const assistantMessage = await assistantMessageResponse.json();
        console.log('✅ 助手消息创建成功:', assistantMessage.id);
        
        // 6. 测试流式API端点
        console.log('\n6️⃣ 测试流式API端点...');
        console.log('尝试调用:', `${API_BASE_URL}/experiments/generate-stream`);
        
        try {
          const streamResponse = await fetch(`${API_BASE_URL}/experiments/generate-stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: '创建一个简单的物理实验',
              conversation_id: conversationId,
              message_id: assistantMessage.id
            })
          });
          
          console.log('流式API状态:', streamResponse.status);
          console.log('响应头:', Object.fromEntries(streamResponse.headers.entries()));
          
          if (streamResponse.ok) {
            console.log('✅ 流式API连接成功');
            
            // 读取一小部分流式数据
            const reader = streamResponse.body?.getReader();
            if (reader) {
              const decoder = new TextDecoder();
              let chunkCount = 0;
              
              try {
                while (chunkCount < 3) { // 只读取前3个chunk
                  const { done, value } = await reader.read();
                  if (done) break;
                  
                  const chunk = decoder.decode(value, { stream: true });
                  console.log(`📦 收到chunk ${++chunkCount}:`, chunk.substring(0, 100) + '...');
                }
                console.log('✅ 流式数据读取正常');
              } finally {
                reader.releaseLock();
              }
            }
          } else {
            const errorText = await streamResponse.text();
            console.log('❌ 流式API失败:', errorText);
          }
        } catch (streamError) {
          console.log('❌ 流式API调用异常:', streamError.message);
        }
        
      } else {
        const errorText = await assistantMessageResponse.text();
        console.log('❌ 助手消息创建失败:', errorText);
      }
      
    } else {
      console.log('❌ 获取对话列表失败');
    }
    
  } catch (error) {
    console.error('❌ 诊断过程中出现错误:', error);
  }
}

// 运行诊断
debugMessageSending().catch(console.error);