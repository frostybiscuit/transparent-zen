import type { ExtensionSettings } from "../types/ExtensionSettings";

export const DEFAULT_SETTINGS: ExtensionSettings["transparentZenSettings"] = {
	"enable-transparency": false,
	"text-color": "#FFFFFF",
	"primary-color": "#82C7FF",
	"background-color": "rgba(17, 17, 17, 0.5)",
	"transparency-depth": 2,
	backgroundImage: null,
	backgroundImageBrightness: 100,
	backgroundImageOpacity: 50,
	backgroundImageBlur: 4,
	disabledWebsites: [],
	blacklistedDomains: [],
};

export const GITHUB_ENDPOINTS = {
	LATEST_RELEASE: "https://api.github.com/repos/frostybiscuit/transparent-zen/releases/latest",
};
