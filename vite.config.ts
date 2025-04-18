import vue from "@vitejs/plugin-vue";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	root: "src/popup",
	base: "",
	build: {
		sourcemap: true,
		outDir: "dist",
		emptyOutDir: true,
		rollupOptions: {
			input: {
				popup: resolve(dirname("./"), "src/popup/popup.html"),
				background: resolve(dirname("./"), "src/worker/background.ts"),
				base: resolve(dirname("./"), "src/main/base.ts"),
				"transparent-zen": resolve(dirname("./"), "src/main/transparent-zen.ts"),
				"dynamic-transparency": resolve(dirname("./"), "src/main/dynamic-transparency.ts"),
			},
			output: {
				entryFileNames: "[name].js",
				chunkFileNames: "[name].js",
				assetFileNames: "[name].[ext]",
				dir: "dist",
			},
		},
	},
	server: {
		port: 3000,
		open: "http://localhost:3000/popup.html",
	},
	plugins: [vue()],
});
