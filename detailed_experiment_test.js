import fs from 'fs';
import path from 'path';

// 测试配置
const API_BASE_URL = 'http://localhost:8767';
const TEST_CASES = [
    {
        name: '简单物理模拟',
        prompt: '创建一个简单的重力球下落模拟',
        model: 'openrouter/openai/gpt-4o-mini'
    },
    {
        name: '复杂交互系统', 
        prompt: '创建一个包含多个交互元素的复杂系统，包括按钮、滑块和动画效果',
        model: 'openrouter/openai/gpt-4o-mini'
    },
    {
        name: '数学可视化',
        prompt: '创建一个数学函数可视化工具，能够绘制sin和cos函数',
        model: 'openrouter/openai/gpt-4o-mini'
    }
];

// 结果存储
let testResults = {
    timestamp: new Date().toISOString(),
    testCases: [],
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
    }
};

// 工具函数：保存结果到文件
function saveResults() {
    const filename = `experiment_test_results_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(testResults, null, 2));
    console.log(`\n📁 测试结果已保存到: ${filename}`);
}

// 工具函数：延迟
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 工具函数：发送API请求
async function makeAPIRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`🔗 发送请求到: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const responseData = await response.text();
        let parsedData;
        try {
            parsedData = JSON.parse(responseData);
        } catch (e) {
            parsedData = responseData;
        }
        
        return {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: parsedData,
            rawData: responseData
        };
    } catch (error) {
        return {
            error: error.message,
            stack: error.stack
        };
    }
}

// 主测试函数
async function runDetailedExperimentTest() {
    console.log('🚀 开始详细实验生成测试...\n');
    
    for (let i = 0; i < TEST_CASES.length; i++) {
        const testCase = TEST_CASES[i];
        console.log(`\n📋 测试案例 ${i + 1}/${TEST_CASES.length}: ${testCase.name}`);
        console.log(`📝 提示词: ${testCase.prompt}`);
        console.log(`🤖 模型: ${testCase.model}`);
        
        const caseResult = {
            name: testCase.name,
            prompt: testCase.prompt,
            model: testCase.model,
            startTime: new Date().toISOString(),
            stages: [],
            finalResult: null,
            success: false,
            errors: []
        };
        
        try {
            // 阶段1: 发送实验生成请求
            console.log('\n🔄 阶段1: 发送实验生成请求...');
            const generateResponse = await makeAPIRequest('/api/experiments/generate', {
                body: JSON.stringify({
                    prompt: testCase.prompt,
                    model: testCase.model
                })
            });
            
            caseResult.stages.push({
                stage: 'generate_request',
                timestamp: new Date().toISOString(),
                response: generateResponse
            });
            
            if (generateResponse.error) {
                throw new Error(`API请求失败: ${generateResponse.error}`);
            }
            
            if (generateResponse.status !== 200) {
                throw new Error(`API返回错误状态: ${generateResponse.status} - ${generateResponse.statusText}`);
            }
            
            console.log(`✅ 生成请求成功，状态码: ${generateResponse.status}`);
            console.log(`📊 响应数据类型: ${typeof generateResponse.data}`);
            
            // 阶段2: 分析返回的实验数据
            console.log('\n🔍 阶段2: 分析返回的实验数据...');
            const experimentData = generateResponse.data;
            
            if (typeof experimentData === 'string') {
                console.log(`📄 返回纯文本，长度: ${experimentData.length} 字符`);
                caseResult.stages.push({
                    stage: 'data_analysis',
                    timestamp: new Date().toISOString(),
                    dataType: 'string',
                    dataLength: experimentData.length,
                    preview: experimentData.substring(0, 200) + (experimentData.length > 200 ? '...' : '')
                });
            } else if (typeof experimentData === 'object') {
                console.log(`📦 返回对象，键: ${Object.keys(experimentData)}`);
                caseResult.stages.push({
                    stage: 'data_analysis',
                    timestamp: new Date().toISOString(),
                    dataType: 'object',
                    keys: Object.keys(experimentData),
                    data: experimentData
                });
            }
            
            // 阶段3: JavaScript代码质量检查
            console.log('\n🔧 阶段3: JavaScript代码质量检查...');
            let jsCode = '';
            
            if (typeof experimentData === 'string') {
                jsCode = experimentData;
            } else if (experimentData && experimentData.code) {
                jsCode = experimentData.code;
            } else if (experimentData && experimentData.experiment) {
                jsCode = experimentData.experiment;
            }
            
            const qualityCheck = {
                stage: 'quality_check',
                timestamp: new Date().toISOString(),
                checks: {
                    hasCode: jsCode.length > 0,
                    codeLength: jsCode.length,
                    htmlTagsFound: [],
                    syntaxErrors: [],
                    bracketMatching: true
                }
            };
            
            // 检查HTML标签残留
            const htmlTagRegex = /<[^>]+>/g;
            const htmlMatches = jsCode.match(htmlTagRegex);
            if (htmlMatches) {
                qualityCheck.checks.htmlTagsFound = htmlMatches;
                console.log(`⚠️  发现HTML标签残留: ${htmlMatches.length} 个`);
                htmlMatches.forEach(tag => console.log(`   - ${tag}`));
            } else {
                console.log('✅ 未发现HTML标签残留');
            }
            
            // 检查括号匹配
            const brackets = { '(': 0, '[': 0, '{': 0 };
            for (let char of jsCode) {
                if (char === '(') brackets['(']++;
                if (char === ')') brackets['(']--;
                if (char === '[') brackets['[']++;
                if (char === ']') brackets['[']--;
                if (char === '{') brackets['{']++;
                if (char === '}') brackets['{']--;
            }
            
            const bracketErrors = [];
            Object.entries(brackets).forEach(([bracket, count]) => {
                if (count !== 0) {
                    bracketErrors.push(`${bracket}: ${count > 0 ? '多' : '少'} ${Math.abs(count)} 个`);
                }
            });
            
            if (bracketErrors.length > 0) {
                qualityCheck.checks.bracketMatching = false;
                qualityCheck.checks.syntaxErrors = bracketErrors;
                console.log(`⚠️  括号匹配错误: ${bracketErrors.join(', ')}`);
            } else {
                console.log('✅ 括号匹配正确');
            }
            
            // 尝试基本的JavaScript语法检查
            try {
                new Function(jsCode);
                console.log('✅ JavaScript语法检查通过');
                qualityCheck.checks.syntaxValid = true;
            } catch (syntaxError) {
                console.log(`⚠️  JavaScript语法错误: ${syntaxError.message}`);
                qualityCheck.checks.syntaxValid = false;
                qualityCheck.checks.syntaxErrors.push(syntaxError.message);
            }
            
            caseResult.stages.push(qualityCheck);
            
            // 阶段4: 最终评估
            console.log('\n📊 阶段4: 最终评估...');
            const hasIssues = qualityCheck.checks.htmlTagsFound.length > 0 || 
                            !qualityCheck.checks.bracketMatching || 
                            !qualityCheck.checks.syntaxValid;
            
            caseResult.success = !hasIssues;
            caseResult.finalResult = {
                codeGenerated: qualityCheck.checks.hasCode,
                codeLength: qualityCheck.checks.codeLength,
                hasQualityIssues: hasIssues,
                issues: {
                    htmlTags: qualityCheck.checks.htmlTagsFound.length,
                    bracketErrors: !qualityCheck.checks.bracketMatching,
                    syntaxErrors: !qualityCheck.checks.syntaxValid
                }
            };
            
            if (caseResult.success) {
                console.log('✅ 测试案例通过');
                testResults.summary.passed++;
            } else {
                console.log('❌ 测试案例失败');
                testResults.summary.failed++;
            }
            
        } catch (error) {
            console.log(`❌ 测试案例出错: ${error.message}`);
            caseResult.errors.push({
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            testResults.summary.failed++;
            testResults.summary.errors.push(`${testCase.name}: ${error.message}`);
        }
        
        caseResult.endTime = new Date().toISOString();
        caseResult.duration = new Date(caseResult.endTime) - new Date(caseResult.startTime);
        testResults.testCases.push(caseResult);
        testResults.summary.total++;
        
        // 在测试案例之间添加延迟，避免API限流
        if (i < TEST_CASES.length - 1) {
            console.log('\n⏳ 等待5秒后继续下一个测试...');
            await delay(5000);
        }
    }
    
    // 生成测试总结
    console.log('\n' + '='.repeat(60));
    console.log('📋 测试总结');
    console.log('='.repeat(60));
    console.log(`总测试数: ${testResults.summary.total}`);
    console.log(`通过: ${testResults.summary.passed}`);
    console.log(`失败: ${testResults.summary.failed}`);
    console.log(`成功率: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
    
    if (testResults.summary.errors.length > 0) {
        console.log('\n❌ 错误列表:');
        testResults.summary.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    // 保存结果
    saveResults();
    
    return testResults;
}

// 运行测试
runDetailedExperimentTest()
    .then(results => {
        console.log('\n🎉 测试完成！');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 测试过程中发生错误:', error);
        process.exit(1);
    });

export { runDetailedExperimentTest };