import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ContentScripts from "../data/ContentScripts.json" with { type: "json" };
import Manifest from "../manifest.json" with { type: "json" };

Manifest.content_scripts = [
	...ContentScripts.zenScripts,
	...ContentScripts.supportedWebsites.map((website) => ({
		matches: website.matches,
		css: website.css,
		run_at: website.run_at,
	})),
];

writeFileSync(resolve("manifest.json"), JSON.stringify(Manifest, null, 2));
