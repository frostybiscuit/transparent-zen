import type { SupportedWebsite } from "./ContentScripts";

export type ExtensionSettings = {
	transparentZenSettings: {
		enableTransparency: boolean;
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

		//* Deprecated settings
		"enable-transparency"?: boolean;
		"text-color"?: string;
		"primary-color"?: string;
		"background-color"?: string;
		"transparency-depth"?: number | null;
		"blacklist-domain"?: boolean;
	};
};
