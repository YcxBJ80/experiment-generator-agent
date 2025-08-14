import { PerplexityMCPClient } from './api/lib/perplexityMcpClient.ts';

async function testPerplexityMCP() {
    console.log('开始测试 Perplexity MCP 连接...');
    
    const client = new PerplexityMCPClient();
    
    try {
        // 测试连接
        console.log('1. 尝试连接 Perplexity MCP 服务器...');
        await client.connect();
        console.log('✅ 连接成功');
        
        // 测试搜索功能
        console.log('\n2. 测试搜索功能...');
        const searchResult = await client.search('JavaScript basics', 'brief');
        console.log('✅ 搜索功能正常');
        console.log('搜索结果:', searchResult.content.substring(0, 100) + '...');
        
        // 测试获取文档功能
        console.log('\n3. 测试获取文档功能...');
        const docResult = await client.getDocumentation('React', 'web development');
        console.log('✅ 获取文档功能正常');
        console.log('文档结果:', docResult.content.substring(0, 100) + '...');
        
        // 测试获取实验知识功能
        console.log('\n4. 测试获取实验知识功能...');
        const knowledge = await client.getExperimentKnowledge('物理实验');
        console.log('✅ 获取实验知识功能正常');
        console.log('知识结果:', knowledge.substring(0, 100) + '...');
        
        // 断开连接
        await client.disconnect();
        console.log('\n✅ 所有测试通过，Perplexity MCP 工作正常');
        
    } catch (error) {
        console.error('❌ Perplexity MCP 测试失败:');
        console.error('错误类型:', error.constructor.name);
        console.error('错误信息:', error.message);
        console.error('错误堆栈:', error.stack);
        
        // 检查具体的错误原因
        if (error.message.includes('ENOENT')) {
            console.error('\n🔍 分析: perplexity-mcp-zerver 文件不存在');
            console.error('路径: /Users/yangchengxuan/Desktop/hackathone2/perplexity-mcp-zerver/build/index.js');
        } else if (error.message.includes('spawn')) {
            console.error('\n🔍 分析: 无法启动 MCP 服务器进程');
        } else if (error.message.includes('connect')) {
            console.error('\n🔍 分析: MCP 服务器连接失败');
        }
        
        // 测试回退模式
        console.log('\n🔄 测试回退模式...');
        try {
            const fallbackResult = await client.search('test query', 'brief');
            console.log('✅ 回退模式工作正常');
            console.log('回退结果:', fallbackResult.content.substring(0, 100) + '...');
        } catch (fallbackError) {
            console.error('❌ 回退模式也失败:', fallbackError.message);
        }
    }
}

// 运行测试
testPerplexityMCP().catch(console.error);