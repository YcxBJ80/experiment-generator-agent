// 简单的API测试
async function testAPI() {
  try {
    console.log('测试API健康检查...');
    const response = await fetch('http://localhost:8765/api/health');
    const data = await response.json();
    console.log('健康检查结果:', data);
    
    console.log('\n测试实验生成...');
    const expResponse = await fetch('http://localhost:8765/api/experiments/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '创建一个简单的弹球游戏',
        model: 'openai/gpt-5-mini'
      })
    });
    
    if (expResponse.ok) {
      const expData = await expResponse.json();
      console.log('实验生成成功:', expData.data?.title || '无标题');
    } else {
      console.log('实验生成失败:', expResponse.status, expResponse.statusText);
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testAPI();