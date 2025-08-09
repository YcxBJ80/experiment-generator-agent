#!/bin/bash

# 🚀 GitHub部署脚本
# 使用方法：./deploy-to-github.sh YOUR_GITHUB_USERNAME

if [ -z "$1" ]; then
    echo "❌ 请提供GitHub用户名"
    echo "使用方法: ./deploy-to-github.sh YOUR_GITHUB_USERNAME"
    exit 1
fi

USERNAME=$1
REPO_NAME="hackathone2-perplexity-mcp"

echo "🚀 准备部署到GitHub..."
echo "用户名: $USERNAME"
echo "仓库名: $REPO_NAME"

# 检查是否已经有远程仓库
if git remote get-url origin 2>/dev/null; then
    echo "⚠️  远程仓库已存在，跳过添加步骤"
else
    echo "📡 添加远程仓库..."
    git remote add origin https://github.com/$USERNAME/$REPO_NAME.git
fi

echo "🔄 推送到GitHub..."
git branch -M main
git push -u origin main

echo "✅ 部署完成！"
echo "🌐 仓库地址: https://github.com/$USERNAME/$REPO_NAME"
echo ""
echo "🎯 下一步："
echo "1. 访问 https://github.com/$USERNAME/$REPO_NAME"
echo "2. 检查README和代码是否正确显示"
echo "3. 考虑添加GitHub Pages部署（如果需要）"