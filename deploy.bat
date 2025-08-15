@echo off
echo Building DCCI Ministries website for production...
call npm run build:prod

if %ERRORLEVEL% NEQ 0 (
    echo Build failed! Please check for errors.
    pause
    exit /b 1
)

echo Build successful! Deploying to Firebase...
call firebase deploy --only hosting

if %ERRORLEVEL% NEQ 0 (
    echo Deployment failed! Please check Firebase configuration.
    pause
    exit /b 1
)

echo Deployment successful!
echo Your site is now available at: https://dcci-ministries.web.app
pause
