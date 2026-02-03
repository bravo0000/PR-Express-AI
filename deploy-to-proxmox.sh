#!/bin/bash
# ========================================
# AI News Generator - Quick Deploy Script
# Container IP: 192.168.44.252
# ========================================

echo "🚀 Starting deployment to 192.168.44.252..."

# 1. Upload code
echo "📦 Step 1: Uploading code..."
powershell -Command "cd 'c:\Users\User\OneDrive - Nakhon Phanom University\app\n8n Ai'; scp -r server.js index.html package.json package-lock.json Dockerfile docker-compose.prod.yml .env.example .dockerignore root@192.168.44.252:/opt/ai-news-generator/"

echo "✅ Code uploaded!"

# Next steps to run on container:
echo ""
echo "=========================================="
echo "📋 Next: SSH to container and run:"
echo "=========================================="
echo "ssh root@192.168.44.252"
echo ""
echo "Then run these commands:"
echo "cd /opt/ai-news-generator"
echo "cp .env.example .env"
echo "nano .env  # Add your GEMINI_API_KEY"
echo "docker compose -f docker-compose.prod.yml build"
echo "docker compose -f docker-compose.prod.yml up -d  # Or 'restart' if only updating code"
echo ""
echo "🌐 Access: http://192.168.44.252:3000"
echo "=========================================="
