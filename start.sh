#!/bin/bash

echo "========================================="
echo "   服装管理后台系统启动脚本"
echo "========================================="
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null
then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo ""

# 检查 npm 是否安装
if ! command -v npm &> /dev/null
then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "✅ npm 版本: $(npm -v)"
echo ""

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
    echo ""
fi

# 创建必要的目录
mkdir -p uploads/products
mkdir -p uploads/looks
mkdir -p templates

echo "✅ 依赖安装完成"
echo ""
echo "🚀 启动服务器..."
echo ""
echo "========================================="

# 启动服务器
npm start
