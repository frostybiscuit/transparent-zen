// MAJOR, MINOR, PATCH
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Manifest from "../manifest.json" with { type: "json" };

if (!process.argv[2]) {
	console.error("Please provide a version bump type. Possible arguments: major | minor | patch");
	process.exit(1);
}

const [MAJOR, MINOR, PATCH] = Manifest.version.split(".").map(Number);

switch (process.argv[2]) {
	case "major":
		Manifest.version = `${MAJOR + 1}.0.0`;
		break;
	case "minor":
		Manifest.version = `${MAJOR}.${MINOR + 1}.0`;
		break;
	case "patch":
		Manifest.version = `${MAJOR}.${MINOR}.${PATCH + 1}`;
		break;
}

writeFileSync(resolve("manifest.json"), JSON.stringify(Manifest, null, 2));
