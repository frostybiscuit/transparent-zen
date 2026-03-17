import "dotenv/config";

export default {
	artifactsDir: "builds",
	ignoreFiles: [
		"node_modules/",
		"scripts/",
		"builds/",
		"src/",
		".github/",
		".git/",
		"assets/images/github",
		".gitignore",
		".env",
		"package.json",
		"package-lock.json",
		"README.md",
		"tsconfig.json",
		"vite.config.ts",
		"web-ext-config.mjs",
		"biome.json",
	],
	build: {
		overwriteDest: true,
	},
	sign: {
		apiKey: process.env.FIREFOX_API_KEY,
		apiSecret: process.env.FIREFOX_API_SECRET,
		channel: "listed",
		amoMetadata: "metadata.json",
	},
	run: {
		firefox: process.env.FIREFOX_EXE_PATH,
		firefoxProfile: process.env.FIREFOX_PROFILE_PATH,
		devtools: true,
	},
};
