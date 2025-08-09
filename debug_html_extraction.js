const API_BASE = 'http://localhost:8766/api';

async function debugHtmlExtraction() {
  console.log('🔍 开始调试HTML代码提取逻辑...\n');

  try {
    // 1. 创建新对话
    console.log('1️⃣ 创建新对话...');
    const conversationResponse = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '调试HTML提取' })
    });
    
    const conversationData = await conversationResponse.json();
    const conversationId = conversationData.id;
    console.log('✅ 对话创建成功，ID:', conversationId);

    // 2. 发送用户消息
    console.log('\n2️⃣ 发送用户消息...');
    const userMessageResponse = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        content: '创建一个简单的弹球游戏',
        type: 'user'
      })
    });
    
    const userMessageData = await userMessageResponse.json();
    console.log('✅ 用户消息发送成功，ID:', userMessageData.id);

    // 3. 创建空的助手消息
    console.log('\n3️⃣ 创建空的助手消息...');
    const assistantMessageResponse = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        content: '',
        type: 'assistant'
      })
    });
    
    const assistantMessageData = await assistantMessageResponse.json();
    const assistantMessageId = assistantMessageData.id;
    console.log('✅ 助手消息创建成功，ID:', assistantMessageId);

    // 4. 调用流式API
    console.log('\n4️⃣ 调用流式API生成实验...');
    const streamResponse = await fetch(`${API_BASE}/experiments/generate-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '创建一个简单的弹球游戏',
        conversation_id: conversationId,
        message_id: assistantMessageId
      })
    });

    if (!streamResponse.ok) {
      throw new Error(`流式API调用失败: ${streamResponse.status}`);
    }

    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            console.log('✅ 流式数据接收完成');
            break;
          }
          if (data.trim()) {
            fullContent += data;
            chunkCount++;
            
            if (chunkCount % 1000 === 0) {
              console.log(`📦 已接收 ${chunkCount} 个chunks...`);
            }
          }
        }
      }
    }

    console.log(`📝 生成内容总长度: ${fullContent.length} 字符`);
    console.log(`📦 总chunk数: ${chunkCount}`);

    // 5. 分析生成的内容
    console.log('\n5️⃣ 分析生成的内容...');
    
    // 检查是否包含HTML代码块
    const htmlMatches = fullContent.match(/```html\s*([\s\S]*?)\s*```/g);
    console.log('HTML代码块数量:', htmlMatches ? htmlMatches.length : 0);
    
    if (htmlMatches) {
      htmlMatches.forEach((match, index) => {
        const htmlContent = match.match(/```html\s*([\s\S]*?)\s*```/)[1].trim();
        console.log(`HTML代码块 ${index + 1} 长度:`, htmlContent.length);
        console.log(`HTML代码块 ${index + 1} 开头:`, htmlContent.substring(0, 200) + '...');
      });
    } else {
      console.log('❌ 未找到HTML代码块！');
      console.log('内容开头:', fullContent.substring(0, 500));
      console.log('内容结尾:', fullContent.substring(fullContent.length - 500));
      
      // 检查是否有其他格式的代码块
      const codeBlocks = fullContent.match(/```[\s\S]*?```/g);
      if (codeBlocks) {
        console.log('找到的代码块类型:');
        codeBlocks.forEach((block, index) => {
          const type = block.match(/```(\w+)/);
          console.log(`代码块 ${index + 1}:`, type ? type[1] : '未知类型');
        });
      }
    }

    // 6. 等待后端处理
    console.log('\n6️⃣ 等待后端处理...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 7. 检查消息更新结果
    console.log('\n7️⃣ 检查消息更新结果...');
    const updatedMessagesResponse = await fetch(`${API_BASE}/conversations/${conversationId}/messages`);
    const updatedMessages = await updatedMessagesResponse.json();
    
    const updatedAssistantMessage = updatedMessages.find(msg => msg.id === assistantMessageId);
    
    console.log('消息更新结果:');
    console.log('- content长度:', updatedAssistantMessage.content.length);
    console.log('- experiment_id:', updatedAssistantMessage.experiment_id || '❌ 未设置');
    console.log('- html_content长度:', updatedAssistantMessage.html_content?.length || 0);
    
    if (updatedAssistantMessage.html_content) {
      console.log('- html_content开头:', updatedAssistantMessage.html_content.substring(0, 200) + '...');
    }

  } catch (error) {
    console.error('❌ 调试失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行调试
debugHtmlExtraction().catch(console.error);