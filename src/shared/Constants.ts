import type { ExtensionSettings } from "../types/ExtensionSettings";

export const DEFAULT_SETTINGS: ExtensionSettings["transparentZenSettings"] = {
	enableTransparency: false,
	textColor: "#FFFFFF",
	primaryColor: "#82C7FF",
	backgroundColor: "rgba(17, 17, 17, 0.5)",
	transparencyDepth: 2,
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
