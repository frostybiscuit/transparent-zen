import type { ExtensionSettings } from "./ExtensionSettings";

export type Message = {
	action:
		| "updateSettings"
		| "toggleTransparency"
		| "toggleLightweight"
		| "getDomain"
		| "changePrimaryColor"
		| "changeTextColor"
		| "changeBackgroundColor"
		| "changeBackgroundImage"
		| "changeBackgroundImageOpacity"
		| "changeBackgroundImageBlur"
		| "changeBackgroundImageBrightness"
		| "changeCustomStyles"
		| "toggleSiteSpecificSettings"
		| "insertStyles"
		| "removeStyles";
	data?: unknown;
	enabled?: boolean;
	value?: string | number | boolean | Blob;
	filePath?: string;
	domains?: Array<string>;
	settings?: ExtensionSettings["transparentZenSettings"];
};
