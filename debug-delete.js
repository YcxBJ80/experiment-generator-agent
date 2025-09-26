// 在浏览器控制台中运行此脚本来测试删除功能

// 1. 查找所有删除按钮
const deleteButtons = document.querySelectorAll('button[title="Delete Conversation"]');
console.log('找到删除按钮数量:', deleteButtons.length);

// 2. 如果有删除按钮，模拟点击第一个
if (deleteButtons.length > 0) {
    console.log('准备点击第一个删除按钮...');
    
    // 重写confirm函数来观察是否被调用
    const originalConfirm = window.confirm;
    window.confirm = function(message) {
        console.log('🚨 confirm函数被调用，消息:', message);
        const result = originalConfirm.call(this, message);
        console.log('🚨 confirm结果:', result);
        return result;
    };
    
    // 点击删除按钮
    deleteButtons[0].click();
    
    // 恢复原始confirm函数
    setTimeout(() => {
        window.confirm = originalConfirm;
        console.log('confirm函数已恢复');
    }, 5000);
} else {
    console.log('❌ 没有找到删除按钮');
    
    // 查看页面结构
    console.log('页面中的所有按钮:');
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach((btn, index) => {
        console.log(`按钮 ${index}:`, {
            text: btn.textContent.trim(),
            title: btn.title,
            className: btn.className,
            onclick: btn.onclick ? 'has onclick' : 'no onclick'
        });
    });
}

// 3. 检查是否有对话列表
const conversations = document.querySelectorAll('[class*="cursor-pointer"]');
console.log('找到对话项数量:', conversations.length);

// 4. 检查React组件状态（如果可访问）
if (window.React) {
    console.log('React已加载');
} else {
    console.log('React未检测到');
}