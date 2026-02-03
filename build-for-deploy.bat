@echo off
echo ==========================================
echo 🏗️  BUILDING AI NEWS GENERATOR
echo ==========================================

REM 1. Build Docker Image
echo [1/3] Building Docker Image...
docker build -t ai-news-generator .
if %errorlevel% neq 0 (
    echo ❌ Build failed! Please make sure Docker Desktop is running.
    pause
    exit /b %errorlevel%
)

REM 2. Save Image to File
echo [2/3] Saving image to file (this may take a minute)...
docker save -o ai-news-app.tar ai-news-generator
if %errorlevel% neq 0 (
    echo ❌ Save failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo ✅ BUILD SUCCESSFUL!
echo ==========================================
echo.
echo You have created: ai-news-app.tar
echo.
echo [NEXT STEPS]
echo 1. Open WinSCP
echo 2. Upload these 3 files to /opt/ai-news-generator/ on your server:
echo    - ai-news-app.tar (The App)
echo    - docker-compose.prod.yml (Config)
echo    - .env (Your API Key)
echo.
echo 3. Run this command on server:
echo    cd /opt/ai-news-generator
echo    docker load -i ai-news-app.tar
echo    docker-compose -f docker-compose.prod.yml up -d
echo.
pause
