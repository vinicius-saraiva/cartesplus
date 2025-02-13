const fs = require('fs');

// Read credentials.json
const credentials = require('./credentials.json');

// Convert private key newlines to literal \n
if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\n/g, "\\n");
}

// Convert to single line and properly escape
const jsonString = JSON.stringify(credentials);

console.log(jsonString); 