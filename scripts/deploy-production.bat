@echo off
echo 🚀 Starting deployment to PRODUCTION environment...
echo 📍 Target: dcci-ministries
echo 🔧 Build Configuration: production

echo.
echo ⚠️  WARNING: You are about to deploy to PRODUCTION!
echo This will update the live website at https://dcci-ministries.web.app
echo.
set /p confirm="Are you sure you want to continue? (y/N): "
if /i not "%confirm%"=="y" (
    echo Deployment cancelled.
    pause
    exit /b 0
)

echo.
echo 🏗️  Building for production configuration...
call ng build --configuration production
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo 🔄 Switching to Firebase project: dcci-ministries
call firebase use dcci-ministries
if %errorlevel% neq 0 (
    echo ❌ Firebase project switch failed!
    pause
    exit /b 1
)

echo.
echo 🚀 Deploying to Firebase...
call firebase deploy --only hosting
if %errorlevel% neq 0 (
    echo ❌ Deployment failed!
    pause
    exit /b 1
)

echo.
echo 🎉 Deployment to PRODUCTION completed successfully!
echo 🌐 Your app is now live at: https://dcci-ministries.web.app
echo.
pause
