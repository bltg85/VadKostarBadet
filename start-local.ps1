Write-Host "Starting local server..." -ForegroundColor Green
Write-Host ""
Write-Host "Open your browser and go to: http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

Set-Location $PSScriptRoot

# Try Python first
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCmd) {
    python -m http.server 8000
} else {
    Write-Host "Python not found. Trying Node.js..." -ForegroundColor Yellow
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        # Check if http-server is installed
        $httpServer = Get-Command http-server -ErrorAction SilentlyContinue
        if (-not $httpServer) {
            Write-Host "Installing http-server..." -ForegroundColor Yellow
            npm install -g http-server
        }
        http-server -p 8000
    } else {
        Write-Host "Error: Neither Python nor Node.js found!" -ForegroundColor Red
        Write-Host "Please install Python (https://www.python.org) or Node.js (https://nodejs.org)" -ForegroundColor Yellow
        pause
    }
}
