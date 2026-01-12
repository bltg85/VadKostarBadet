# Simple PowerShell script to update version - run this before each commit/push
# Usage: .\update-version-simple.ps1

try {
    $commitHash = (git rev-parse HEAD).Substring(0, 7)
    Write-Host "Updating version to: $commitHash" -ForegroundColor Cyan

    $files = @('index.html', 'om.html', 'kontakt.html', 'integritetspolicy.html')

    foreach ($file in $files) {
        if (Test-Path $file) {
            $content = Get-Content $file -Raw -Encoding UTF8
            # Simple string replacement - find the meta tag and replace content value
            # First try to find and replace existing meta tag
            if ($content -match 'name="git-commit"') {
                $content = $content -replace '(name="git-commit"\s+content=")[^"]*(")', "`$1$commitHash`$2"
            } else {
                # If meta tag is broken or missing, replace any broken version
                $content = $content -replace '<meta\s+\$1[^"]*">', "<meta name=`"git-commit`" content=`"$commitHash`">"
                # Or add it after description if completely missing
                if ($content -notmatch 'name="git-commit"') {
                    $content = $content -replace '(<meta name="description"[^>]*>)', "`$1`n    <meta name=`"git-commit`" content=`"$commitHash`">"
                }
            }
            Set-Content $file -Value $content -Encoding UTF8 -NoNewline
            Write-Host "  Updated $file" -ForegroundColor Green
        }
    }

    Write-Host ""
    Write-Host "Version update complete! Don't forget to commit the changes." -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Make sure you are in a git repository and have at least one commit." -ForegroundColor Yellow
}
