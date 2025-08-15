Write-Host "Building DCCI Ministries website for production..." -ForegroundColor Green
npm run build:prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Please check for errors." -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host "Build successful! Deploying to Firebase..." -ForegroundColor Green
firebase deploy --only hosting

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed! Please check Firebase configuration." -ForegroundColor Red
    Write-Host "You may need to run: firebase login" -ForegroundColor Yellow
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host "Deployment successful!" -ForegroundColor Green
Write-Host "Your site is now available at: https://dcci-ministries.web.app" -ForegroundColor Cyan
Read-Host "Press Enter to continue"
