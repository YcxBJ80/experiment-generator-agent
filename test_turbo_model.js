// 使用内置的fetch API (Node.js 18+)

async function testTurboModel() {
  try {
    console.log('开始测试 GPT-5-mini 模型...');
    
    const response = await fetch('http://localhost:8765/api/experiments/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: '创建一个简单的弹球游戏，有重力和弹性效果',
        model: 'openai/gpt-5-mini'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 请求成功');
      console.log('标题:', data.data.title);
      console.log('描述:', data.data.description);
      console.log('HTML长度:', data.data.html_content.length);
      console.log('CSS长度:', data.data.css_content.length);
      console.log('JS长度:', data.data.js_content.length);
      console.log('参数数量:', data.data.parameters.length);
      console.log('尝试次数:', data.attempts);
      
      // 检查JavaScript代码是否有明显的语法错误
      const jsCode = data.data.js_content;
      console.log('\n--- JavaScript代码检查 ---');
      console.log('前500字符:', jsCode.substring(0, 500));
      
      // 简单的语法检查
      const syntaxIssues = [];
      if (jsCode.includes('const >')) syntaxIssues.push('发现 "const >" 语法错误');
      if (jsCode.includes('let >')) syntaxIssues.push('发现 "let >" 语法错误');
      if (jsCode.includes('y+r > =')) syntaxIssues.push('发现 "y+r > =" 语法错误');
      if (jsCode.includes('ball.x-ball.rcanvas')) syntaxIssues.push('发现缺少操作符的错误');
      if (jsCode.includes('ball.y-ball.r{')) syntaxIssues.push('发现缺少操作符的错误');
      
      if (syntaxIssues.length > 0) {
        console.log('❌ 发现语法问题:');
        syntaxIssues.forEach(issue => console.log('  -', issue));
      } else {
        console.log('✅ 未发现明显的语法错误');
      }
      
    } else {
      console.log('❌ 请求失败:', data.error);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testTurboModel();