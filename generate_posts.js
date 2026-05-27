const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ID = 'mytab-4b290';
const APP_ID = 'mytab-proto';
const API_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/artifacts/${APP_ID}/public/data/posts`;
const POSTS_DIR = path.join(__dirname, 'posts');

// Ensure posts directory exists
if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR);
}

function getPostNumericId(post) {
    if (!post) return 0;
    if (post.numericId) return post.numericId;
    let hash = 0;
    const s = post.id || '';
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % 900000 + 100000;
}

function parseFirestoreDoc(doc) {
    const obj = {
        id: doc.name.split('/').pop()
    };
    if (doc.fields) {
        for (const [key, value] of Object.entries(doc.fields)) {
            if (value.hasOwnProperty('stringValue')) {
                obj[key] = value.stringValue;
            } else if (value.hasOwnProperty('integerValue')) {
                obj[key] = parseInt(value.integerValue, 10);
            } else if (value.hasOwnProperty('doubleValue')) {
                obj[key] = parseFloat(value.doubleValue);
            } else if (value.hasOwnProperty('booleanValue')) {
                obj[key] = value.booleanValue;
            } else if (value.hasOwnProperty('nullValue')) {
                obj[key] = null;
            } else if (value.hasOwnProperty('arrayValue')) {
                const arr = value.arrayValue.values || [];
                obj[key] = arr.map(item => item.stringValue || item.integerValue || '');
            } else if (value.hasOwnProperty('mapValue')) {
                obj[key] = value.mapValue.fields || {};
            }
        }
    }
    return obj;
}

function fetchAllPosts() {
    return new Promise((resolve, reject) => {
        https.get(API_URL, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.documents) {
                        resolve(json.documents.map(parseFirestoreDoc));
                    } else {
                        resolve([]);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function run() {
    try {
        console.log('Fetching posts from Firestore...');
        const posts = await fetchAllPosts();
        console.log(`Successfully fetched ${posts.length} posts.`);

        const activeFiles = new Set();

        posts.forEach(post => {
            const numericId = getPostNumericId(post);
            const fileName = `${numericId}.html`;
            const filePath = path.join(POSTS_DIR, fileName);

            // Generate content metadata
            let rawTitle = post.title || (post.content ? post.content.substring(0, 60) + (post.content.length > 60 ? '...' : '') : 'منشور على MyTab');
            let rawDesc = post.content ? post.content.substring(0, 150) + (post.content.length > 150 ? '...' : '') : 'اقرأ هذا الموضوع وتفاعل معه على منصة MyTab';
            
            // Collapse all whitespace and newlines to a single space
            rawTitle = rawTitle.replace(/\s+/g, ' ').trim();
            rawDesc = rawDesc.replace(/\s+/g, ' ').trim();
            
            const title = escapeHtml(rawTitle);
            const description = escapeHtml(rawDesc);
            
            const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);
            const imageUrl = escapeHtml(images.length > 0 ? images[0] : (post.authorPhoto || 'https://i.ibb.co/93y8GcxZ/Picsart-26-05-09-16-59-08-419.png'));
            
            const postUrl = `https://khmohieldin.github.io/MyTab/posts/${numericId}.html`;

            const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <!-- Meta tags for social media bots (Facebook, WhatsApp, Telegram, Twitter) -->
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${postUrl}">
    <meta property="og:type" content="article">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">

    <!-- Redirect humans back to the main app -->
    <script>
        window.location.href = "../index.html?post=${numericId}";
    </script>
</head>
<body>
    <div style="text-align: center; margin-top: 100px; font-family: sans-serif; direction: rtl; padding: 20px;">
        <h2 style="color: #059669;">جاري توجيهك إلى منصة MyTab...</h2>
        <p>إذا لم يتم توجيهك تلقائياً خلال ثوانٍ، <a href="../index.html?post=${numericId}" style="color: #2563eb; text-decoration: underline; font-weight: bold;">اضغط هنا لفتح المنشور</a>.</p>
    </div>
</body>
</html>`;

            fs.writeFileSync(filePath, htmlContent, 'utf8');
            activeFiles.add(fileName);
        });

        // Clean up files in posts folder that are no longer active posts (deleted posts)
        const files = fs.readdirSync(POSTS_DIR);
        files.forEach(file => {
            if (file.endsWith('.html') && !activeFiles.has(file)) {
                fs.unlinkSync(path.join(POSTS_DIR, file));
                console.log(`Removed deleted post file: ${file}`);
            }
        });

        console.log('All static post files generated successfully!');
    } catch (e) {
        console.error('Error generating post files:', e);
        process.exit(1);
    }
}

run();
