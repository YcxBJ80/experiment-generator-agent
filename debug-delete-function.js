// 删除功能调试脚本
// 在浏览器控制台中运行此脚本来测试删除功能

console.log('🔍 开始删除功能调试...');

// 1. 检查页面状态
function checkPageStatus() {
    console.log('\n📊 页面状态检查:');
    console.log('- 当前URL:', window.location.href);
    console.log('- 页面标题:', document.title);
    
    // 查找对话列表
    const conversations = document.querySelectorAll('[class*="cursor-pointer"]');
    console.log('- 找到对话数量:', conversations.length);
    
    // 查找删除按钮
    const deleteButtons = document.querySelectorAll('button[title="Delete Conversation"]');
    console.log('- 找到删除按钮数量:', deleteButtons.length);
    
    return { conversations, deleteButtons };
}

// 2. 监控confirm函数调用
let originalConfirm = window.confirm;
let confirmCalls = [];

function startConfirmMonitoring() {
    console.log('\n🔍 开始监控confirm函数调用...');
    
    window.confirm = function(message) {
        const timestamp = new Date().toISOString();
        console.log(`\n🚨 [${timestamp}] confirm函数被调用:`);
        console.log('消息:', message);
        
        const result = originalConfirm.call(this, message);
        console.log('用户选择:', result ? '确认' : '取消');
        
        confirmCalls.push({
            timestamp,
            message,
            result
        });
        
        return result;
    };
    
    window.confirm._monitored = true;
}

// 3. 监控API调用
let originalFetch = window.fetch;
let apiCalls = [];

function startAPIMonitoring() {
    console.log('\n🌐 开始监控API调用...');
    
    window.fetch = function(url, options) {
        const timestamp = new Date().toISOString();
        
        // 只记录删除相关的API调用
        if (url.includes('/conversations/') && options?.method === 'DELETE') {
            console.log(`\n📡 [${timestamp}] 检测到删除API调用:`);
            console.log('URL:', url);
            console.log('方法:', options.method);
            console.log('选项:', options);
            
            apiCalls.push({
                timestamp,
                url,
                method: options.method,
                options
            });
        }
        
        return originalFetch.apply(this, arguments).then(response => {
            if (url.includes('/conversations/') && options?.method === 'DELETE') {
                console.log(`\n✅ [${timestamp}] 删除API响应:`);
                console.log('状态:', response.status);
                console.log('状态文本:', response.statusText);
                console.log('响应OK:', response.ok);
                
                // 克隆响应以便读取内容
                const clonedResponse = response.clone();
                clonedResponse.json().then(data => {
                    console.log('响应数据:', data);
                }).catch(err => {
                    console.log('响应不是JSON格式');
                });
            }
            
            return response;
        }).catch(error => {
            if (url.includes('/conversations/') && options?.method === 'DELETE') {
                console.error(`\n❌ [${timestamp}] 删除API调用失败:`, error);
            }
            throw error;
        });
    };
}

// 4. 测试删除功能
function testDeleteFunction() {
    console.log('\n🗑️ 开始删除功能测试...');
    
    const { conversations, deleteButtons } = checkPageStatus();
    
    if (deleteButtons.length === 0) {
        console.log('❌ 没有找到删除按钮，无法进行测试');
        return;
    }
    
    if (conversations.length === 0) {
        console.log('❌ 没有找到对话，无法进行测试');
        return;
    }
    
    console.log('\n✅ 准备测试第一个删除按钮...');
    const firstDeleteButton = deleteButtons[0];
    
    // 获取对应的对话信息
    const conversationElement = firstDeleteButton.closest('[class*="cursor-pointer"]');
    if (conversationElement) {
        console.log('对话元素:', conversationElement);
        console.log('对话文本:', conversationElement.textContent?.trim());
    }
    
    console.log('\n🖱️ 模拟点击删除按钮...');
    firstDeleteButton.click();
    
    // 等待一段时间后检查结果
    setTimeout(() => {
        console.log('\n📊 删除操作后的状态检查:');
        const afterStatus = checkPageStatus();
        console.log('删除后对话数量:', afterStatus.conversations.length);
        console.log('删除后删除按钮数量:', afterStatus.deleteButtons.length);
        
        console.log('\n📋 confirm调用记录:', confirmCalls);
        console.log('📋 API调用记录:', apiCalls);
    }, 2000);
}

// 5. 停止监控
function stopMonitoring() {
    window.confirm = originalConfirm;
    window.fetch = originalFetch;
    console.log('\n✅ 监控已停止');
    console.log('📊 总共监控到', confirmCalls.length, '次confirm调用');
    console.log('📊 总共监控到', apiCalls.length, '次删除API调用');
}

// 6. 完整测试流程
function runFullTest() {
    console.log('🚀 开始完整的删除功能测试流程...');
    
    // 启动监控
    startConfirmMonitoring();
    startAPIMonitoring();
    
    // 检查初始状态
    checkPageStatus();
    
    // 提示用户手动测试
    console.log('\n💡 请手动点击删除按钮进行测试，或运行 testDeleteFunction() 进行自动测试');
    console.log('💡 测试完成后运行 stopMonitoring() 停止监控');
}

// 导出函数到全局作用域
window.debugDelete = {
    checkPageStatus,
    startConfirmMonitoring,
    startAPIMonitoring,
    testDeleteFunction,
    stopMonitoring,
    runFullTest,
    getConfirmCalls: () => confirmCalls,
    getAPICalls: () => apiCalls
};

console.log('\n✅ 删除功能调试脚本已加载');
console.log('💡 运行 debugDelete.runFullTest() 开始完整测试');
console.log('💡 或者运行 debugDelete.testDeleteFunction() 进行自动删除测试');