// 全面系统测试脚本
import fs from 'fs';

class SystemTester {
  constructor() {
    this.testResults = [];
    this.baseUrl = 'http://localhost:8765';
    this.frontendUrl = 'http://localhost:5177';
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    this.testResults.push({ timestamp, type, message });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 测试1: API服务器连通性
  async testApiConnectivity() {
    this.log('🔍 测试API服务器连通性...');
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (response.ok) {
        this.log('✅ API服务器连通性正常', 'success');
        return true;
      } else {
        this.log(`❌ API服务器响应异常: ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ API服务器连接失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 测试2: 实验生成功能
  async testExperimentGeneration() {
    this.log('🧪 测试实验生成功能...');
    const testCases = [
      {
        name: '简单物理模拟',
        prompt: '创建一个弹球游戏',
        expectedMinLength: 1000
      },
      {
        name: '复杂交互系统',
        prompt: '创建一个粒子系统，支持鼠标交互',
        expectedMinLength: 2000
      },
      {
        name: '数学可视化',
        prompt: '创建一个正弦波动画',
        expectedMinLength: 800
      }
    ];

    let passedTests = 0;
    for (const testCase of testCases) {
      try {
        this.log(`  测试案例: ${testCase.name}`);
        const response = await fetch(`${this.baseUrl}/api/experiments/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: testCase.prompt,
            model: 'openai/gpt-5-mini'
          })
        });

        if (!response.ok) {
          this.log(`  ❌ ${testCase.name} - API请求失败: ${response.status}`, 'error');
          continue;
        }

        const data = await response.json();
        const experiment = data.data || data;

        // 检查必要字段
        const requiredFields = ['title', 'description', 'html_content', 'css_content', 'js_content'];
        const missingFields = requiredFields.filter(field => !experiment[field]);
        
        if (missingFields.length > 0) {
          this.log(`  ❌ ${testCase.name} - 缺少字段: ${missingFields.join(', ')}`, 'error');
          continue;
        }

        // 检查内容长度
        const totalLength = experiment.html_content.length + experiment.css_content.length + experiment.js_content.length;
        if (totalLength < testCase.expectedMinLength) {
          this.log(`  ❌ ${testCase.name} - 内容过短: ${totalLength} < ${testCase.expectedMinLength}`, 'error');
          continue;
        }

        // 检查JavaScript语法
        const jsCode = experiment.js_content;
        const syntaxIssues = this.checkJavaScriptSyntax(jsCode);
        if (syntaxIssues.length > 0) {
          this.log(`  ❌ ${testCase.name} - JavaScript语法问题: ${syntaxIssues.join(', ')}`, 'error');
          continue;
        }

        this.log(`  ✅ ${testCase.name} - 测试通过`, 'success');
        passedTests++;

      } catch (error) {
        this.log(`  ❌ ${testCase.name} - 异常: ${error.message}`, 'error');
      }

      await this.delay(1000); // 避免请求过快
    }

    this.log(`🧪 实验生成测试完成: ${passedTests}/${testCases.length} 通过`);
    return passedTests === testCases.length;
  }

  // 测试3: JavaScript语法检查
  checkJavaScriptSyntax(code) {
    const issues = [];
    
    // 检查常见语法错误
    if (code.includes('const >') || code.includes('const <')) {
      issues.push('变量声明语法错误');
    }
    
    if (/if\s*\([^)]*[^)]\s*\{/.test(code)) {
      issues.push('不完整的if语句');
    }
    
    if (/<[a-zA-Z]/.test(code)) {
      issues.push('HTML标签残留');
    }
    
    // 检查括号匹配
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push('花括号不匹配');
    }
    
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push('圆括号不匹配');
    }
    
    return issues;
  }

  // 测试4: 环境配置检查
  async testEnvironmentConfig() {
    this.log('⚙️ 测试环境配置...');
    
    try {
      // 检查.env文件
      if (!fs.existsSync('.env')) {
        this.log('❌ .env文件不存在', 'error');
        return false;
      }
      
      const envContent = fs.readFileSync('.env', 'utf8');
      const requiredVars = ['OPENAI_API_KEY', 'OPENAI_BASE_URL'];
      const missingVars = requiredVars.filter(varName => !envContent.includes(varName));
      
      if (missingVars.length > 0) {
        this.log(`❌ 缺少环境变量: ${missingVars.join(', ')}`, 'error');
        return false;
      }
      
      // 检查API密钥格式
      if (envContent.includes('你的_OpenRouter_API_密钥')) {
        this.log('❌ API密钥未正确配置', 'error');
        return false;
      }
      
      this.log('✅ 环境配置检查通过', 'success');
      return true;
      
    } catch (error) {
      this.log(`❌ 环境配置检查失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 测试5: 文件结构完整性
  async testFileStructure() {
    this.log('📁 测试文件结构完整性...');
    
    const requiredFiles = [
      'package.json',
      'api/server.ts',
      'api/routes/experiments.ts',
      'api/lib/jsValidator.ts',
      'src/App.tsx',
      'src/pages/Home.tsx',
      'src/pages/Demo.tsx'
    ];
    
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
    
    if (missingFiles.length > 0) {
      this.log(`❌ 缺少文件: ${missingFiles.join(', ')}`, 'error');
      return false;
    }
    
    this.log('✅ 文件结构完整性检查通过', 'success');
    return true;
  }

  // 测试6: 前端页面可访问性
  async testFrontendAccessibility() {
    this.log('🌐 测试前端页面可访问性...');
    
    try {
      const response = await fetch(this.frontendUrl);
      if (response.ok) {
        this.log('✅ 前端页面可访问', 'success');
        return true;
      } else {
        this.log(`❌ 前端页面访问失败: ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ 前端页面连接失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 测试7: 错误处理机制
  async testErrorHandling() {
    this.log('🚨 测试错误处理机制...');
    
    const errorTests = [
      {
        name: '空提示词',
        payload: { prompt: '', model: 'openai/gpt-5-mini' },
        expectedStatus: 400
      },
      {
        name: '无效模型',
        payload: { prompt: '测试', model: 'invalid-model' },
        expectedStatus: [400, 500] // 可能是400或500
      }
    ];
    
    let passedTests = 0;
    for (const test of errorTests) {
      try {
        const response = await fetch(`${this.baseUrl}/api/experiments/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(test.payload)
        });
        
        const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
        if (expectedStatuses.includes(response.status)) {
          this.log(`  ✅ ${test.name} - 错误处理正确`, 'success');
          passedTests++;
        } else {
          this.log(`  ❌ ${test.name} - 期望状态码 ${test.expectedStatus}, 实际 ${response.status}`, 'error');
        }
      } catch (error) {
        this.log(`  ❌ ${test.name} - 测试异常: ${error.message}`, 'error');
      }
    }
    
    this.log(`🚨 错误处理测试完成: ${passedTests}/${errorTests.length} 通过`);
    return passedTests === errorTests.length;
  }

  // 生成测试报告
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_tests: this.testResults.filter(r => r.type === 'success' || r.type === 'error').length,
        passed: this.testResults.filter(r => r.type === 'success').length,
        failed: this.testResults.filter(r => r.type === 'error').length
      },
      details: this.testResults
    };
    
    fs.writeFileSync('test_report.json', JSON.stringify(report, null, 2));
    this.log(`📊 测试报告已生成: test_report.json`);
    
    return report;
  }

  // 运行所有测试
  async runAllTests() {
    this.log('🚀 开始全面系统测试...');
    
    const tests = [
      { name: 'API连通性', fn: () => this.testApiConnectivity() },
      { name: '环境配置', fn: () => this.testEnvironmentConfig() },
      { name: '文件结构', fn: () => this.testFileStructure() },
      { name: '前端可访问性', fn: () => this.testFrontendAccessibility() },
      { name: '实验生成功能', fn: () => this.testExperimentGeneration() },
      { name: '错误处理机制', fn: () => this.testErrorHandling() }
    ];
    
    const results = [];
    for (const test of tests) {
      this.log(`\n📋 执行测试: ${test.name}`);
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
    }
    
    // 总结
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    
    this.log(`\n🎯 测试完成! 总体结果: ${passedCount}/${totalCount} 通过`);
    
    if (passedCount === totalCount) {
      this.log('🎉 所有测试通过！系统运行正常', 'success');
    } else {
      this.log('⚠️ 部分测试失败，请检查上述错误信息', 'error');
      const failedTests = results.filter(r => !r.passed).map(r => r.name);
      this.log(`失败的测试: ${failedTests.join(', ')}`, 'error');
    }
    
    return this.generateReport();
  }
}

// 运行测试
const tester = new SystemTester();
tester.runAllTests().catch(console.error);