// 在浏览器控制台中运行此代码来测试删除功能

// 1. 首先检查页面上是否有对话数据
console.log('=== 开始测试删除功能 ===');

// 2. 检查React组件状态（如果可以访问）
function checkReactState() {
    // 尝试找到React组件的根节点
    const rootElement = document.querySelector('#root');
    if (rootElement && rootElement._reactInternalFiber) {
        console.log('✅ 找到React根节点');
    } else {
        console.log('❌ 未找到React根节点或内部状态');
    }
}

// 3. 检查页面上的对话列表
function checkConversationList() {
    console.log('🔍 检查对话列表...');
    
    // 查找可能的对话容器
    const conversationContainers = document.querySelectorAll('[class*="conversation"], [class*="chat"], [class*="message"]');
    console.log(`📊 找到 ${conversationContainers.length} 个可能的对话容器`);
    
    // 查找删除按钮
    const deleteButtons = document.querySelectorAll('button');
    let trashButtons = [];
    
    deleteButtons.forEach((btn, index) => {
        const hasTrashIcon = btn.innerHTML.includes('Trash') || btn.querySelector('svg');
        const hasDeleteClass = btn.className.includes('delete') || btn.className.includes('trash');
        
        if (hasTrashIcon || hasDeleteClass) {
            trashButtons.push({button: btn, index, html: btn.outerHTML.substring(0, 200)});
        }
    });
    
    console.log(`🗑️ 找到 ${trashButtons.length} 个可能的删除按钮`);
    trashButtons.forEach((item, i) => {
        console.log(`删除按钮 ${i}:`, item.html);
    });
    
    return trashButtons;
}

// 4. 监控confirm函数
function setupConfirmMonitor() {
    console.log('🔧 设置confirm监控...');
    
    const originalConfirm = window.confirm;
    window.confirm = function(message) {
        console.log('🔔 CONFIRM被调用!');
        console.log('📝 消息内容:', message);
        console.log('📍 调用堆栈:', new Error().stack);
        
        const result = originalConfirm.call(this, message);
        console.log('✅ 用户选择:', result ? '确认' : '取消');
        
        return result;
    };
    
    console.log('✅ confirm监控已设置');
}

// 5. 模拟点击删除按钮
function simulateDeleteClick() {
    console.log('🎯 模拟点击删除按钮...');
    
    const trashButtons = checkConversationList();
    
    if (trashButtons.length > 0) {
        console.log('🖱️ 点击第一个删除按钮...');
        const button = trashButtons[0].button;
        
        // 创建点击事件
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        // 触发点击
        button.dispatchEvent(clickEvent);
        
        console.log('✅ 点击事件已触发');
    } else {
        console.log('❌ 没有找到删除按钮');
        
        // 显示所有按钮供调试
        const allButtons = document.querySelectorAll('button');
        console.log(`📊 页面上共有 ${allButtons.length} 个按钮:`);
        allButtons.forEach((btn, i) => {
            console.log(`按钮 ${i}:`, btn.outerHTML.substring(0, 150));
        });
    }
}

// 6. 检查网络请求
function monitorNetworkRequests() {
    console.log('🌐 设置网络请求监控...');
    
    // 监控fetch请求
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        console.log('🌐 FETCH请求:', args[0]);
        return originalFetch.apply(this, args)
            .then(response => {
                console.log('📥 FETCH响应:', response.status, args[0]);
                return response;
            })
            .catch(error => {
                console.log('❌ FETCH错误:', error, args[0]);
                throw error;
            });
    };
    
    console.log('✅ 网络请求监控已设置');
}

// 7. 主测试函数
function runDeleteTest() {
    console.log('🚀 开始完整的删除功能测试...');
    
    checkReactState();
    setupConfirmMonitor();
    monitorNetworkRequests();
    
    // 等待一下再检查对话列表
    setTimeout(() => {
        simulateDeleteClick();
    }, 1000);
}

// 8. 手动测试函数
window.testDelete = runDeleteTest;
window.checkConversations = checkConversationList;
window.setupMonitor = setupConfirmMonitor;

console.log('✅ 测试脚本已加载');
console.log('💡 运行 testDelete() 开始完整测试');
console.log('💡 运行 checkConversations() 检查对话列表');
console.log('💡 运行 setupMonitor() 设置监控');

// 自动运行测试
runDeleteTest();