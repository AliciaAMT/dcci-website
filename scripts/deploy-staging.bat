@echo off
echo 🚀 Starting deployment to STAGING environment...
echo 📍 Target: dcci-ministries-staging
echo 🔧 Build Configuration: test

echo.
echo 🏗️  Building for test configuration...
call ng build --configuration test
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo 🔄 Switching to Firebase project: dcci-ministries-staging
call firebase use dcci-ministries-staging
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
echo 🎉 Deployment to STAGING completed successfully!
echo 🌐 Your app is now live at: https://dcci-ministries-staging.web.app
echo.
pause
