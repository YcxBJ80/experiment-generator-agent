import fetch from 'node-fetch';

// 测试后端 Perplexity MCP 集成
async function testBackendPerplexity() {
  console.log('开始测试后端 Perplexity MCP 集成...');
  
  const baseUrl = 'http://localhost:8771/api';
  
  try {
    // 1. 测试创建实验（会触发 Perplexity MCP 调用）
    console.log('\n1. 测试创建实验...');
    
    const experimentData = {
      title: '测试物理实验',
      description: '这是一个测试实验，用于验证 Perplexity MCP 集成',
      prompt: '简单的物理实验'
    };
    
    const createResponse = await fetch(`${baseUrl}/experiments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(experimentData)
    });
    
    if (createResponse.ok) {
      const experiment = await createResponse.json();
      console.log('✅ 实验创建成功');
      console.log('实验 ID:', experiment.id);
      console.log('知识内容长度:', experiment.knowledge?.length || 0);
      
      // 2. 测试获取实验详情
      console.log('\n2. 测试获取实验详情...');
      
      const getResponse = await fetch(`${baseUrl}/experiments/${experiment.id}`);
      
      if (getResponse.ok) {
        const experimentDetails = await getResponse.json();
        console.log('✅ 获取实验详情成功');
        console.log('知识内容预览:', experimentDetails.knowledge?.substring(0, 100) + '...');
      } else {
        console.error('❌ 获取实验详情失败:', getResponse.status);
      }
      
      // 3. 首先创建一个对话
      console.log('\n3. 创建对话...');
      
      const conversationData = {
        title: '测试对话'
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
      console.log('✅ 对话创建成功, ID:', conversation.id);
      
      // 4. 测试创建消息（会触发 Perplexity MCP 调用）
      console.log('\n4. 测试创建消息...');
      
      const messageData = {
        conversation_id: conversation.id,
        content: '请解释一下这个实验的原理',
        type: 'user',
        experiment_id: experiment.id
      };
      
      const messageResponse = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });
      
      if (messageResponse.ok) {
        const message = await messageResponse.json();
        console.log('✅ 消息创建成功');
        console.log('消息 ID:', message.id);
        console.log('回复内容预览:', message.response?.substring(0, 100) + '...');
      } else {
        console.error('❌ 消息创建失败:', messageResponse.status);
        const errorText = await messageResponse.text();
        console.error('错误详情:', errorText);
      }
      
    } else {
      console.error('❌ 实验创建失败:', createResponse.status);
      const errorText = await createResponse.text();
      console.error('错误详情:', errorText);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testBackendPerplexity().then(() => {
  console.log('\n测试完成');
}).catch(error => {
  console.error('测试失败:', error);
});