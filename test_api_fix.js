#!/usr/bin/env node

/**
 * API修复验证测试脚本
 * 测试所有主要API端点是否正常工作
 */

const API_BASE = 'http://localhost:3002/api';

async function testAPI() {
  console.log('🧪 开始API修复验证测试...\n');
  
  const tests = [
    {
      name: '获取对话列表',
      method: 'GET',
      url: `${API_BASE}/conversations`,
      expectedStatus: 200
    },
    {
      name: '健康检查',
      method: 'GET', 
      url: `${API_BASE}/health`,
      expectedStatus: 200
    },
    {
      name: '创建新对话',
      method: 'POST',
      url: `${API_BASE}/conversations`,
      body: { title: 'API测试对话' },
      expectedStatus: 201
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`📋 测试: ${test.name}`);
      
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      if (test.body) {
        options.body = JSON.stringify(test.body);
      }
      
      const response = await fetch(test.url, options);
      const data = await response.json();
      
      if (response.status === test.expectedStatus) {
        console.log(`✅ 通过 - 状态码: ${response.status}`);
        if (test.name === '获取对话列表') {
          console.log(`   📊 获取到 ${Array.isArray(data) ? data.length : 0} 个对话`);
        }
        passedTests++;
      } else {
        console.log(`❌ 失败 - 期望状态码: ${test.expectedStatus}, 实际: ${response.status}`);
        console.log(`   响应: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      console.log(`❌ 失败 - 错误: ${error.message}`);
    }
    console.log('');
  }
  
  console.log(`📊 测试结果: ${passedTests}/${totalTests} 通过`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！API修复成功！');
    return true;
  } else {
    console.log('⚠️  部分测试失败，需要进一步检查');
    return false;
  }
}

// 运行测试
testAPI().catch(console.error);