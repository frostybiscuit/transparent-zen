import "dotenv/config";

export default {
    artifactsDir: "builds",
    ignoreFiles: [
        "node_modules/",
        ".git/",
        ".gitignore",
        ".env"
    ],
    build: {
        overwriteDest: true
    },
    sign: {
        apiKey: process.env.FIREFOX_API_KEY,
        apiSecret: process.env.FIREFOX_API_SECRET,
        channel: "listed",
        amoMetadata: "metadata.json"
    }
};