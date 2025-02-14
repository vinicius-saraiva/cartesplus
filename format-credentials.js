const fs = require('fs');

// Read credentials.json
const credentials = require('./credentials.json');

// Properly format private key
if (credentials.private_key) {
    // First remove existing \n and spaces
    let privateKey = credentials.private_key.replace(/\\n/g, '')
                                          .replace(/\n/g, '')
                                          .replace(/\s/g, '');
    
    // Add \n after header, before footer, and every 64 characters
    privateKey = privateKey
        .replace('-----BEGINPRIVATEKEY-----', '-----BEGIN PRIVATE KEY-----\n')
        .replace('-----ENDPRIVATEKEY-----', '\n-----END PRIVATE KEY-----\n');
    
    // Insert \n every 64 characters between header and footer
    const matches = privateKey.match(/-----BEGIN PRIVATE KEY-----\n(.*)\n-----END PRIVATE KEY-----/);
    if (matches && matches[1]) {
        const key = matches[1];
        const chunks = key.match(/.{1,64}/g) || [];
        const formattedKey = chunks.join('\n');
        privateKey = privateKey.replace(key, formattedKey);
    }
    
    credentials.private_key = privateKey;
}

// Convert to single line
const jsonString = JSON.stringify(credentials);

// Save to file
fs.writeFileSync('formatted-credentials.txt', jsonString);
console.log('Formatted credentials saved to formatted-credentials.txt'); 