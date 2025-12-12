
const https = require('https');

const apiKey = 'AIzaSyClChLGWonVf7L4YWQ7fBGOkKmmOzQSSIw';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                json.models.forEach(m => {
                    if (m.name.includes('gemini') && m.supportedGenerationMethods.includes('generateContent')) {
                        console.log(m.name);
                    }
                });
            } else {
                console.log(data);
            }
        } catch (e) {
            console.log(data);
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
