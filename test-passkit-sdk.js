const { PassKit } = require('passkit-node-sdk');
const config = require('./passkit-config');

async function testPassKitConnection() {
    try {
        console.log('Initializing PassKit client...');
        const client = new PassKit(config);

        console.log('Testing connection...');
        const health = await client.health.check({});
        console.log('Health check result:', health);

        // Try to get program details
        console.log('Getting program details...');
        const program = await client.membership.getProgram({
            id: '1V7DN30nrcC9awRsufcWAC'
        });
        console.log('Program details:', program);

    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details
        });
    }
}

testPassKitConnection(); 