#!/usr/bin/env node

/**
 * 测试消息发送功能修复
 */

const API_BASE_URL = 'http://localhost:3002/api';

async function testMessageSendingFlow() {
  console.log('🧪 开始测试消息发送功能...\n');

  try {
    // 1. 测试获取对话列表
    console.log('1️⃣ 测试获取对话列表...');
    const conversationsResponse = await fetch(`${API_BASE_URL}/conversations`);
    
    if (!conversationsResponse.ok) {
      throw new Error(`获取对话列表失败: ${conversationsResponse.status}`);
    }
    
    const conversations = await conversationsResponse.json();
    console.log(`✅ 获取到 ${conversations.length} 个对话`);
    
    if (conversations.length === 0) {
      throw new Error('没有可用的对话进行测试');
    }
    
    const testConversation = conversations[0];
    console.log(`📝 使用对话: ${testConversation.id} - "${testConversation.title}"`);

    // 2. 测试创建用户消息
    console.log('\n2️⃣ 测试创建用户消息...');
    const userMessage = {
      conversation_id: testConversation.id,
      content: '请创建一个简单的物理实验演示',
      type: 'user'
    };
    
    const createUserMessageResponse = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userMessage)
    });
    
    if (!createUserMessageResponse.ok) {
      const errorData = await createUserMessageResponse.json();
      throw new Error(`创建用户消息失败: ${createUserMessageResponse.status} - ${errorData.error}`);
    }
    
    const userMessageData = await createUserMessageResponse.json();
    console.log(`✅ 用户消息创建成功: ${userMessageData.data.id}`);

    // 3. 测试创建助手消息（用于流式响应）
    console.log('\n3️⃣ 测试创建助手消息...');
    const assistantMessage = {
      conversation_id: testConversation.id,
      content: '',
      type: 'assistant'
    };
    
    const createAssistantMessageResponse = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assistantMessage)
    });
    
    if (!createAssistantMessageResponse.ok) {
      const errorData = await createAssistantMessageResponse.json();
      throw new Error(`创建助手消息失败: ${createAssistantMessageResponse.status} - ${errorData.error}`);
    }
    
    const assistantMessageData = await createAssistantMessageResponse.json();
    console.log(`✅ 助手消息创建成功: ${assistantMessageData.data.id}`);

    // 4. 测试流式API端点连通性
    console.log('\n4️⃣ 测试流式API端点连通性...');
    const streamRequest = {
      prompt: '创建一个简单的物理实验',
      conversation_id: testConversation.id,
      message_id: assistantMessageData.data.id
    };
    
    const streamResponse = await fetch(`${API_BASE_URL}/experiments/generate-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(streamRequest)
    });
    
    if (!streamResponse.ok) {
      const errorText = await streamResponse.text();
      throw new Error(`流式API调用失败: ${streamResponse.status} - ${errorText}`);
    }
    
    console.log(`✅ 流式API端点响应正常: ${streamResponse.status}`);
    
    // 读取少量流式数据以验证
    const reader = streamResponse.body?.getReader();
    if (reader) {
      console.log('📖 开始读取流式数据...');
      const decoder = new TextDecoder();
      let chunkCount = 0;
      
      try {
        for (let i = 0; i < 3; i++) { // 只读取前3个chunk
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          chunkCount++;
          console.log(`📦 收到chunk ${chunkCount}: ${chunk.substring(0, 50)}...`);
        }
        console.log(`✅ 流式数据读取正常，收到 ${chunkCount} 个chunk`);
      } finally {
        reader.releaseLock();
      }
    }

    // 5. 测试获取对话消息
    console.log('\n5️⃣ 测试获取对话消息...');
    const messagesResponse = await fetch(`${API_BASE_URL}/conversations/${testConversation.id}/messages`);
    
    if (!messagesResponse.ok) {
      throw new Error(`获取对话消息失败: ${messagesResponse.status}`);
    }
    
    const messages = await messagesResponse.json();
    console.log(`✅ 获取到 ${messages.length} 条消息`);

    console.log('\n🎉 所有测试通过！消息发送功能已修复！');
    
    return {
      success: true,
      results: {
        conversationsCount: conversations.length,
        userMessageId: userMessageData.data.id,
        assistantMessageId: assistantMessageData.data.id,
        messagesCount: messages.length,
        streamingWorking: true
      }
    };

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 运行测试
testMessageSendingFlow().then(result => {
  console.log('\n📊 测试结果:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});