import type { SupportedWebsite } from "./ContentScripts";

export type ExtensionSettings = {
	transparentZenSettings: {
		enableTransparency: boolean;
		lightweightTransparency: boolean;
		enableWhitelist: boolean;
		textColor: string;
		primaryColor: string;
		backgroundColor: string;
		transparencyDepth: number | null;
		backgroundImage: File | Blob | null;
		backgroundImageBlur: number;
		backgroundImageOpacity: number;
		backgroundImageBrightness: number;
		disabledWebsites: Array<SupportedWebsite>;
		blacklistedDomains: Array<string>;
		siteSpecificSettings: Array<SiteSpecificSetting>;
	};
};

export type SiteSpecificSetting = {
	domain: string;
	enabled: boolean;
	backgroundSelectors: Array<string>;
	customStyles: string;
};
