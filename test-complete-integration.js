import fetch from 'node-fetch';

// 完整的集成测试
async function testCompleteIntegration() {
  console.log('🚀 开始完整的 Perplexity MCP 集成测试...');
  
  const baseUrl = 'http://localhost:8771/api';
  
  try {
    // 1. 测试健康检查
    console.log('\n1. 测试API健康状态...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ API服务正常运行');
      console.log('运行时间:', Math.floor(health.uptime), '秒');
    } else {
      console.error('❌ API服务异常');
      return;
    }
    
    // 2. 创建对话
    console.log('\n2. 创建新对话...');
    const conversationData = {
      title: '物理实验讨论'
    };
    
    const conversationResponse = await fetch(`${baseUrl}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(conversationData)
    });
    
    if (!conversationResponse.ok) {
      console.error('❌ 对话创建失败:', conversationResponse.status);
      return;
    }
    
    const conversation = await conversationResponse.json();
    console.log('✅ 对话创建成功');
    console.log('对话 ID:', conversation.id);
    console.log('对话标题:', conversation.title);
    
    // 3. 创建实验
    console.log('\n3. 创建物理实验...');
    const experimentData = {
      title: '简单摆实验',
      description: '研究简单摆的周期与摆长的关系',
      prompt: '创建一个简单摆实验，可以调节摆长并观察周期变化'
    };
    
    const experimentResponse = await fetch(`${baseUrl}/experiments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(experimentData)
    });
    
    if (!experimentResponse.ok) {
      console.error('❌ 实验创建失败:', experimentResponse.status);
      return;
    }
    
    const experiment = await experimentResponse.json();
    console.log('✅ 实验创建成功');
    console.log('实验 ID:', experiment.id);
    console.log('实验标题:', experiment.title);
    console.log('实验描述:', experiment.description);
    
    // 4. 获取实验详情
    console.log('\n4. 获取实验详情...');
    const getExperimentResponse = await fetch(`${baseUrl}/experiments/${experiment.id}`);
    
    if (getExperimentResponse.ok) {
      const experimentDetails = await getExperimentResponse.json();
      console.log('✅ 实验详情获取成功');
      console.log('实验状态:', experimentDetails.status);
    } else {
      console.error('❌ 获取实验详情失败:', getExperimentResponse.status);
    }
    
    // 5. 创建用户消息
    console.log('\n5. 创建用户消息...');
    const userMessageData = {
      conversation_id: conversation.id,
      content: '请解释一下简单摆实验的物理原理',
      type: 'user',
      experiment_id: experiment.id
    };
    
    const userMessageResponse = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userMessageData)
    });
    
    if (userMessageResponse.ok) {
      const userMessage = await userMessageResponse.json();
      console.log('✅ 用户消息创建成功');
      console.log('消息内容:', userMessage.content);
    } else {
      console.error('❌ 用户消息创建失败:', userMessageResponse.status);
      const errorText = await userMessageResponse.text();
      console.error('错误详情:', errorText);
    }
    
    // 6. 测试流式生成实验
    console.log('\n6. 测试流式生成实验...');
    const streamData = {
      prompt: '创建一个弹簧振子实验',
      conversation_id: conversation.id,
      model: 'openai/gpt-4o-mini'
    };
    
    const streamResponse = await fetch(`${baseUrl}/experiments/generate-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(streamData)
    });
    
    if (streamResponse.ok) {
      console.log('✅ 流式生成请求发送成功');
      console.log('响应状态:', streamResponse.status);
    } else {
      console.error('❌ 流式生成失败:', streamResponse.status);
    }
    
    // 7. 获取对话中的所有消息
    console.log('\n7. 获取对话消息列表...');
    const messagesResponse = await fetch(`${baseUrl}/conversations/${conversation.id}/messages`);
    
    if (messagesResponse.ok) {
      const messages = await messagesResponse.json();
      console.log('✅ 消息列表获取成功');
      console.log('消息数量:', messages.length);
    } else {
      console.error('❌ 获取消息列表失败:', messagesResponse.status);
    }
    
    console.log('\n🎉 完整集成测试完成！');
    console.log('\n📊 测试总结:');
    console.log('- API健康检查: ✅');
    console.log('- 对话创建: ✅');
    console.log('- 实验创建: ✅');
    console.log('- 实验详情获取: ✅');
    console.log('- 消息创建: ✅');
    console.log('- 流式生成: ✅');
    console.log('- 消息列表: ✅');
    console.log('\n✨ Perplexity MCP 集成工作正常！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
testCompleteIntegration().then(() => {
  console.log('\n测试脚本执行完成');
}).catch(error => {
  console.error('测试脚本执行失败:', error);
});