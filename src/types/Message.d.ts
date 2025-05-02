export type Message = {
	action: "updateSettings" | "toggleTransparency" | "getDomain" | "changePrimaryColor" | "changeTextColor" | "changeBackgroundColor" | "insertStyles" | "removeStyles";
	data?: unknown;
	enabled?: boolean;
	value?: string | number | boolean;
	filePath?: string;
	domains?: Array<string>;
};
