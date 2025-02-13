module.exports = {
    privateKey: "./certs/key.pem",
    address: "grpc.pub1.passkit.io",
    port: 443,
    apiKey: process.env.PASSKIT_API_KEY,
    apiSecret: process.env.PASSKIT_API_SECRET
}; 