// 测试删除功能的脚本
console.log('开始测试删除功能...');

// 保存原始的confirm函数
const originalConfirm = window.confirm;

// 重写confirm函数来监控调用
window.confirm = function(message) {
    console.log('🔔 confirm函数被调用了!');
    console.log('📝 确认消息:', message);
    
    // 调用原始confirm函数
    const result = originalConfirm.call(this, message);
    console.log('✅ 用户选择:', result ? '确认' : '取消');
    
    return result;
};

// 查找删除按钮
function findDeleteButtons() {
    // 查找所有可能的删除按钮
    const buttons = document.querySelectorAll('button');
    const deleteButtons = [];
    
    buttons.forEach((button, index) => {
        // 检查按钮是否包含垃圾桶图标或删除相关的类名
        const hasTrashIcon = button.querySelector('svg') || button.innerHTML.includes('Trash');
        const hasDeleteClass = button.className.includes('delete') || button.className.includes('trash');
        
        if (hasTrashIcon || hasDeleteClass) {
            deleteButtons.push({button, index});
        }
    });
    
    return deleteButtons;
}

// 测试删除功能
function testDeleteFunction() {
    console.log('🔍 查找删除按钮...');
    
    const deleteButtons = findDeleteButtons();
    console.log(`📊 找到 ${deleteButtons.length} 个删除按钮`);
    
    if (deleteButtons.length > 0) {
        console.log('🎯 点击第一个删除按钮...');
        const firstButton = deleteButtons[0].button;
        
        // 模拟点击事件
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        firstButton.dispatchEvent(clickEvent);
        
        // 等待一下看是否有confirm调用
        setTimeout(() => {
            console.log('⏰ 等待确认对话框...');
        }, 100);
    } else {
        console.log('❌ 没有找到删除按钮');
        console.log('🔍 让我检查页面上的所有按钮...');
        
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach((btn, i) => {
            console.log(`按钮 ${i}:`, btn.outerHTML.substring(0, 100));
        });
    }
}

// 检查页面是否加载完成
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testDeleteFunction);
} else {
    testDeleteFunction();
}

// 也可以手动调用
window.testDelete = testDeleteFunction;

console.log('✅ 测试脚本已加载。如果页面已加载完成，删除测试应该已经运行。');
console.log('💡 你也可以手动调用 testDelete() 来重新测试。');