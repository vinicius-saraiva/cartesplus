const { PassKit } = require('passkit-node-sdk');
require('dotenv').config();

async function testConnection() {
    try {
        const client = new PassKit({
            apiKey: process.env.PASSKIT_API_KEY,
            apiSecret: process.env.PASSKIT_API_SECRET,
            address: "grpc.pub1.passkit.io"
        });

        console.log('Attempting to connect...');
        const result = await client.health.check({});
        console.log('Connection successful:', result);
    } catch (error) {
        console.error('Connection failed:', error);
    }
}

testConnection(); 