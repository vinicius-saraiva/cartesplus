const express = require('express');
const { GoogleAuth } = require('google-auth-library');
const { JWT } = require('google-auth-library');
const path = require('path');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const https = require('https'); // Built into Node.js
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Your Google Cloud project credentials
const issuerId = process.env.ISSUER_ID;

// Use environment variable on Vercel, local file otherwise
const credentials = process.env.VERCEL 
    ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    : require('./credentials.json');

console.log('Running on:', process.env.VERCEL ? 'Vercel' : 'Local');

// Add this near your other environment variables
const PASSSLOT_API_KEY = process.env.PASSSLOT_API_KEY;
const PASSSLOT_TEMPLATE_ID = process.env.PASSSLOT_TEMPLATE_ID;

// Add this near the top, after app is defined
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

function calculateEAN13CheckDigit(number12) {
    // Remove any spaces and take first 12 digits
    const digits = number12.replace(/\s/g, '').slice(0, 12).split('').map(Number);
    
    // Multiply each digit by 1 or 3 alternately and sum
    const sum = digits.reduce((acc, digit, index) => {
        return acc + digit * (index % 2 === 0 ? 1 : 3);
    }, 0);
    
    // Calculate check digit
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit;
}

function formatEAN13(barcode) {
    // Clean the number and ensure 12 digits (excluding check digit)
    const cleanNumber = barcode.replace(/\s/g, '').slice(0, 12).padStart(12, '0');
    // Calculate and append check digit
    const checkDigit = calculateEAN13CheckDigit(cleanNumber);
    const fullEAN = cleanNumber + checkDigit;
    
    return fullEAN; // Return just the 13 digits without spaces
}

async function generatePass(barcodeNumber) {
    const cleanBarcodeNumber = barcodeNumber.replace(/[^0-9]/g, '');
    
    if (!cleanBarcodeNumber || cleanBarcodeNumber.length < 1) {
        throw new Error('Invalid barcode number');
    }

    const auth = new GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
    });

    const client = await auth.getClient();

    const genericObject = {
        id: `${issuerId}.${cleanBarcodeNumber}`,
        classId: `${issuerId}.Climbing-Card`,
        genericType: 'GENERIC_TYPE_UNSPECIFIED',
        hexBackgroundColor: '#1F303D',
        logo: {
            sourceUri: {
                uri: 'https://vinicius.pm/images/climb-logo.png'
            }
        },
        cardTitle: {
            defaultValue: {
                language: 'en',
                value: 'Climbing Card'
            }
        },
        subheader: {
            defaultValue: {
                language: 'en',
                value: 'Member Card'
            }
        },
        header: {
            defaultValue: {
                language: 'en',
                value: cleanBarcodeNumber
            }
        },
        barcode: {
            type: 'EAN_13',
            value: formatEAN13(cleanBarcodeNumber), // This will be 13 digits without spaces
            alternateText: cleanBarcodeNumber.replace(/(\d{1})(\d{6})(\d{6})/, '$1 $2 $3') // Keep spaces only in display text
        },
        heroImage: {
            sourceUri: {
                uri: 'https://vinicius.pm/images/climb-hero.png'
            }
        },
        textModulesData: [
            {
                id: "member_number",
                header: "Member Number",
                body: cleanBarcodeNumber
            },
            {
                id: "member_since",
                header: "Member Since",
                body: new Date().toLocaleDateString()
            }
        ],
        state: "ACTIVE"
    };

    const response = await client.request({
        url: 'https://walletobjects.googleapis.com/walletobjects/v1/genericObject',
        method: 'POST',
        data: genericObject
    });

    const claims = {
        iss: credentials.client_email,
        aud: 'google',
        origins: ['localhost', 'localhost:3000'],
        typ: 'savetowallet',
        payload: {
            genericObjects: [{
                id: `${issuerId}.${cleanBarcodeNumber}`,
                classId: `${issuerId}.Climbing-Card`
            }]
        }
    };

    const token = jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' });
    return `https://pay.google.com/gp/v/save/${token}`;
}

app.post('/generate-pass', async (req, res) => {
    try {
        const { barcodeNumber } = req.body;
        console.log('Generating Google Wallet pass for:', barcodeNumber);
        
        const saveUrl = await generatePass(barcodeNumber);
        console.log('Generated save URL:', saveUrl);
        
        res.json({ saveUrl });
    } catch (error) {
        console.error('Full error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        
        // If it's a 409 error (pass already exists), we can still proceed
        if (error.code === 409) {
            try {
                const cleanBarcodeNumber = barcodeNumber.replace(/[^0-9]/g, '');
                console.log('Pass exists, generating token for:', cleanBarcodeNumber);
                
                const claims = {
                    iss: credentials.client_email,
                    aud: 'google',
                    origins: [process.env.VERCEL_URL || 'localhost:3000'], // Add Vercel URL
                    typ: 'savetowallet',
                    payload: {
                        genericObjects: [{
                            id: `${issuerId}.${cleanBarcodeNumber}`,
                            classId: `${issuerId}.Climbing-Card`
                        }]
                    }
                };

                const token = jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' });
                const saveUrl = `https://pay.google.com/gp/v/save/${token}`;
                console.log('Generated fallback URL:', saveUrl);
                
                return res.json({ saveUrl });
            } catch (jwtError) {
                console.error('JWT Error:', jwtError);
                res.status(500).json({ error: 'Failed to generate pass token' });
            }
        } else {
            res.status(500).json({ error: error.message || 'Failed to generate pass' });
        }
    }
});

app.delete('/delete-pass/:barcode', async (req, res) => {
    try {
        const cleanBarcodeNumber = req.params.barcode.replace(/[^0-9]/g, '');
        const objectId = `${issuerId}.${cleanBarcodeNumber}`;

        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
        });

        const client = await auth.getClient();

        try {
            await client.request({
                url: `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${objectId}`,
                method: 'DELETE'
            });
            res.json({ message: 'Pass deleted successfully' });
        } catch (deleteError) {
            // If pass doesn't exist, consider it a success
            if (deleteError.status === 404) {
                res.json({ message: 'Pass was already deleted or does not exist' });
            } else {
                throw deleteError;
            }
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete pass' });
    }
});

app.get('/get-pass/:barcode', async (req, res) => {
    try {
        const cleanBarcodeNumber = req.params.barcode.replace(/[^0-9]/g, '');
        
        const claims = {
            iss: credentials.client_email,
            aud: 'google',
            origins: ['localhost', 'localhost:3000'],
            typ: 'savetowallet',
            payload: {
                genericObjects: [{
                    id: `${issuerId}.${cleanBarcodeNumber}`,
                    classId: `${issuerId}.Climbing-Card`
                }]
            }
        };

        const token = jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' });
        res.json({ saveUrl: `https://pay.google.com/gp/v/save/${token}` });
    } catch (error) {
        console.error('Error getting pass:', error);
        res.status(500).json({ error: 'Failed to get pass link' });
    }
});

app.post('/generate-apple-pass', async (req, res) => {
    try {
        const { barcodeNumber } = req.body;
        
        console.log('Generating pass for barcode:', barcodeNumber); // Debug log
        
        const response = await fetch(`https://api.passslot.com/v1/templates/${PASSSLOT_TEMPLATE_ID}/pass`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(PASSSLOT_API_KEY + ':').toString('base64')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                memberNumber: barcodeNumber,
                barcode: formatEAN13(barcodeNumber),
                memberSince: new Date().toLocaleDateString('fr-FR')
            })
        });

        console.log('PassSlot response status:', response.status); // Debug log

        if (!response.ok) {
            const error = await response.json();
            console.error('PassSlot error response:', error); // Debug log
            throw new Error(error.message || 'Failed to generate pass');
        }

        const data = await response.json();
        console.log('PassSlot success response:', data); // Debug log
        res.json({ passUrl: data.url });

    } catch (error) {
        console.error('PassSlot Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate pass',
            details: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 