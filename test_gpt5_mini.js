// 测试GPT-5-mini模型的代码生成质量
async function testGPT5Mini() {
  const testCases = [
    {
      name: "基础物理模拟",
      prompt: "创建一个简单的重力球模拟"
    },
    {
      name: "复杂交互",
      prompt: "创建一个可以拖拽的粒子系统，有碰撞检测"
    },
    {
      name: "动画效果",
      prompt: "创建一个彩色粒子爆炸效果，有渐变和淡出"
    }
  ];

  let passedTests = 0;
  const totalTests = testCases.length;

  console.log('🚀 开始测试 GPT-5-mini 模型的代码生成质量...\n');

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`📋 测试案例 ${i + 1}: ${testCase.name}`);
    console.log(`提示词: ${testCase.prompt}`);

    try {
      const response = await fetch('http://localhost:8765/api/experiments/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: testCase.prompt,
          model: 'openai/gpt-5-mini'
        })
      });

      if (!response.ok) {
        console.log(`❌ API请求失败: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const experiment = data.data || data;

      console.log(`标题: ${experiment.title || '未知'}`);
      console.log(`HTML长度: ${experiment.html_content?.length || 0}`);
      console.log(`CSS长度: ${experiment.css_content?.length || 0}`);
      console.log(`JS长度: ${experiment.js_content?.length || 0}`);

      // 检查JavaScript代码质量
      const jsCode = experiment.js_content || '';
      const hasConstError = jsCode.includes('const >') || jsCode.includes('const <');
      const hasIncompleteIf = /if\s*\([^)]*[^)]\s*\{/.test(jsCode);
      const hasHtmlTags = /<[a-zA-Z]/.test(jsCode);

      if (!hasConstError && !hasIncompleteIf && !hasHtmlTags && jsCode.length > 100) {
        console.log('✅ 代码质量检查通过');
        passedTests++;
      } else {
        console.log('❌ 代码质量检查失败:');
        if (hasConstError) console.log('  - 发现 const > 或 const < 错误');
        if (hasIncompleteIf) console.log('  - 发现不完整的if语句');
        if (hasHtmlTags) console.log('  - 发现HTML标签残留');
        if (jsCode.length <= 100) console.log('  - JavaScript代码过短');
      }

    } catch (error) {
      console.log(`❌ 测试失败: ${error.message}`);
    }

    console.log('---\n');
  }

  console.log(`🎯 测试结果: ${passedTests}/${totalTests} 通过 (${(passedTests/totalTests*100).toFixed(1)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！GPT-5-mini 模型工作正常');
  } else if (passedTests > totalTests * 0.7) {
    console.log('✅ 大部分测试通过，模型表现良好');
  } else {
    console.log('⚠️ 部分测试失败，可能需要进一步优化');
  }
}

testGPT5Mini().catch(console.error);