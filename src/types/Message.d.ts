import type { ExtensionSettings } from "./ExtensionSettings";

export type Message = {
	action:
		| "updateSettings"
		| "toggleTransparency"
		| "getDomain"
		| "changePrimaryColor"
		| "changeTextColor"
		| "changeBackgroundColor"
		| "changeBackgroundImage"
		| "changeBackgroundImageOpacity"
		| "changeBackgroundImageBlur"
		| "changeBackgroundImageBrightness"
		| "insertStyles"
		| "removeStyles"
		| "migrateOldSettings";
	data?: unknown;
	enabled?: boolean;
	value?: string | number | boolean | Blob;
	filePath?: string;
	domains?: Array<string>;
	settings?: ExtensionSettings["transparentZenSettings"];
};
