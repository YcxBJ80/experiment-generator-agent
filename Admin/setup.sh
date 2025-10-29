#!/bin/bash

# 管理后台快速设置脚本

echo "======================================"
echo "  实验可视化管理后台 - 快速设置"
echo "======================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js"
    echo "请先安装 Node.js (>= 16.x): https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js 版本: $(node --version)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm"
    exit 1
fi

echo "✓ npm 版本: $(npm --version)"
echo ""

# 安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✓ 依赖安装完成"
echo ""

# 检查环境变量文件
if [ ! -f ".env.local" ]; then
    echo "⚠️  未找到 .env.local 文件"
    echo ""
    echo "请创建 .env.local 文件并添加以下配置:"
    echo ""
    echo "VITE_SUPABASE_URL=your_supabase_url"
    echo "VITE_SUPABASE_ANON_KEY=your_supabase_anon_key"
    echo "VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key"
    echo ""
    
    read -p "是否现在创建 .env.local 文件? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            echo "✓ 已创建 .env.local 文件"
            echo "⚠️  请编辑 .env.local 文件填入正确的配置"
            echo ""
        else
            echo "❌ 未找到 .env.example 文件"
        fi
    fi
else
    echo "✓ 找到 .env.local 文件"
    echo ""
fi

# 完成
echo "======================================"
echo "  ✓ 设置完成!"
echo "======================================"
echo ""
echo "下一步:"
echo "1. 确保 .env.local 文件配置正确"
echo "2. 运行数据库迁移 (参见 QUICKSTART.md)"
echo "3. 启动开发服务器: npm run dev"
echo ""
echo "详细文档:"
echo "- 快速启动: QUICKSTART.md"
echo "- 使用指南: ADMIN_GUIDE.md"
echo "- 完整说明: README.md"
echo ""

