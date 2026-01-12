# PowerShell script to update version in HTML files based on git commit hash

try {
    # Get current commit hash (or HEAD if not committed yet)
    try {
        $commitHash = (git rev-parse HEAD).Substring(0, 7)
    } catch {
        # If no commits yet, use a placeholder
        $commitHash = 'dev'
    }
    
    # List of HTML files to update
    $htmlFiles = @(
        'index.html',
        'om.html',
        'kontakt.html',
        'integritetspolicy.html'
    )
    
    foreach ($file in $htmlFiles) {
        if (Test-Path $file) {
            $content = Get-Content $file -Raw -Encoding UTF8
            
            # Update or add git-commit meta tag
            # Escape special characters for regex
            $metaTagPattern = '<meta\s+name=["'']git-commit["'']\s+content=["'][^"'']*["'']\s*\/?>'
            $newMetaTag = "<meta name=`"git-commit`" content=`"$commitHash`">"
            
            if ($content -match $metaTagPattern) {
                # Replace existing meta tag
                $content = $content -replace $metaTagPattern, $newMetaTag
            } else {
                # Add meta tag after description meta tag
                $descriptionPattern = '(<meta\s+name=["'']description["'][^>]*>)'
                if ($content -match $descriptionPattern) {
                    $content = $content -replace $descriptionPattern, "`$1`n    $newMetaTag"
                }
            }
            
            Set-Content $file -Value $content -Encoding UTF8 -NoNewline
            Write-Host "Updated $file with commit hash: $commitHash" -ForegroundColor Green
        }
    }
    
    Write-Host "Version update complete!" -ForegroundColor Green
} catch {
    Write-Host "Error updating version: $_" -ForegroundColor Red
    exit 1
}
