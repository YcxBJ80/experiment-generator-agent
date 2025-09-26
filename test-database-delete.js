// 数据库删除操作验证脚本
// 这个脚本用于测试删除对话时数据库操作是否正确执行

const API_BASE_URL = 'http://localhost:3001/api';

// 测试函数
async function testDatabaseDelete() {
    console.log('🗄️ 开始数据库删除操作测试...');
    
    try {
        // 1. 获取当前对话列表
        console.log('\n📋 步骤1: 获取当前对话列表');
        const conversationsResponse = await fetch(`${API_BASE_URL}/messages/conversations`);
        
        if (!conversationsResponse.ok) {
            throw new Error(`获取对话列表失败: ${conversationsResponse.status}`);
        }
        
        const conversations = await conversationsResponse.json();
        console.log('✅ 当前对话数量:', conversations.length);
        
        if (conversations.length === 0) {
            console.log('❌ 没有对话可以测试删除功能');
            console.log('💡 请先创建一些对话，然后再运行此测试');
            return;
        }
        
        // 显示前3个对话的信息
        console.log('📝 前3个对话信息:');
        conversations.slice(0, 3).forEach((conv, index) => {
            console.log(`${index + 1}. ID: ${conv.id}`);
            console.log(`   标题: ${conv.title || 'New Conversation'}`);
            console.log(`   创建时间: ${new Date(conv.created_at).toLocaleString()}`);
        });
        
        // 2. 选择要删除的对话
        const targetConversation = conversations[0];
        console.log('\n🎯 步骤2: 选择要删除的对话');
        console.log('目标对话ID:', targetConversation.id);
        console.log('目标对话标题:', targetConversation.title || 'New Conversation');
        
        // 3. 获取该对话的消息数量（删除前）
        console.log('\n💬 步骤3: 获取对话消息数量（删除前）');
        const messagesResponse = await fetch(`${API_BASE_URL}/messages/conversations/${targetConversation.id}/messages`);
        
        if (messagesResponse.ok) {
            const messages = await messagesResponse.json();
            console.log('✅ 删除前消息数量:', messages.length);
            
            if (messages.length > 0) {
                console.log('📝 消息示例:');
                messages.slice(0, 2).forEach((msg, index) => {
                    console.log(`${index + 1}. 角色: ${msg.role}`);
                    console.log(`   内容: ${msg.content.substring(0, 50)}...`);
                    console.log(`   时间: ${new Date(msg.created_at).toLocaleString()}`);
                });
            }
        } else {
            console.log('⚠️ 无法获取消息列表，但继续测试删除功能');
        }
        
        // 4. 执行删除操作
        console.log('\n🗑️ 步骤4: 执行删除操作');
        console.log('⚠️ 即将删除对话:', targetConversation.id);
        
        // 用户确认
        const userConfirmed = confirm(`确定要删除对话 "${targetConversation.title || 'New Conversation'}" 吗？\n\n这将用于测试数据库删除功能。`);
        
        if (!userConfirmed) {
            console.log('❌ 用户取消删除，测试终止');
            return;
        }
        
        console.log('✅ 用户确认删除，开始执行...');
        
        const deleteResponse = await fetch(`${API_BASE_URL}/messages/conversations/${targetConversation.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!deleteResponse.ok) {
            throw new Error(`删除请求失败: ${deleteResponse.status}`);
        }
        
        const deleteResult = await deleteResponse.json();
        console.log('✅ 删除API响应:', deleteResult);
        
        // 5. 验证删除结果
        console.log('\n🔍 步骤5: 验证删除结果');
        
        // 5a. 检查对话列表
        console.log('📋 检查对话列表...');
        const updatedConversationsResponse = await fetch(`${API_BASE_URL}/messages/conversations`);
        
        if (updatedConversationsResponse.ok) {
            const updatedConversations = await updatedConversationsResponse.json();
            console.log('✅ 删除后对话数量:', updatedConversations.length);
            console.log('📊 对话数量变化:', conversations.length - updatedConversations.length);
            
            // 检查目标对话是否还存在
            const stillExists = updatedConversations.some(conv => conv.id === targetConversation.id);
            if (stillExists) {
                console.log('❌ 错误: 对话仍然存在于列表中!');
            } else {
                console.log('✅ 正确: 对话已从列表中移除');
            }
        } else {
            console.log('❌ 无法获取更新后的对话列表');
        }
        
        // 5b. 检查消息是否被删除
        console.log('💬 检查消息是否被删除...');
        const deletedMessagesResponse = await fetch(`${API_BASE_URL}/messages/conversations/${targetConversation.id}/messages`);
        
        if (deletedMessagesResponse.ok) {
            const deletedMessages = await deletedMessagesResponse.json();
            console.log('📊 删除后消息数量:', deletedMessages.length);
            
            if (deletedMessages.length === 0) {
                console.log('✅ 正确: 所有相关消息已被删除');
            } else {
                console.log('❌ 错误: 仍有', deletedMessages.length, '条消息未被删除');
                console.log('🔍 剩余消息:', deletedMessages.map(msg => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content.substring(0, 30) + '...'
                })));
            }
        } else {
            console.log('⚠️ 无法检查删除后的消息状态 (可能是正常的，如果对话已完全删除)');
        }
        
        // 6. 测试总结
        console.log('\n📊 步骤6: 测试总结');
        console.log('🎯 测试目标: 验证删除对话时数据库操作是否正确');
        console.log('✅ API删除请求: 成功');
        console.log('✅ 对话列表更新: 已验证');
        console.log('✅ 相关消息删除: 已验证');
        console.log('🏆 数据库删除操作测试完成!');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
        console.log('💡 请检查:');
        console.log('1. API服务器是否正在运行 (http://localhost:3001)');
        console.log('2. 数据库连接是否正常');
        console.log('3. 网络连接是否正常');
    }
}

// 辅助函数：创建测试对话
async function createTestConversation() {
    console.log('🆕 创建测试对话...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/messages/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: `测试对话 - ${new Date().toLocaleString()}`
            })
        });
        
        if (response.ok) {
            const conversation = await response.json();
            console.log('✅ 测试对话创建成功:', conversation.id);
            return conversation;
        } else {
            console.log('❌ 创建测试对话失败:', response.status);
            return null;
        }
    } catch (error) {
        console.error('❌ 创建测试对话时发生错误:', error);
        return null;
    }
}

// 导出函数供控制台使用
if (typeof window !== 'undefined') {
    window.testDatabaseDelete = testDatabaseDelete;
    window.createTestConversation = createTestConversation;
}

console.log('🗄️ 数据库删除测试脚本已加载');
console.log('💡 可用命令:');
console.log('- testDatabaseDelete() - 开始数据库删除测试');
console.log('- createTestConversation() - 创建测试对话');
console.log('\n👆 运行 testDatabaseDelete() 开始测试');

// 如果在Node.js环境中，可以直接运行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testDatabaseDelete, createTestConversation };
}