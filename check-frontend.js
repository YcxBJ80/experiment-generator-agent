// 在应用页面控制台中运行此脚本来检查前端状态

console.log('=== 前端状态检查开始 ===');

// 1. 检查页面基本信息
function checkPageInfo() {
    console.log('📄 页面URL:', window.location.href);
    console.log('📄 页面标题:', document.title);
    console.log('📄 页面加载状态:', document.readyState);
}

// 2. 检查React应用状态
function checkReactApp() {
    const rootElement = document.querySelector('#root');
    if (rootElement) {
        console.log('✅ 找到React根元素');
        console.log('📊 根元素子节点数量:', rootElement.children.length);
    } else {
        console.log('❌ 未找到React根元素');
    }
}

// 3. 检查对话列表容器
function checkConversationContainer() {
    console.log('🔍 查找对话列表容器...');
    
    // 查找可能的对话容器
    const possibleContainers = [
        'div[class*="conversation"]',
        'div[class*="chat"]',
        'div[class*="sidebar"]',
        'div[class*="list"]',
        'ul',
        'ol'
    ];
    
    let foundContainers = [];
    
    possibleContainers.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            foundContainers.push({selector, count: elements.length});
        }
    });
    
    console.log('📋 找到的可能容器:', foundContainers);
    
    // 检查是否有包含文本内容的容器
    const textContainers = document.querySelectorAll('div');
    let conversationTexts = [];
    
    textContainers.forEach((div, index) => {
        const text = div.textContent || '';
        if (text.includes('测试对话') || text.includes('New Conversation') || text.includes('乙酰水杨酸')) {
            conversationTexts.push({
                index,
                text: text.substring(0, 100),
                element: div
            });
        }
    });
    
    console.log('💬 找到包含对话文本的元素:', conversationTexts.length);
    conversationTexts.forEach(item => {
        console.log(`  - ${item.index}: ${item.text}`);
    });
    
    return conversationTexts;
}

// 4. 检查删除按钮
function checkDeleteButtons() {
    console.log('🗑️ 查找删除按钮...');
    
    const allButtons = document.querySelectorAll('button');
    console.log('📊 页面总按钮数量:', allButtons.length);
    
    let deleteButtons = [];
    
    allButtons.forEach((btn, index) => {
        const innerHTML = btn.innerHTML;
        const className = btn.className;
        const title = btn.title || btn.getAttribute('aria-label') || '';
        
        // 检查是否是删除按钮
        const isDeleteButton = 
            innerHTML.includes('Trash') ||
            innerHTML.includes('🗑️') ||
            innerHTML.includes('delete') ||
            className.includes('delete') ||
            className.includes('trash') ||
            title.toLowerCase().includes('delete') ||
            btn.querySelector('svg') !== null;
        
        if (isDeleteButton) {
            deleteButtons.push({
                index,
                innerHTML: innerHTML.substring(0, 200),
                className,
                title,
                element: btn
            });
        }
    });
    
    console.log('🗑️ 找到的删除按钮:', deleteButtons.length);
    deleteButtons.forEach((btn, i) => {
        console.log(`  删除按钮 ${i}:`);
        console.log(`    - HTML: ${btn.innerHTML}`);
        console.log(`    - Class: ${btn.className}`);
        console.log(`    - Title: ${btn.title}`);
    });
    
    return deleteButtons;
}

// 5. 监控confirm函数
function setupConfirmMonitor() {
    console.log('🔧 设置confirm函数监控...');
    
    if (window.confirm._isMonitored) {
        console.log('⚠️ confirm函数已经被监控');
        return;
    }
    
    const originalConfirm = window.confirm;
    window.confirm = function(message) {
        console.log('🔔 ===== CONFIRM函数被调用! =====');
        console.log('📝 消息内容:', message);
        console.log('📍 调用时间:', new Date().toLocaleTimeString());
        console.log('📍 调用堆栈:');
        console.trace();
        
        const result = originalConfirm.call(this, message);
        
        console.log('✅ 用户选择:', result ? '确认' : '取消');
        console.log('🔔 ===== CONFIRM调用结束 =====');
        
        return result;
    };
    
    window.confirm._isMonitored = true;
    console.log('✅ confirm函数监控已设置');
}

// 6. 测试删除按钮点击
function testDeleteButtonClick() {
    console.log('🎯 测试删除按钮点击...');
    
    const deleteButtons = checkDeleteButtons();
    
    if (deleteButtons.length > 0) {
        console.log('🖱️ 准备点击第一个删除按钮...');
        const button = deleteButtons[0].element;
        
        // 创建并触发点击事件
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1
        });
        
        console.log('⚡ 触发点击事件...');
        button.dispatchEvent(clickEvent);
        
        console.log('✅ 点击事件已触发');
        
        // 等待一下看是否有confirm调用
        setTimeout(() => {
            console.log('⏰ 点击后1秒检查 - 如果没有看到confirm调用，可能存在问题');
        }, 1000);
        
    } else {
        console.log('❌ 没有找到删除按钮，无法测试点击');
    }
}

// 7. 检查网络请求
function monitorNetworkRequests() {
    console.log('🌐 设置网络请求监控...');
    
    if (window.fetch._isMonitored) {
        console.log('⚠️ fetch函数已经被监控');
        return;
    }
    
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        const options = args[1] || {};
        
        console.log('🌐 网络请求:', options.method || 'GET', url);
        
        return originalFetch.apply(this, args)
            .then(response => {
                console.log('📥 网络响应:', response.status, url);
                return response;
            })
            .catch(error => {
                console.log('❌ 网络错误:', error.message, url);
                throw error;
            });
    };
    
    window.fetch._isMonitored = true;
    console.log('✅ 网络请求监控已设置');
}

// 8. 主检查函数
function runFullCheck() {
    console.log('🚀 开始完整的前端检查...');
    
    checkPageInfo();
    checkReactApp();
    
    const conversationTexts = checkConversationContainer();
    const deleteButtons = checkDeleteButtons();
    
    setupConfirmMonitor();
    monitorNetworkRequests();
    
    console.log('\n📊 检查总结:');
    console.log(`  - 对话文本元素: ${conversationTexts.length}`);
    console.log(`  - 删除按钮: ${deleteButtons.length}`);
    
    if (conversationTexts.length > 0 && deleteButtons.length > 0) {
        console.log('✅ 页面看起来正常，有对话数据和删除按钮');
        console.log('💡 现在可以手动点击删除按钮测试，或运行 testDeleteButtonClick()');
    } else if (conversationTexts.length === 0) {
        console.log('❌ 没有找到对话数据，可能需要先加载对话');
    } else if (deleteButtons.length === 0) {
        console.log('❌ 没有找到删除按钮，可能UI有问题');
    }
    
    return {
        conversationTexts: conversationTexts.length,
        deleteButtons: deleteButtons.length
    };
}

// 导出函数供手动调用
window.checkFrontend = runFullCheck;
window.testDeleteClick = testDeleteButtonClick;
window.checkConversations = checkConversationContainer;
window.checkDeleteButtons = checkDeleteButtons;
window.setupMonitors = function() {
    setupConfirmMonitor();
    monitorNetworkRequests();
};

console.log('✅ 前端检查脚本已加载');
console.log('💡 运行 checkFrontend() 开始完整检查');
console.log('💡 运行 testDeleteClick() 测试删除按钮');
console.log('💡 运行 setupMonitors() 设置监控');

// 自动运行检查
runFullCheck();