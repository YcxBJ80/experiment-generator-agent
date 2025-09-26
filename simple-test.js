// 简化的前端测试脚本 - 直接复制到浏览器控制台运行

console.log('🚀 开始删除功能测试...');

// 1. 检查页面基本状态
console.log('📄 当前页面:', window.location.href);
console.log('📄 页面标题:', document.title);

// 2. 查找所有按钮
const allButtons = document.querySelectorAll('button');
console.log('📊 页面总按钮数量:', allButtons.length);

// 3. 查找删除按钮（包含SVG图标的按钮）
let deleteButtons = [];
allButtons.forEach((btn, index) => {
    const hasSvg = btn.querySelector('svg') !== null;
    const innerHTML = btn.innerHTML;
    
    if (hasSvg || innerHTML.includes('Trash') || innerHTML.includes('delete')) {
        deleteButtons.push({
            index,
            element: btn,
            innerHTML: innerHTML.substring(0, 100),
            className: btn.className
        });
    }
});

console.log('🗑️ 找到的删除按钮数量:', deleteButtons.length);
deleteButtons.forEach((btn, i) => {
    console.log(`删除按钮 ${i}:`, btn.innerHTML, btn.className);
});

// 4. 查找对话文本
const allDivs = document.querySelectorAll('div');
let conversationDivs = [];
allDivs.forEach((div, index) => {
    const text = div.textContent || '';
    if (text.includes('测试对话') || text.includes('New Conversation') || text.includes('乙酰水杨酸')) {
        conversationDivs.push({
            index,
            text: text.substring(0, 50)
        });
    }
});

console.log('💬 找到的对话文本数量:', conversationDivs.length);
conversationDivs.forEach((item, i) => {
    console.log(`对话 ${i}:`, item.text);
});

// 5. 设置confirm监控
if (!window.confirm._monitored) {
    const originalConfirm = window.confirm;
    window.confirm = function(message) {
        console.log('🔔 ===== CONFIRM被调用! =====');
        console.log('消息:', message);
        console.log('时间:', new Date().toLocaleTimeString());
        console.trace('调用堆栈:');
        
        const result = originalConfirm.call(this, message);
        console.log('用户选择:', result ? '确认' : '取消');
        console.log('🔔 ===== CONFIRM结束 =====');
        return result;
    };
    window.confirm._monitored = true;
    console.log('✅ confirm监控已设置');
}

// 6. 测试函数
window.testDelete = function() {
    console.log('🎯 开始测试删除按钮...');
    if (deleteButtons.length > 0) {
        console.log('点击第一个删除按钮...');
        deleteButtons[0].element.click();
    } else {
        console.log('❌ 没有找到删除按钮');
    }
};

console.log('✅ 测试脚本加载完成');
console.log('💡 运行 testDelete() 来测试删除功能');

// 总结
console.log('\n📊 检查结果总结:');
console.log(`- 删除按钮: ${deleteButtons.length} 个`);
console.log(`- 对话文本: ${conversationDivs.length} 个`);

if (deleteButtons.length === 0) {
    console.log('❌ 问题：没有找到删除按钮！');
} else if (conversationDivs.length === 0) {
    console.log('❌ 问题：没有找到对话数据！');
} else {
    console.log('✅ 页面看起来正常，可以测试删除功能');
}