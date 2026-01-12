// Script to update version in HTML files based on git commit hash
const fs = require('fs');
const { execSync } = require('child_process');

try {
    // Get current commit hash
    const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim().substring(0, 7);
    
    // List of HTML files to update
    const htmlFiles = [
        'index.html',
        'om.html',
        'kontakt.html',
        'integritetspolicy.html'
    ];
    
    htmlFiles.forEach(file => {
        if (fs.existsSync(file)) {
            let content = fs.readFileSync(file, 'utf-8');
            
            // Update or add git-commit meta tag
            const metaTagRegex = /<meta\s+name=["']git-commit["']\s+content=["'][^"']*["']\s*\/?>/i;
            const newMetaTag = `<meta name="git-commit" content="${commitHash}">`;
            
            if (metaTagRegex.test(content)) {
                // Replace existing meta tag
                content = content.replace(metaTagRegex, newMetaTag);
            } else {
                // Add meta tag after description meta tag
                const descriptionMetaRegex = /(<meta\s+name=["']description["'][^>]*>)/i;
                if (descriptionMetaRegex.test(content)) {
                    content = content.replace(descriptionMetaRegex, `$1\n    ${newMetaTag}`);
                }
            }
            
            fs.writeFileSync(file, content, 'utf-8');
            console.log(`Updated ${file} with commit hash: ${commitHash}`);
        }
    });
    
    console.log('Version update complete!');
} catch (error) {
    console.error('Error updating version:', error.message);
    process.exit(1);
}
