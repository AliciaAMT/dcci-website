# Staging Deployment Script
Write-Host "🚀 Starting deployment to STAGING environment..." -ForegroundColor Cyan
Write-Host "📍 Target: dcci-ministries-staging" -ForegroundColor Yellow
Write-Host "🔧 Build Configuration: test" -ForegroundColor Yellow

Write-Host "`n🏗️  Building for test configuration..." -ForegroundColor Green
try {
    ng build --configuration test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        Read-Host "Press Enter to continue"
        exit 1
    }
} catch {
    Write-Host "❌ Build failed: $_" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host "`n🔄 Switching to Firebase project: dcci-ministries-staging" -ForegroundColor Green
try {
    firebase use dcci-ministries-staging
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Firebase project switch failed!" -ForegroundColor Red
        Read-Host "Press Enter to continue"
        exit 1
    }
} catch {
    Write-Host "❌ Firebase project switch failed: $_" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host "`n🚀 Deploying to Firebase..." -ForegroundColor Green
try {
    firebase deploy --only hosting
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        Read-Host "Press Enter to continue"
        exit 1
    }
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host "`n🎉 Deployment to STAGING completed successfully!" -ForegroundColor Green
Write-Host "🌐 Your app is now live at: https://dcci-ministries-staging.web.app" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue"
