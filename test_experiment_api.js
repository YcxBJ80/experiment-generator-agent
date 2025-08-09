// 简单的实验生成API测试
console.log('🧪 测试实验生成API...');

const testData = {
  prompt: "创建一个简单的计数器实验"
};

fetch('http://localhost:8766/api/experiments/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('响应状态:', response.status);
  console.log('响应状态文本:', response.statusText);
  return response.json();
})
.then(data => {
  console.log('响应数据:', JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error('请求失败:', error);
});