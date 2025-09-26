// 删除功能调试脚本
console.log('🔧 开始删除功能调试...');

// 1. 检查页面状态
console.log('📄 当前页面URL:', window.location.href);
console.log('🔍 检查React应用是否加载...');

// 2. 查找删除按钮
function findDeleteButtons() {
  const buttons = document.querySelectorAll('button');
  const deleteButtons = [];
  
  buttons.forEach((btn, index) => {
    const hasTrashIcon = btn.querySelector('svg') || btn.innerHTML.includes('Trash');
    const hasDeleteTitle = btn.title && btn.title.toLowerCase().includes('delete');
    
    if (hasTrashIcon || hasDeleteTitle) {
      deleteButtons.push({
        index,
        element: btn,
        title: btn.title,
        innerHTML: btn.innerHTML.substring(0, 100)
      });
    }
  });
  
  console.log('🗑️ 找到的删除按钮:', deleteButtons.length);
  deleteButtons.forEach((btn, i) => {
    console.log(`  按钮 ${i + 1}:`, btn.title, btn.innerHTML.substring(0, 50));
  });
  
  return deleteButtons;
}

// 3. 监控confirm函数
const originalConfirm = window.confirm;
window.confirm = function(message) {
  console.log('🔔 confirm对话框被调用，消息:', message);
  const result = originalConfirm.call(this, message);
  console.log('👤 用户选择结果:', result);
  return result;
};

// 4. 监控网络请求
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  const options = args[1] || {};
  
  if (url.includes('/conversations/') && options.method === 'DELETE') {
    console.log('🌐 发送删除请求:', url, options);
  }
  
  return originalFetch.apply(this, args).then(response => {
    if (url.includes('/conversations/') && options.method === 'DELETE') {
      console.log('📡 删除请求响应:', response.status, response.statusText);
    }
    return response;
  });
};

// 5. 主要测试函数
function runDeleteTest() {
  console.log('🚀 开始删除测试...');
  
  const deleteButtons = findDeleteButtons();
  
  if (deleteButtons.length === 0) {
    console.log('❌ 没有找到删除按钮');
    return;
  }
  
  console.log('✅ 找到删除按钮，准备测试第一个按钮');
  console.log('⚠️ 请手动点击删除按钮进行测试，或者运行 testDeleteButton() 自动测试');
  
  // 提供手动测试函数
  window.testDeleteButton = function() {
    if (deleteButtons.length > 0) {
      console.log('🖱️ 模拟点击删除按钮...');
      deleteButtons[0].element.click();
    }
  };
}

// 6. 等待页面加载完成后运行测试
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runDeleteTest);
} else {
  setTimeout(runDeleteTest, 1000);
}

console.log('📝 调试脚本加载完成。可以运行以下命令:');
console.log('  - runDeleteTest(): 重新运行删除测试');
console.log('  - testDeleteButton(): 自动点击第一个删除按钮');
console.log('  - findDeleteButtons(): 查找所有删除按钮');