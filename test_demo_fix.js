// 测试Demo页面修复效果
console.log('🎯 测试Demo页面修复效果...');

async function testDemoPageFix() {
  try {
    // 1. 创建新对话
    console.log('\n1️⃣ 创建新对话...');
    const conversationResponse = await fetch('http://localhost:8766/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Demo测试对话' })
    });
    
    if (!conversationResponse.ok) {
      throw new Error(`创建对话失败: ${conversationResponse.status}`);
    }
    
    const conversationData = await conversationResponse.json();
    const conversationId = conversationData.id;
    console.log(`✅ 对话创建成功，ID: ${conversationId}`);

    // 2. 发送用户消息
    console.log('\n2️⃣ 发送用户消息...');
    const userMessageResponse = await fetch('http://localhost:8766/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        content: '创建一个弹球游戏',
        type: 'user'
      })
    });
    
    if (!userMessageResponse.ok) {
      throw new Error(`发送用户消息失败: ${userMessageResponse.status}`);
    }
    
    const userMessageData = await userMessageResponse.json();
    console.log(`✅ 用户消息发送成功，ID: ${userMessageData.id}`);

    // 3. 创建空的助手消息
    console.log('\n3️⃣ 创建空的助手消息...');
    const assistantMessageResponse = await fetch('http://localhost:8766/api/messages', {
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
    console.log(`✅ 助手消息创建成功，ID: ${assistantMessageData.id}`);

    // 4. 调用流式API生成实验
    console.log('\n4️⃣ 调用流式API生成实验...');
    const streamResponse = await fetch('http://localhost:8766/api/experiments/generate-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '创建一个弹球游戏',
        conversation_id: conversationId,
        message_id: assistantMessageData.id
      })
    });

    if (!streamResponse.ok) {
      throw new Error(`流式API调用失败: ${streamResponse.status}`);
    }

    let fullContent = '';
    let chunkCount = 0;
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();

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

    // 5. 等待后端处理
    console.log('\n5️⃣ 等待后端处理...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. 检查消息更新结果
    console.log('\n6️⃣ 检查消息更新结果...');
    const updatedMessagesResponse = await fetch(`http://localhost:8766/api/conversations/${conversationId}/messages`);
    
    if (!updatedMessagesResponse.ok) {
      throw new Error(`获取更新消息失败: ${updatedMessagesResponse.status}`);
    }
    
    const updatedMessages = await updatedMessagesResponse.json();
    const updatedAssistantMessage = updatedMessages.find(msg => msg.id === assistantMessageData.id);
    
    if (updatedAssistantMessage && updatedAssistantMessage.experiment_id) {
      console.log('✅ 消息已成功更新experiment_id');
      console.log(`🔬 实验ID: ${updatedAssistantMessage.experiment_id}`);
      console.log(`📄 消息内容长度: ${updatedAssistantMessage.content?.length || 0}`);
      console.log(`🎨 HTML内容长度: ${updatedAssistantMessage.html_content?.length || 0}`);
      
      // 7. 测试API获取实验
      console.log('\n7️⃣ 测试API获取实验...');
      const experimentResponse = await fetch(`http://localhost:8766/api/experiments/${updatedAssistantMessage.experiment_id}`);
      
      if (experimentResponse.ok) {
        const experimentData = await experimentResponse.json();
        if (experimentData.success && experimentData.data) {
          console.log('✅ API获取实验成功');
          console.log(`📋 实验标题: ${experimentData.data.title}`);
          console.log(`🎨 HTML内容长度: ${experimentData.data.html_content?.length || 0}`);
          console.log(`🎯 实验ID匹配: ${experimentData.data.experiment_id === updatedAssistantMessage.experiment_id}`);
          
          // 8. 检查HTML内容是否包含弹球游戏相关内容
          console.log('\n8️⃣ 检查HTML内容...');
          const htmlContent = experimentData.data.html_content || '';
          const hasCanvas = htmlContent.includes('canvas') || htmlContent.includes('Canvas');
          const hasBall = htmlContent.includes('ball') || htmlContent.includes('Ball') || htmlContent.includes('弹球');
          const hasGame = htmlContent.includes('game') || htmlContent.includes('Game') || htmlContent.includes('游戏');
          
          console.log(`🎨 包含Canvas: ${hasCanvas}`);
          console.log(`⚽ 包含Ball: ${hasBall}`);
          console.log(`🎮 包含Game: ${hasGame}`);
          
          if (hasCanvas && (hasBall || hasGame)) {
            console.log('🎉 HTML内容验证通过 - 包含弹球游戏相关元素');
          } else {
            console.log('⚠️  HTML内容可能不是弹球游戏');
          }
          
          console.log('\n🎯 Demo页面修复测试完成！');
          console.log(`🔗 可以访问: http://localhost:5174/demo/${updatedAssistantMessage.experiment_id}`);
          
        } else {
          console.log('❌ API返回数据格式错误');
        }
      } else {
        console.log(`❌ API获取实验失败: ${experimentResponse.status}`);
      }
      
    } else {
      console.log('❌ 消息未更新experiment_id');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testDemoPageFix();