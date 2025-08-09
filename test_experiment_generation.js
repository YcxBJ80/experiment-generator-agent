// 使用内置的fetch API

async function testExperimentGeneration() {
  console.log('🧪 测试实验生成功能...');
  
  const testPrompt = '弹簧振子';
  
  try {
    const start = Date.now();
    
    const response = await fetch('http://localhost:8766/api/experiments/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: testPrompt
      })
    });
    
    const duration = Date.now() - start;
    
    console.log('⏱️ 请求耗时:', duration + 'ms');
    console.log('📊 HTTP状态码:', response.status);
    console.log('📊 HTTP状态文本:', response.statusText);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ 实验生成成功！');
      console.log('📝 实验标题:', data.data.title);
      console.log('📝 实验描述:', data.data.description);
      console.log('📝 HTML内容长度:', data.data.html_content?.length || 0);
      console.log('📝 CSS内容长度:', data.data.css_content?.length || 0);
      console.log('📝 JS内容长度:', data.data.js_content?.length || 0);
      console.log('📝 参数数量:', data.data.parameters?.length || 0);
      
      // 显示HTML内容的前200个字符
      if (data.data.html_content) {
        console.log('📝 HTML内容预览:');
        console.log(data.data.html_content.substring(0, 200) + '...');
      }
      
    } else {
      console.error('❌ 实验生成失败:');
      console.error('错误信息:', data.error);
    }
    
  } catch (error) {
    console.error('❌ 请求失败:');
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
  }
}

testExperimentGeneration();