import type { SupportedWebsite } from "./ContentScripts";

export type ExtensionSettings = {
	transparentZenSettings: {
		"enable-transparency": boolean;
		"text-color": string;
		"primary-color": string;
		"background-color": string;
		"transparency-depth": number;
		disabledWebsites: Array<SupportedWebsite>;
		blacklistedDomains: Array<string>;
	};
};
