/**
 * 测试流式响应和experiment_id修复
 * 这个脚本会模拟完整的流程：创建对话 -> 发送消息 -> 流式生成 -> 验证experiment_id
 */

const API_BASE_URL = 'http://localhost:8766/api';

async function testExperimentIdFix() {
  console.log('🧪 开始测试流式响应和experiment_id修复...\n');
  
  try {
    // 1. 创建新对话
    console.log('1️⃣ 创建新对话...');
    const conversationResponse = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '测试流式响应修复' })
    });
    
    if (!conversationResponse.ok) {
      throw new Error(`创建对话失败: ${conversationResponse.status}`);
    }
    
    const conversationData = await conversationResponse.json();
    console.log('对话创建响应:', conversationData);
    const conversationId = conversationData.id;
    console.log('✅ 对话创建成功，ID:', conversationId);
    
    // 2. 创建用户消息
    console.log('\n2️⃣ 创建用户消息...');
    const userMessageResponse = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        content: '创建一个简单的弹球游戏演示',
        type: 'user'
      })
    });
    
    if (!userMessageResponse.ok) {
      throw new Error(`创建用户消息失败: ${userMessageResponse.status}`);
    }
    
    const userMessageData = await userMessageResponse.json();
    console.log('✅ 用户消息创建成功，ID:', userMessageData.id);
    
    // 3. 创建空的助手消息
    console.log('\n3️⃣ 创建空的助手消息...');
    const assistantMessageResponse = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        content: '',
        type: 'assistant'
      })
    });
    
    if (!assistantMessageResponse.ok) {
      throw new Error(`创建助手消息失败: ${assistantMessageResponse.status}`);
    }
    
    const assistantMessageData = await assistantMessageResponse.json();
    const assistantMessageId = assistantMessageData.id;
    console.log('✅ 助手消息创建成功，ID:', assistantMessageId);
    
    // 4. 调用流式API
    console.log('\n4️⃣ 调用流式API生成实验...');
    const streamResponse = await fetch(`${API_BASE_URL}/experiments/generate-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '创建一个简单的弹球游戏演示',
        conversation_id: conversationId,
        message_id: assistantMessageId
      })
    });
    
    if (!streamResponse.ok) {
      throw new Error(`流式API调用失败: ${streamResponse.status}`);
    }
    
    console.log('📡 开始接收流式数据...');
    const reader = streamResponse.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应流');
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    let fullContent = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log(`✅ 流式数据接收完成，总chunk数: ${chunkCount}`);
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() && line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data !== '[DONE]') {
              chunkCount++;
              fullContent += data;
              if (chunkCount % 20 === 0) {
                console.log(`📦 已接收 ${chunkCount} 个chunks...`);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    console.log(`📝 生成内容长度: ${fullContent.length} 字符`);
    
    // 5. 等待后端处理完成
    console.log('\n5️⃣ 等待后端处理实验数据...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 6. 检查消息是否已更新experiment_id
    console.log('\n6️⃣ 检查消息是否已更新experiment_id...');
    const updatedMessagesResponse = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`);
    
    if (!updatedMessagesResponse.ok) {
      throw new Error(`获取消息失败: ${updatedMessagesResponse.status}`);
    }
    
    const updatedMessages = await updatedMessagesResponse.json();
    const updatedAssistantMessage = updatedMessages.find(msg => msg.id === assistantMessageId);
    
    if (updatedAssistantMessage && updatedAssistantMessage.experiment_id) {
      console.log('✅ 测试成功！消息已更新experiment_id:', updatedAssistantMessage.experiment_id);
      console.log('📝 消息内容长度:', updatedAssistantMessage.content.length);
      console.log('🧪 实验ID:', updatedAssistantMessage.experiment_id);
      return true;
    } else {
      console.log('❌ 测试失败：消息未更新experiment_id');
      console.log('消息详情:', updatedAssistantMessage);
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testExperimentIdFix();