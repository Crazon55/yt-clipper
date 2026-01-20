const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const YT_DLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
const YT_DLP_PATH = path.join(__dirname, '..', 'yt-dlp');

console.log('Downloading yt-dlp...');

// Download yt-dlp binary
const file = fs.createWriteStream(YT_DLP_PATH);

https.get(YT_DLP_URL, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
            redirectResponse.pipe(file);
            file.on('finish', () => {
                file.close();
                // Make executable on Unix systems
                if (process.platform !== 'win32') {
                    try {
                        fs.chmodSync(YT_DLP_PATH, '755');
                        console.log('✓ yt-dlp downloaded and made executable');
                    } catch (err) {
                        console.log('✓ yt-dlp downloaded (chmod failed, but may still work)');
                    }
                } else {
                    console.log('✓ yt-dlp downloaded');
                }
            });
        });
    } else {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            if (process.platform !== 'win32') {
                try {
                    fs.chmodSync(YT_DLP_PATH, '755');
                    console.log('✓ yt-dlp downloaded and made executable');
                } catch (err) {
                    console.log('✓ yt-dlp downloaded (chmod failed, but may still work)');
                }
            } else {
                console.log('✓ yt-dlp downloaded');
            }
        });
    }
}).on('error', (err) => {
    fs.unlinkSync(YT_DLP_PATH);
    console.error('Error downloading yt-dlp:', err.message);
    console.log('Falling back to pip install...');
    try {
        execSync('pip install yt-dlp', { stdio: 'inherit' });
        console.log('✓ yt-dlp installed via pip');
    } catch (pipErr) {
        console.error('Failed to install via pip. Please install yt-dlp manually.');
        process.exit(1);
    }
});
