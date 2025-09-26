// 端到端删除功能测试
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

// 配置axios绕过代理
const axiosConfig = {
  proxy: false,
  timeout: 10000
};

async function testDeleteFunction() {
  console.log('🧪 开始端到端删除功能测试...');
  
  try {
    // 1. 获取对话列表
    console.log('📋 获取对话列表...');
    const conversationsResponse = await axios.get(`${API_BASE}/messages/conversations`, axiosConfig);
    const conversations = conversationsResponse.data;
    
    if (!conversations || conversations.length === 0) {
      console.log('❌ 没有找到对话，无法测试删除功能');
      return;
    }
    
    const initialCount = conversations.length;
    console.log(`📊 初始对话数量: ${initialCount}`);
    
    // 2. 选择要删除的对话（选择第一个）
    const conversationToDelete = conversations[0];
    console.log(`🎯 选择删除对话: ${conversationToDelete.id}`);
    console.log(`📝 对话标题: ${conversationToDelete.title || '无标题'}`);
    
    // 3. 执行删除操作
    console.log('🗑️ 执行删除操作...');
    const deleteResponse = await axios.delete(`${API_BASE}/messages/conversations/${conversationToDelete.id}`, axiosConfig);
    
    if (deleteResponse.status === 200 && deleteResponse.data.success) {
      console.log('✅ 删除API调用成功');
    } else {
      console.log('❌ 删除API调用失败:', deleteResponse.data);
      return;
    }
    
    // 4. 验证删除结果
    console.log('🔍 验证删除结果...');
    const updatedConversationsResponse = await axios.get(`${API_BASE}/messages/conversations`, axiosConfig);
    const updatedConversations = updatedConversationsResponse.data;
    const finalCount = updatedConversations.length;
    
    console.log(`📊 删除后对话数量: ${finalCount}`);
    
    // 5. 检查对话是否真的被删除
    const deletedConversationExists = updatedConversations.some(conv => conv.id === conversationToDelete.id);
    
    if (finalCount === initialCount - 1 && !deletedConversationExists) {
      console.log('🎉 删除功能测试通过！');
      console.log('✅ 对话数量正确减少');
      console.log('✅ 被删除的对话不再存在于列表中');
      return true;
    } else {
      console.log('❌ 删除功能测试失败！');
      console.log(`❌ 期望对话数量: ${initialCount - 1}, 实际: ${finalCount}`);
      console.log(`❌ 被删除对话是否仍存在: ${deletedConversationExists}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('📄 错误响应:', error.response.data);
      console.error('🔢 状态码:', error.response.status);
    }
    return false;
  }
}

// 运行测试
testDeleteFunction().then(success => {
  process.exit(success ? 0 : 1);
});