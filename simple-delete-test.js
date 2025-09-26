// 简化的删除功能测试脚本
// 请在应用页面 (http://localhost:5173/) 的浏览器控制台中运行此脚本

console.log('🧪 开始删除功能测试...');

// 1. 检查页面状态
function checkPage() {
    console.log('\n📊 页面状态检查:');
    console.log('- URL:', window.location.href);
    
    // 查找对话元素
    const conversations = document.querySelectorAll('[class*="conversation"], [class*="cursor-pointer"]');
    console.log('- 对话元素数量:', conversations.length);
    
    // 查找删除按钮 (垃圾桶图标)
    const deleteButtons = document.querySelectorAll('button svg[class*="lucide-trash"], button[title*="delete" i], button[title*="删除" i]');
    console.log('- 删除按钮数量:', deleteButtons.length);
    
    // 如果没找到，尝试其他方式
    if (deleteButtons.length === 0) {
        const allButtons = document.querySelectorAll('button');
        console.log('- 总按钮数量:', allButtons.length);
        
        // 查找包含垃圾桶图标的按钮
        const trashButtons = Array.from(allButtons).filter(btn => {
            const svg = btn.querySelector('svg');
            return svg && (svg.innerHTML.includes('trash') || svg.innerHTML.includes('M3 6h18'));
        });
        console.log('- 垃圾桶按钮数量:', trashButtons.length);
        return trashButtons;
    }
    
    return Array.from(deleteButtons).map(svg => svg.closest('button')).filter(Boolean);
}

// 2. 监控confirm函数
let originalConfirm = window.confirm;
let confirmCalls = [];

function startConfirmMonitoring() {
    console.log('\n🔍 开始监控confirm函数...');
    
    window.confirm = function(message) {
        const callInfo = {
            timestamp: new Date().toISOString(),
            message: message,
            stack: new Error().stack
        };
        confirmCalls.push(callInfo);
        
        console.log('\n📞 confirm被调用:');
        console.log('- 时间:', callInfo.timestamp);
        console.log('- 消息:', message);
        console.log('- 调用栈:', callInfo.stack.split('\n').slice(1, 4).join('\n'));
        
        // 调用原始confirm
        const result = originalConfirm.call(this, message);
        console.log('- 用户选择:', result ? '确定' : '取消');
        console.log('- 返回值类型:', typeof result);
        
        return result;
    };
}

function stopConfirmMonitoring() {
    window.confirm = originalConfirm;
    console.log('\n✅ confirm监控已停止');
    console.log('📊 总共监控到', confirmCalls.length, '次confirm调用');
}

// 3. 测试删除功能
function testDelete() {
    console.log('\n🗑️ 开始删除功能测试...');
    
    const deleteButtons = checkPage();
    
    if (deleteButtons.length === 0) {
        console.log('❌ 没有找到删除按钮');
        console.log('💡 请确保页面上有对话，并且删除按钮可见');
        return;
    }
    
    console.log('✅ 找到', deleteButtons.length, '个删除按钮');
    
    // 开始监控
    startConfirmMonitoring();
    
    // 提示用户
    console.log('\n📋 测试步骤:');
    console.log('1. 现在点击任意一个删除按钮');
    console.log('2. 在弹出的确认对话框中点击"取消"');
    console.log('3. 检查对话是否仍然存在（应该存在）');
    console.log('4. 再次点击删除按钮');
    console.log('5. 在确认对话框中点击"确定"');
    console.log('6. 检查对话是否被删除（应该被删除）');
    
    console.log('\n⚠️ 重要提示:');
    console.log('- 如果点击"取消"后对话仍然消失，说明bug仍然存在');
    console.log('- 如果点击"取消"后对话保持不变，说明修复成功');
    
    // 30秒后自动停止监控
    setTimeout(() => {
        stopConfirmMonitoring();
        console.log('\n⏰ 监控已自动停止（30秒超时）');
    }, 30000);
    
    return deleteButtons;
}

// 4. 手动停止监控的函数
window.stopDeleteTest = function() {
    stopConfirmMonitoring();
    console.log('\n🛑 测试已手动停止');
};

// 5. 查看监控结果的函数
window.showConfirmCalls = function() {
    console.log('\n📊 confirm调用记录:');
    if (confirmCalls.length === 0) {
        console.log('- 没有记录到confirm调用');
    } else {
        confirmCalls.forEach((call, index) => {
            console.log(`${index + 1}. 时间: ${call.timestamp}`);
            console.log(`   消息: ${call.message}`);
        });
    }
};

// 启动测试
console.log('\n🚀 删除功能测试已准备就绪');
console.log('💡 可用命令:');
console.log('- testDelete() - 开始测试');
console.log('- stopDeleteTest() - 停止测试');
console.log('- showConfirmCalls() - 查看confirm调用记录');
console.log('\n👆 现在运行 testDelete() 开始测试');

// 自动开始测试
testDelete();